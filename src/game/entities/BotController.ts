/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CharacterModel } from './CharacterModel';
import { CharacterCustomization, WeaponData, WeaponType } from '../core/GameTypes';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponConfig';
import { soundEngine } from '../audio/SoundEngine';
import { Terrain } from '../world/Terrain';
import { Structures } from '../world/Structures';
import { Vegetation } from '../world/Vegetation';
import { StormZone } from '../world/StormZone';

export type BotState = 'DROPPING' | 'LOOTING' | 'ROAMING' | 'COMBAT' | 'COVER' | 'DEAD';

const BOT_NAMES = [
  'Ghost', 'Viper', 'Shadow_99', 'Falcon', 'Reaper', 'CyberStrike', 'Titan_Apex', 'Hunter',
  'Deadshot', 'StormRider', 'Alpha_Wolf', 'Blaze', 'Venom', 'IronClad', 'Spectre', 'Havoc',
  'Nomad', 'Vortex', 'Phantom', 'BulletProof', 'SniperGod', 'Maverick', 'Striker', 'Rogue_One',
  'ApexPredator', 'Cobra', 'ZeroCool', 'NinjaWarrior', 'Frostbite', 'Overdrive'
];

export class BotController {
  public id: string;
  public name: string;
  public model: CharacterModel;
  public position: THREE.Vector3 = new THREE.Vector3();
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public yaw: number = 0;
  public pitch: number = 0;

  public state: BotState = 'DROPPING';
  public health: number = 100;
  public maxHealth: number = 100;
  public isDead: boolean = false;
  public kills: number = 0;

  public weapon: WeaponData;
  public ammoInClip: number = 30;

  // AI navigation & behavior
  public targetDestination: THREE.Vector3 = new THREE.Vector3();
  public targetEntity: { position: THREE.Vector3; isPlayer: boolean; id: string; name: string } | null = null;
  public stateTimer: number = 0;
  public fireTimer: number = 0;
  public reactionTimer: number = 0;
  public burstCount: number = 0;
  public isStrafingLeft: boolean = false;

  // Difficulty modifiers
  private accuracyMultiplier: number = 0.55;
  private reactionDelay: number = 0.45;

  constructor(
    index: number,
    dropStartPos: THREE.Vector3,
    targetLandPos: THREE.Vector3,
    difficulty: 'easy' | 'medium' | 'hard',
    private terrain: Terrain,
    private structures: Structures,
    private vegetation: Vegetation,
    private stormZone: StormZone
  ) {
    this.id = `bot_${index}`;
    this.name = BOT_NAMES[index % BOT_NAMES.length];

    const outfits: ('camo' | 'cyber' | 'desert' | 'arctic' | 'neon')[] = ['camo', 'cyber', 'desert', 'arctic', 'neon'];
    const skinTones: ('light' | 'tan' | 'dark' | 'bronze')[] = ['light', 'tan', 'dark', 'bronze'];

    const customization: CharacterCustomization = {
      name: this.name,
      outfit: outfits[index % outfits.length],
      skinTone: skinTones[index % skinTones.length],
      hairColor: '#000000',
    };

    this.model = new CharacterModel(true, customization);
    this.position.copy(dropStartPos);
    this.targetDestination.copy(targetLandPos);

    // Initial bot weapon
    const weaponPool: WeaponType[] = ['smg', 'rifle', 'shotgun', 'pistol', 'sniper'];
    const chosenType = weaponPool[index % weaponPool.length];
    this.weapon = WEAPON_DEFINITIONS[chosenType];
    this.ammoInClip = this.weapon.magazineSize;
    this.model.setWeaponModel(chosenType);

    // Set difficulty params
    if (difficulty === 'easy') {
      this.accuracyMultiplier = 0.35;
      this.reactionDelay = 0.7;
    } else if (difficulty === 'medium') {
      this.accuracyMultiplier = 0.6;
      this.reactionDelay = 0.4;
    } else {
      this.accuracyMultiplier = 0.85;
      this.reactionDelay = 0.2;
    }
  }

