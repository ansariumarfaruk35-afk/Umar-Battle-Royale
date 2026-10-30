/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CharacterModel } from './CharacterModel';
import { CharacterCustomization, GamePhase, PlayerInventory, WeaponData, WeaponType } from '../core/GameTypes';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponConfig';
import { soundEngine } from '../audio/SoundEngine';
import { Terrain } from '../world/Terrain';
import { Structures } from '../world/Structures';
import { Vegetation } from '../world/Vegetation';

export class PlayerController {
  public model: CharacterModel;
  public position: THREE.Vector3 = new THREE.Vector3(0, 160, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3();

  // Rotation angles
  public yaw: number = 0;
  public pitch: number = 0;

  // Stance & Movement
  public isGrounded: boolean = false;
  public isCrouched: boolean = false;
  public isSprinting: boolean = false;
  public isADS: boolean = false;
  public currentFov: number = 70;
  public targetFov: number = 70;

  // Parachute mechanics
  public isFreefalling: boolean = false;
  public isParachuting: boolean = false;
  public parachuteAutoDeployAltitude: number = 22;

  // Health, Armor & Stats
  public health: number = 100;
  public maxHealth: number = 100;
  public kills: number = 0;
  public damageDealt: number = 0;
  public headshots: number = 0;
  public isDead: boolean = false;

  // Inventory
  public inventory: PlayerInventory;

  // Combat state
  public isFiring: boolean = false;
  public fireTimer: number = 0;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public recoilImpulse: number = 0;
  public spreadBloom: number = 0;

  // Audio timers
  private footstepTimer: number = 0;

  constructor(
    customization: CharacterCustomization,
    private terrain: Terrain,
    private structures: Structures,
    private vegetation: Vegetation
  ) {
    this.model = new CharacterModel(false, customization);

    // Initial loadout: Start with Desert Hawk pistol + some ammo
    this.inventory = {
      primary1: { weapon: WEAPON_DEFINITIONS.rifle, ammoInClip: 30 },
      primary2: null,
      pistol: { weapon: WEAPON_DEFINITIONS.pistol, ammoInClip: 12 },
      activeSlot: 'primary1',
      ammo: {
        '9mm': 60,
        '5.56mm': 0,
        '7.62mm': 90,
        '12gauge': 12,
        '300mag': 10,
      },
      armor: { level: 1, durability: 150, maxDurability: 150 },
      helmet: { level: 1, durability: 100, maxDurability: 100 },
      meds: {
        medkit: 1,
        bandage: 5,
        energyDrink: 2,
      },
      grenades: 2,
    };

    this.updateActiveWeaponModel();
  }

  public getActiveWeapon(): { weapon: WeaponData; ammoInClip: number } | null {
    return this.inventory[this.inventory.activeSlot];
  }

  public updateActiveWeaponModel() {
    const active = this.getActiveWeapon();
    this.model.setWeaponModel(active ? active.weapon.id : null);
  }

  public switchWeapon(slot: 'primary1' | 'primary2' | 'pistol') {
    if (this.inventory.activeSlot === slot) return;
    this.inventory.activeSlot = slot;
    this.isReloading = false;
    this.updateActiveWeaponModel();
    soundEngine.playPickup();
  }

  public startPlaneDrop(startPos: THREE.Vector3) {
    this.position.copy(startPos);
    this.isFreefalling = true;
    this.isParachuting = false;
    this.velocity.set(0, -28, 0);
    soundEngine.playJump();
  }

  public deployParachute() {
    if (this.isFreefalling && !this.isParachuting) {
      this.isFreefalling = false;
      this.isParachuting = true;
      this.velocity.y = -6; // gentle descent
      soundEngine.playParachuteDeploy();
    }
  }

  public update(dt: number, time: number, moveInput: { x: number; y: number }, gamePhase: GamePhase) {
    if (this.isDead) {
      this.model.updateAnimation('dead', time, 0, 0);
      return;
    }

    // Parachute / Freefall drops
    if (gamePhase === 'DIVING' || this.isFreefalling) {
      this.updateFreefall(dt, moveInput);
      this.model.updateAnimation('freefall', time, this.pitch);
      this.model.group.position.copy(this.position);
      this.model.group.rotation.y = this.yaw;
      return;
    }

    if (gamePhase === 'PARACHUTING' || this.isParachuting) {
      this.updateParachuting(dt, moveInput);
      this.model.updateAnimation('parachute', time, this.pitch);
      this.model.group.position.copy(this.position);
      this.model.group.rotation.y = this.yaw;
      return;
    }

    // Ground & Normal Movement
    this.updateGroundMovement(dt, moveInput, time);

    // Weapon mechanics
    this.updateCombat(dt);

    // Visuals & Animations
    let animState: 'idle' | 'run' | 'crouch' | 'jump' = 'idle';
    if (!this.isGrounded) {
      animState = 'jump';
    } else if (this.isCrouched) {
      animState = 'crouch';
    } else if (Math.hypot(this.velocity.x, this.velocity.z) > 1.2) {
      animState = 'run';
    }

    this.model.updateAnimation(animState, time, this.pitch, this.recoilImpulse);
    this.model.group.position.copy(this.position);
    this.model.group.rotation.y = this.yaw;

    // Smooth ADS FOV lerp
    this.currentFov = THREE.MathUtils.lerp(this.currentFov, this.targetFov, dt * 14);
  }

  private updateFreefall(dt: number, moveInput: { x: number; y: number }) {
    // Steer forward/backward/strafing
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const steer = new THREE.Vector3()
      .addScaledVector(forward, -moveInput.y * 32)
      .addScaledVector(right, moveInput.x * 24);

    this.velocity.x = steer.x;
    this.velocity.z = steer.z;
    this.velocity.y = -36; // terminal freefall velocity

    this.position.addScaledVector(this.velocity, dt);

    const terrainH = this.terrain.getHeight(this.position.x, this.position.z);
    // Auto deploy parachute if close to ground
    if (this.position.y - terrainH <= this.parachuteAutoDeployAltitude) {
      this.deployParachute();
    }
  }

  private updateParachuting(dt: number, moveInput: { x: number; y: number }) {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    // Glides forward by default, steering adjusts path
    const glideSpeed = 16.0;
    const steer = new THREE.Vector3()
      .addScaledVector(forward, glideSpeed - moveInput.y * 8)
      .addScaledVector(right, moveInput.x * 12);

    this.velocity.x = steer.x;
    this.velocity.z = steer.z;
    this.velocity.y = -7.5; // smooth gliding descent

    this.position.addScaledVector(this.velocity, dt);

    const terrainH = this.terrain.getHeight(this.position.x, this.position.z);
    if (this.position.y <= terrainH + 0.1) {
      // Landed!
      this.position.y = terrainH;
      this.isParachuting = false;
      this.velocity.set(0, 0, 0);
      soundEngine.playLand();
    }
  }

  private updateGroundMovement(dt: number, moveInput: { x: number; y: number }, time: number) {
    const terrainH = this.terrain.getHeight(this.position.x, this.position.z);

    // Gravity
    if (!this.isGrounded) {
      this.velocity.y -= 26 * dt; // gravity
    }

    // Determine target speed
    let speed = 7.5;
    if (this.isCrouched) speed = 3.8;
    else if (this.isADS) speed = 4.2;
    else if (this.isSprinting && moveInput.y < -0.2) speed = 11.2;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, -moveInput.y)
      .addScaledVector(right, moveInput.x);

    if (moveDir.lengthSq() > 0.01) {
      moveDir.normalize();
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, moveDir.x * speed, 14, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, moveDir.z * speed, 14, dt);

      // Footstep sound cycle
      if (this.isGrounded) {
        this.footstepTimer += dt * (speed / 7.5);
        if (this.footstepTimer > 0.38) {
          soundEngine.playFootstep();
          this.footstepTimer = 0;
        }
      }
    } else {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, 16, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, 16, dt);
    }

    // Tentative next position
    const nextPos = this.position.clone().addScaledVector(this.velocity, dt);

    // Collision with structures & obstacles
    if (!this.structures.checkCollision(nextPos, 0.45) && !this.vegetation.checkObstacleCollision(nextPos, 0.45)) {
      this.position.x = nextPos.x;
      this.position.z = nextPos.z;
    } else {
      // Slide against walls
      const tryX = this.position.clone();
      tryX.x = nextPos.x;
      if (!this.structures.checkCollision(tryX, 0.45) && !this.vegetation.checkObstacleCollision(tryX, 0.45)) {
        this.position.x = nextPos.x;
      }
      const tryZ = this.position.clone();
      tryZ.z = nextPos.z;
      if (!this.structures.checkCollision(tryZ, 0.45) && !this.vegetation.checkObstacleCollision(tryZ, 0.45)) {
        this.position.z = nextPos.z;
      }
    }

    this.position.y += this.velocity.y * dt;

    // Ground check against terrain
    const currentTerrainH = this.terrain.getHeight(this.position.x, this.position.z);
    if (this.position.y <= currentTerrainH) {
      if (!this.isGrounded && this.velocity.y < -5) {
        soundEngine.playLand();
      }
      this.position.y = currentTerrainH;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  public jump() {
    if (this.isGrounded && !this.isDead) {
      this.velocity.y = 8.8;
      this.isGrounded = false;
      soundEngine.playJump();
    }
  }

  public toggleCrouch() {
    this.isCrouched = !this.isCrouched;
  }

  public toggleADS(enabled?: boolean) {
    this.isADS = enabled !== undefined ? enabled : !this.isADS;
    const active = this.getActiveWeapon();
    const zoomRatio = active ? active.weapon.adsZoom : 0.8;
    this.targetFov = this.isADS ? 70 * zoomRatio : 70;
  }

  public reload() {
    const active = this.getActiveWeapon();
    if (!active || this.isReloading) return;
    const def = active.weapon;
    const ammoAvailable = this.inventory.ammo[def.ammoType];

    if (active.ammoInClip >= def.magazineSize || ammoAvailable <= 0) return;

    this.isReloading = true;
    this.reloadTimer = def.reloadTime;
    soundEngine.playReload();
  }

  private updateCombat(dt: number) {
    if (this.fireTimer > 0) this.fireTimer -= dt;
    if (this.recoilImpulse > 0) this.recoilImpulse = THREE.MathUtils.damp(this.recoilImpulse, 0, 12, dt);
    if (this.spreadBloom > 0) this.spreadBloom = THREE.MathUtils.damp(this.spreadBloom, 0, 8, dt);

    // Reload timer
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const active = this.getActiveWeapon();
        if (active) {
          const needed = active.weapon.magazineSize - active.ammoInClip;
          const available = this.inventory.ammo[active.weapon.ammoType];
          const load = Math.min(needed, available);
          active.ammoInClip += load;
          this.inventory.ammo[active.weapon.ammoType] -= load;
        }
      }
    }
  }

  // Attempt to fire weapon. Returns projectile params if shot succeeded
  public shoot(): { canShoot: boolean; weapon?: WeaponData } {
    if (this.isDead || this.isReloading || this.isFreefalling || this.isParachuting) {
      return { canShoot: false };
    }

    const active = this.getActiveWeapon();
    if (!active) return { canShoot: false };

    if (active.ammoInClip <= 0) {
      this.reload();
      return { canShoot: false };
    }

    if (this.fireTimer > 0) return { canShoot: false };

    // Fire!
    active.ammoInClip--;
    this.fireTimer = 1.0 / active.weapon.fireRate;
    this.recoilImpulse = active.weapon.recoil;
    this.pitch += active.weapon.recoil * 0.45; // Camera kick!
    this.spreadBloom += active.weapon.spread;

    soundEngine.playGunshot(active.weapon.id, true);

    return { canShoot: true, weapon: active.weapon };
  }

  public takeDamage(amount: number, isHeadshot: boolean): boolean {
    if (this.isDead) return false;

    let finalDamage = amount;

    // Apply helmet reduction
    if (isHeadshot && this.inventory.helmet && this.inventory.helmet.durability > 0) {
      const redPercent = this.inventory.helmet.level === 3 ? 0.55 : this.inventory.helmet.level === 2 ? 0.4 : 0.3;
      finalDamage *= (1 - redPercent);
      this.inventory.helmet.durability = Math.max(0, this.inventory.helmet.durability - amount * 0.5);
    } else if (!isHeadshot && this.inventory.armor && this.inventory.armor.durability > 0) {
      const redPercent = this.inventory.armor.level === 3 ? 0.55 : this.inventory.armor.level === 2 ? 0.4 : 0.3;
      const absorbed = finalDamage * redPercent;
      this.inventory.armor.durability = Math.max(0, this.inventory.armor.durability - absorbed);
      finalDamage -= absorbed;
    }

    this.health = Math.max(0, this.health - finalDamage);

    if (this.health <= 0) {
      this.isDead = true;
      return true; // died
    }
    return false;
  }

  public useMed(type: 'medkit' | 'bandage' | 'energyDrink'): boolean {
    if (this.health >= this.maxHealth && type !== 'energyDrink') return false;
    if (this.inventory.meds[type] <= 0) return false;

    this.inventory.meds[type]--;
    if (type === 'medkit') {
      this.health = this.maxHealth;
    } else if (type === 'bandage') {
      this.health = Math.min(75, this.health + 15);
    } else if (type === 'energyDrink') {
      this.health = Math.min(this.maxHealth, this.health + 25);
    }

    soundEngine.playHeal();
    return true;
  }
}