  public update(
    dt: number,
    time: number,
    playerPosition: THREE.Vector3,
    otherBots: BotController[],
    onBotFire: (bot: BotController, targetPos: THREE.Vector3) => void
  ) {
    if (this.isDead) {
      this.model.updateAnimation('dead', time, 0, 0);
      return;
    }

    this.stateTimer += dt;
    if (this.fireTimer > 0) this.fireTimer -= dt;

    // Storm damage to bots
    if (!this.stormZone.isInsideSafeZone(this.position)) {
      this.health -= this.stormZone.getCurrentDps() * dt;
      if (this.health <= 0) {
        this.isDead = true;
        return;
      }
    }

    switch (this.state) {
      case 'DROPPING':
        this.updateDropping(dt, time);
        break;

      case 'ROAMING':
      case 'LOOTING':
        this.updateRoaming(dt, time, playerPosition, otherBots);
        break;

      case 'COMBAT':
        this.updateCombat(dt, time, onBotFire, playerPosition, otherBots);
        break;

      case 'COVER':
        this.updateCover(dt, time);
        break;
    }

    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.yaw;
  }

  private updateDropping(dt: number, time: number) {
    // Parachuting down
    const toTarget = new THREE.Vector2(this.targetDestination.x - this.position.x, this.targetDestination.z - this.position.z);
    this.yaw = Math.atan2(-toTarget.x, -toTarget.y);

    const speed = 14.0;
    if (toTarget.length() > 2) {
      toTarget.normalize();
      this.velocity.x = toTarget.x * speed;
      this.velocity.z = toTarget.y * speed;
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    this.velocity.y = -8.5; // descent
    this.position.addScaledVector(this.velocity, dt);

    const groundH = this.terrain.getHeight(this.position.x, this.position.z);
    if (this.position.y <= groundH + 0.1) {
      this.position.y = groundH;
      this.state = 'ROAMING';
      this.pickNewRoamDestination();
    }

    this.model.updateAnimation('parachute', time, 0);
  }

  private pickNewRoamDestination() {
    // If outside storm safe zone, prioritize safe zone center
    if (!this.stormZone.isInsideSafeZone(this.position)) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * this.stormZone.currentRadius * 0.7;
      this.targetDestination.set(
        this.stormZone.currentCenter.x + Math.cos(angle) * r,
        0,
        this.stormZone.currentCenter.y + Math.sin(angle) * r
      );
    } else {
      // Pick random spot around current position
      const angle = Math.random() * Math.PI * 2;
      const r = 25 + Math.random() * 45;
      this.targetDestination.set(this.position.x + Math.cos(angle) * r, 0, this.position.z + Math.sin(angle) * r);
    }
  }

  private updateRoaming(
    dt: number,
    time: number,
    playerPosition: THREE.Vector3,
    otherBots: BotController[]
  ) {
    // Scan for targets: player
    const distToPlayer = this.position.distanceTo(playerPosition);
    if (distToPlayer < 65) {
      // Check line of sight (approximate)
      this.targetEntity = {
        position: playerPosition,
        isPlayer: true,
        id: 'player',
        name: 'Player',
      };
      this.state = 'COMBAT';
      this.reactionTimer = this.reactionDelay;
      return;
    }

    // Scan for nearby bots to fight
    for (const bot of otherBots) {
      if (bot.id !== this.id && !bot.isDead && bot.state !== 'DROPPING') {
        const dist = this.position.distanceTo(bot.position);
        if (dist < 45 && Math.random() < 0.3) {
          this.targetEntity = {
            position: bot.position,
            isPlayer: false,
            id: bot.id,
            name: bot.name,
          };
          this.state = 'COMBAT';
          this.reactionTimer = this.reactionDelay;
          return;
        }
      }
    }

    // Move towards roam destination
    const toDest = new THREE.Vector2(this.targetDestination.x - this.position.x, this.targetDestination.z - this.position.z);
    if (toDest.length() < 3 || this.stateTimer > 18) {
      this.stateTimer = 0;
      this.pickNewRoamDestination();
    }

    toDest.normalize();
    const speed = 6.2;
    this.yaw = Math.atan2(-toDest.x, -toDest.y);

    const nextPos = this.position.clone();
    nextPos.x += toDest.x * speed * dt;
    nextPos.z += toDest.y * speed * dt;

    if (!this.structures.checkCollision(nextPos, 0.45) && !this.vegetation.checkObstacleCollision(nextPos, 0.45)) {
      this.position.copy(nextPos);
    } else {
      this.pickNewRoamDestination();
    }

    this.position.y = this.terrain.getHeight(this.position.x, this.position.z);
    this.model.updateAnimation('run', time, 0);
  }

  private updateCombat(
    dt: number,
    time: number,
    onBotFire: (bot: BotController, targetPos: THREE.Vector3) => void,
    playerPosition: THREE.Vector3,
    otherBots: BotController[]
  ) {
    if (!this.targetEntity) {
      this.state = 'ROAMING';
      return;
    }

    // Update target reference position
    if (this.targetEntity.isPlayer) {
      this.targetEntity.position = playerPosition;
    } else {
      const botTarget = otherBots.find(b => b.id === this.targetEntity!.id);
      if (!botTarget || botTarget.isDead) {
        this.targetEntity = null;
        this.state = 'ROAMING';
        return;
      }
      this.targetEntity.position = botTarget.position;
    }

    const dist = this.position.distanceTo(this.targetEntity.position);
    if (dist > 85) {
      // Lost target
      this.targetEntity = null;
      this.state = 'ROAMING';
      return;
    }

    // Aim at target with reaction latency
    const dx = this.targetEntity.position.x - this.position.x;
    const dz = this.targetEntity.position.z - this.position.z;
    const dy = (this.targetEntity.position.y + 1.2) - (this.position.y + 1.2);

    const targetYaw = Math.atan2(-dx, -dz);
    this.yaw = THREE.MathUtils.damp(this.yaw, targetYaw, 12, dt);
    this.pitch = Math.atan2(dy, Math.hypot(dx, dz));

    // Combat strafe movement
    if (Math.random() < 0.02) {
      this.isStrafingLeft = !this.isStrafingLeft;
    }

    const strafeSpeed = 4.2;
    const strafeDir = this.isStrafingLeft ? 1 : -1;
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const nextPos = this.position.clone().addScaledVector(right, strafeDir * strafeSpeed * dt);
    if (!this.structures.checkCollision(nextPos, 0.45) && !this.vegetation.checkObstacleCollision(nextPos, 0.45)) {
      this.position.copy(nextPos);
    }
    this.position.y = this.terrain.getHeight(this.position.x, this.position.z);

    // Fire weapon bursts
    if (this.reactionTimer > 0) {
      this.reactionTimer -= dt;
    } else if (this.fireTimer <= 0) {
      this.fireTimer = 1.0 / this.weapon.fireRate;
      this.ammoInClip--;

      // Calculate shot accuracy spread
      const spreadFactor = (1.0 - this.accuracyMultiplier) * 2.2;
      const shotTarget = this.targetEntity.position.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * spreadFactor,
          1.2 + (Math.random() - 0.5) * (spreadFactor * 0.5),
          (Math.random() - 0.5) * spreadFactor
        )
      );

      // Play positional gunshot
      soundEngine.playGunshot(this.weapon.id, false, dist);

      onBotFire(this, shotTarget);

      // Reload simulation
      if (this.ammoInClip <= 0) {
        this.ammoInClip = this.weapon.magazineSize;
        this.fireTimer = this.weapon.reloadTime;
      }
    }

    this.model.updateAnimation('run', time, this.pitch);
  }

  private updateCover(dt: number, time: number) {
    this.stateTimer += dt;
    if (this.stateTimer > 4) {
      this.state = 'COMBAT';
    }
    this.model.updateAnimation('crouch', time, 0);
  }

  public takeDamage(amount: number, isHeadshot: boolean): boolean {
    if (this.isDead) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.isDead = true;
      this.state = 'DEAD';
      return true; // died
    }
    return false;
  }
}
