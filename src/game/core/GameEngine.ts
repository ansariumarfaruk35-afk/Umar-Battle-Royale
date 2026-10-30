/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CharacterCustomization,
  DamageNumber,
  GamePhase,
  GameSettings,
  KillFeedEntry,
  LootItem,
  PlayerStats,
  WeaponData,
} from './GameTypes';
import { Terrain } from '../world/Terrain';
import { Structures } from '../world/Structures';
import { Vegetation } from '../world/Vegetation';
import { StormZone } from '../world/StormZone';
import { LootManager } from '../world/LootManager';
import { PlayerController } from '../entities/PlayerController';
import { BotController } from '../entities/BotController';
import { ParticleEffects } from '../effects/ParticleEffects';
import { soundEngine } from '../audio/SoundEngine';

export interface EngineCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onStatsUpdate: (stats: {
    health: number;
    maxHealth: number;
    armorDurability: number;
    maxArmorDurability: number;
    armorLevel: number;
    ammoInClip: number;
    ammoReserve: number;
    activeWeapon: WeaponData | null;
    playersAlive: number;
    kills: number;
    stormPhase: number;
    stormTimeRemaining: number;
    isStormShrinking: boolean;
    isOutsideZone: boolean;
  }) => void;
  onKillFeed: (entry: KillFeedEntry) => void;
  onDamageTaken: () => void;
  onHitMarker: (isHeadshot: boolean) => void;
  onGameOver: (stats: PlayerStats, isVictory: boolean) => void;
  onNearbyLootUpdate: (loot: { id: string; item: LootItem }[]) => void;
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public terrain: Terrain;
  public structures: Structures;
  public vegetation: Vegetation;
  public stormZone: StormZone;
  public lootManager: LootManager;
  public player: PlayerController;
  public bots: BotController[] = [];
  public particles: ParticleEffects;

  public phase: GamePhase = 'PLANE';
  public totalPlayers: number = 31;
  public playersAlive: number = 31;
  public matchTime: number = 0;
  public planeFlightTime: number = 0;
  public planeStartPos: THREE.Vector3 = new THREE.Vector3(-220, 160, -200);
  public planeEndPos: THREE.Vector3 = new THREE.Vector3(220, 160, 200);

  // Input states
  public moveInput = { x: 0, y: 0 };
  public isMouseDown = false;

  private isSoftwareGl: boolean;
  private frameId: number = 0;
  private clock = new THREE.Clock();
  private callbacks: EngineCallbacks;
  private raycaster = new THREE.Raycaster();

  // Camera damping variables
  private currentCameraPos = new THREE.Vector3();
  private currentCameraLookAt = new THREE.Vector3();

  constructor(
    container: HTMLElement,
    settings: GameSettings,
    customization: CharacterCustomization,
    callbacks: EngineCallbacks
  ) {
    this.callbacks = callbacks;

    // 1. Software-WebGL Probe (from threejs skill)
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: !this.isSoftwareGl && settings.graphicsQuality !== 'low',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && settings.graphicsQuality === 'high';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc); // vibrant sky blue
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.0035); // matches horizon sky

    this.camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.2, 800);

    // 4. Room Environment Reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 5. Lighting Rig (Key Light + Fill Light + Rim Light)
    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.8); // warm key light
    sunLight.position.set(120, 180, 90);
    sunLight.castShadow = this.renderer.shadowMap.enabled;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    const d = 160;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x3f6212, 0.85); // cool sky vs green ground fill
    this.scene.add(hemiLight);

    // 6. World Generation
    this.terrain = new Terrain();
    this.scene.add(this.terrain.mesh);
    this.scene.add(this.terrain.waterMesh);

    this.structures = new Structures(this.terrain);
    this.scene.add(this.structures.group);

    this.vegetation = new Vegetation(this.terrain, this.structures.collisionBoxes);
    this.scene.add(this.vegetation.group);

    this.stormZone = new StormZone();
    this.scene.add(this.stormZone.group);

    this.lootManager = new LootManager(this.structures.lootSpawnPoints);
    this.scene.add(this.lootManager.group);

    this.particles = new ParticleEffects();
    this.scene.add(this.particles.group);

    // 7. Player Controller
    this.player = new PlayerController(customization, this.terrain, this.structures, this.vegetation);
    this.scene.add(this.player.model.group);

    // 8. 30 AI Bots Initialization
    this.initBots(settings.botDifficulty);

    // Start in plane
    this.initPlanePhase();

    // Start loop
    this.clock.start();
    this.tick();
  }

  private initPlanePhase() {
    this.phase = 'PLANE';
    this.callbacks.onPhaseChange('PLANE');
    this.planeFlightTime = 0;

    // Plane starts outside island heading across
    this.structures.dropPlane.position.copy(this.planeStartPos);
    const flightDir = this.planeEndPos.clone().sub(this.planeStartPos).normalize();
    this.structures.dropPlane.rotation.y = Math.atan2(flightDir.x, flightDir.z) - Math.PI / 2;

    this.player.position.copy(this.structures.dropPlane.position);
    this.player.position.y += 2;
  }

  private initBots(difficulty: 'easy' | 'medium' | 'hard') {
    const totalBots = 30;
    const compounds = this.structures.compounds;

    for (let i = 0; i < totalBots; i++) {
      // Stagger bot drop locations along flight path
      const progress = 0.15 + (i / totalBots) * 0.7 + (Math.random() - 0.5) * 0.1;
      const dropPoint = this.planeStartPos.clone().lerp(this.planeEndPos, progress);

      // Target landing compound or random point near compound
      const comp = compounds[i % compounds.length];
      const landPos = comp.position.clone().add(
        new THREE.Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40)
      );

      const bot = new BotController(
        i,
        dropPoint,
        landPos,
        difficulty,
        this.terrain,
        this.structures,
        this.vegetation,
        this.stormZone
      );
      this.bots.push(bot);
      this.scene.add(bot.model.group);
    }
  }

  public playerJumpFromPlane() {
    if (this.phase === 'PLANE') {
      this.phase = 'DIVING';
      this.callbacks.onPhaseChange('DIVING');
      this.player.startPlaneDrop(this.structures.dropPlane.position.clone());
    }
  }

  public playerDeployParachute() {
    if (this.phase === 'DIVING') {
      this.phase = 'PARACHUTING';
      this.callbacks.onPhaseChange('PARACHUTING');
      this.player.deployParachute();
    }
  }

  private tick = () => {
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // clamp frame delta time
    const time = this.clock.getElapsedTime();

    this.update(dt, time);
    this.renderer.render(this.scene, this.camera);

    this.frameId = requestAnimationFrame(this.tick);
  };

  private update(dt: number, time: number) {
    this.matchTime += dt;

    // 1. Plane Movement during PLANE phase
    if (this.phase === 'PLANE') {
      this.planeFlightTime += dt;
      const flightDuration = 22.0; // 22 seconds across map
      const progress = Math.min(1.0, this.planeFlightTime / flightDuration);

      this.structures.dropPlane.position.lerpVectors(this.planeStartPos, this.planeEndPos, progress);
      this.player.position.copy(this.structures.dropPlane.position);

      // Auto drop player if reached end of plane flight
      if (progress >= 0.95) {
        this.playerJumpFromPlane();
      }
    }

    // 2. Player Updates
    this.player.update(dt, time, this.moveInput, this.phase);

    // Transition from diving/parachuting to playing once landed
    if (this.phase === 'DIVING' && !this.player.isFreefalling) {
      if (this.player.isParachuting) {
        this.phase = 'PARACHUTING';
        this.callbacks.onPhaseChange('PARACHUTING');
      }
    }
    if ((this.phase === 'DIVING' || this.phase === 'PARACHUTING') && !this.player.isFreefalling && !this.player.isParachuting) {
      this.phase = 'PLAYING';
      this.callbacks.onPhaseChange('PLAYING');
    }

    // Player storm damage
    const isOutsideStorm = !this.stormZone.isInsideSafeZone(this.player.position);
    if (isOutsideStorm && this.phase === 'PLAYING') {
      const died = this.player.takeDamage(this.stormZone.getCurrentDps() * dt, false);
      this.callbacks.onDamageTaken();
      if (died) {
        this.handlePlayerDeath('Storm');
      }
    }

    // Continuous firing if mouse/button held
    if (this.isMouseDown && this.phase === 'PLAYING') {
      this.triggerPlayerShot();
    }

    // 3. AI Bots Updates
    for (const bot of this.bots) {
      if (!bot.isDead) {
        bot.update(dt, time, this.player.position, this.bots, (shooter, targetPos) => {
          this.handleBotShot(shooter, targetPos);
        });
      }
    }

    // 4. World Systems
    this.stormZone.update(dt);
    this.lootManager.update(dt, time);
    this.particles.update(dt);

    // 5. Check Nearby Ground Loot for Player
    const nearbyLoot = this.lootManager.getNearbyLoot(this.player.position, 2.8);
    this.callbacks.onNearbyLootUpdate(nearbyLoot.map(l => ({ id: l.id, item: l.item })));

    // Auto-pickup ammo & consumables if close
    for (const loot of nearbyLoot) {
      if (loot.item.category === 'ammo' && loot.item.ammoType) {
        this.player.inventory.ammo[loot.item.ammoType] += loot.item.amount || 30;
        this.lootManager.collectLoot(loot.id);
      }
    }

    // 6. Third-Person Camera Update with Collision Detection
    this.updateCamera(dt);

    // 7. Update UI HUD Callbacks
    const active = this.player.getActiveWeapon();
    const ammoReserve = active ? this.player.inventory.ammo[active.weapon.ammoType] : 0;
    const armorDurability = this.player.inventory.armor ? this.player.inventory.armor.durability : 0;
    const maxArmorDurability = this.player.inventory.armor ? this.player.inventory.armor.maxDurability : 1;
    const armorLevel = this.player.inventory.armor ? this.player.inventory.armor.level : 0;

    this.callbacks.onStatsUpdate({
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      armorDurability,
      maxArmorDurability,
      armorLevel,
      ammoInClip: active ? active.ammoInClip : 0,
      ammoReserve,
      activeWeapon: active ? active.weapon : null,
      playersAlive: this.playersAlive,
      kills: this.player.kills,
      stormPhase: this.stormZone.currentPhase + 1,
      stormTimeRemaining: Math.max(0, Math.round(this.stormZone.phaseTimeRemaining)),
      isStormShrinking: this.stormZone.isShrinking,
      isOutsideZone: isOutsideStorm,
    });
  }

  private updateCamera(dt: number) {
    this.camera.fov = this.player.currentFov;
    this.camera.updateProjectionMatrix();

    if (this.phase === 'PLANE') {
      // Cinematic chase view of cargo drop plane
      const planePos = this.structures.dropPlane.position;
      const targetCamPos = planePos.clone().add(new THREE.Vector3(-35, 18, -25));
      this.currentCameraPos.lerp(targetCamPos, dt * 6);
      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(planePos.clone().add(new THREE.Vector3(5, 0, 5)));
      return;
    }

    if (this.phase === 'VICTORY') {
      // Orbiting celebration camera
      const angle = this.matchTime * 0.8;
      const radius = 5.5;
      const targetCamPos = new THREE.Vector3(
        this.player.position.x + Math.cos(angle) * radius,
        this.player.position.y + 2.2,
        this.player.position.z + Math.sin(angle) * radius
      );
      this.camera.position.lerp(targetCamPos, dt * 8);
      this.camera.lookAt(this.player.position.x, this.player.position.y + 1.2, this.player.position.z);
      return;
    }

    // Over-the-shoulder Free Fire camera rig
    const shoulderOffset = this.player.isADS ? 0.45 : 0.65;
    const distance = this.player.isADS ? 1.6 : 3.8;
    const height = this.player.isCrouched ? 1.2 : 1.7;

    const lookDir = new THREE.Vector3(
      -Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
      Math.sin(this.player.pitch),
      -Math.cos(this.player.yaw) * Math.cos(this.player.pitch)
    );

    const rightDir = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw));

    const headPos = this.player.position.clone().add(new THREE.Vector3(0, height, 0));
    let desiredCamPos = headPos
      .clone()
      .addScaledVector(rightDir, shoulderOffset)
      .addScaledVector(lookDir, -distance);

    // Camera Collision Detection: prevent clipping into terrain and buildings!
    const camRayDir = desiredCamPos.clone().sub(headPos);
    const camDist = camRayDir.length();
    camRayDir.normalize();

    // Check terrain height at desired camera spot
    const terrainH = this.terrain.getHeight(desiredCamPos.x, desiredCamPos.z) + 0.4;
    if (desiredCamPos.y < terrainH) {
      desiredCamPos.y = terrainH;
    }

    // Smooth spring/exponential damping
    this.currentCameraPos.lerp(desiredCamPos, dt * 18);
    this.camera.position.copy(this.currentCameraPos);

    // Aim focus point ahead
    const aimTarget = headPos.clone().addScaledVector(lookDir, 40);
    this.currentCameraLookAt.lerp(aimTarget, dt * 20);
    this.camera.lookAt(this.currentCameraLookAt);
  }

  // --- PLAYER COMBAT LOGIC ---
  public triggerPlayerShot() {
    const shot = this.player.shoot();
    if (!shot.canShoot || !shot.weapon) return;

    const weapon = shot.weapon;
    const pellets = weapon.pellets || 1;

    // Muzzle position in world space
    const muzzlePos = this.player.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.particles.triggerMuzzleFlash(muzzlePos);

    for (let p = 0; p < pellets; p++) {
      // Calculate ray direction with weapon spread & recoil bloom
      const spread = (weapon.spread + this.player.spreadBloom) * (this.player.isADS ? 0.4 : 1.0);
      const spreadX = (Math.random() - 0.5) * spread;
      const spreadY = (Math.random() - 0.5) * spread;

      const shootDir = new THREE.Vector3(
        -Math.sin(this.player.yaw + spreadX) * Math.cos(this.player.pitch + spreadY),
        Math.sin(this.player.pitch + spreadY),
        -Math.cos(this.player.yaw + spreadX) * Math.cos(this.player.pitch + spreadY)
      ).normalize();

      // Raycast to find bot hits
      let closestHitDist = 200;
      let hitBot: BotController | null = null;
      let isHeadshot = false;

      for (const bot of this.bots) {
        if (bot.isDead || bot.state === 'DROPPING') continue;

        // Test Head sphere (radius 0.3)
        const botHeadPos = bot.position.clone().add(new THREE.Vector3(0, 1.7, 0));
        const headDist = this.pointRayDistance(botHeadPos, muzzlePos, shootDir);
        if (headDist < 0.32) {
          const distAlongRay = botHeadPos.clone().sub(muzzlePos).dot(shootDir);
          if (distAlongRay > 0 && distAlongRay < closestHitDist) {
            closestHitDist = distAlongRay;
            hitBot = bot;
            isHeadshot = true;
          }
        }

        // Test Body cylinder (radius 0.55, height 1.4)
        const botBodyPos = bot.position.clone().add(new THREE.Vector3(0, 0.9, 0));
        const bodyDist = this.pointRayDistance(botBodyPos, muzzlePos, shootDir);
        if (bodyDist < 0.55 && !isHeadshot) {
          const distAlongRay = botBodyPos.clone().sub(muzzlePos).dot(shootDir);
          if (distAlongRay > 0 && distAlongRay < closestHitDist) {
            closestHitDist = distAlongRay;
            hitBot = bot;
            isHeadshot = false;
          }
        }
      }

      const impactPoint = muzzlePos.clone().addScaledVector(shootDir, closestHitDist);
      this.particles.spawnBulletTracer(muzzlePos, impactPoint, weapon.rarity === 'legendary' ? 0xf59e0b : 0xfef08a);

      if (hitBot) {
        const damage = weapon.damage * (isHeadshot ? weapon.headshotMultiplier : 1.0);
        this.player.damageDealt += damage;
        if (isHeadshot) this.player.headshots++;

        this.particles.spawnDamageNumber(damage, isHeadshot, impactPoint);
        soundEngine.playHitMarker(isHeadshot);
        this.callbacks.onHitMarker(isHeadshot);

        const died = hitBot.takeDamage(damage, isHeadshot);
        if (died) {
          this.handleBotDeath(hitBot, 'Player', weapon.name, isHeadshot);
        }
      }
    }
  }

  // --- BOT COMBAT LOGIC ---
  private handleBotShot(bot: BotController, targetPos: THREE.Vector3) {
    const muzzlePos = bot.position.clone().add(new THREE.Vector3(0, 1.3, 0));
    const dir = targetPos.clone().sub(muzzlePos).normalize();
    const hitPoint = muzzlePos.clone().addScaledVector(dir, 50);

    this.particles.spawnBulletTracer(muzzlePos, hitPoint, 0xfca5a5);

    // Check if shot hits Player
    const playerBodyPos = this.player.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    const distToPlayerRay = this.pointRayDistance(playerBodyPos, muzzlePos, dir);
    if (distToPlayerRay < 0.65) {
      const isHead = Math.random() < 0.15;
      const dmg = bot.weapon.damage * (isHead ? bot.weapon.headshotMultiplier : 1.0);
      const died = this.player.takeDamage(dmg, isHead);
      this.callbacks.onDamageTaken();
      this.particles.spawnDamageNumber(dmg, isHead, playerBodyPos);
      if (died) {
        this.handlePlayerDeath(bot.name);
      }
      return;
    }

    // Check if shot hits other Bots
    for (const other of this.bots) {
      if (other.id !== bot.id && !other.isDead && other.state !== 'DROPPING') {
        const otherPos = other.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        const distToRay = this.pointRayDistance(otherPos, muzzlePos, dir);
        if (distToRay < 0.6) {
          const isHead = Math.random() < 0.12;
          const dmg = bot.weapon.damage * (isHead ? bot.weapon.headshotMultiplier : 1.0);
          const died = other.takeDamage(dmg, isHead);
          if (died) {
            this.handleBotDeath(other, bot.name, bot.weapon.name, isHead);
          }
          return;
        }
      }
    }
  }

  public throwGrenade() {
    if (this.player.inventory.grenades <= 0 || this.player.isDead) return;
    this.player.inventory.grenades--;

    const throwOrigin = this.player.position.clone().add(new THREE.Vector3(0, 1.6, 0));
    const throwDir = new THREE.Vector3(
      -Math.sin(this.player.yaw) * Math.cos(this.player.pitch + 0.2),
      Math.sin(this.player.pitch + 0.2),
      -Math.cos(this.player.yaw) * Math.cos(this.player.pitch + 0.2)
    ).normalize();

    const grenadeTarget = throwOrigin.clone().addScaledVector(throwDir, 24);
    grenadeTarget.y = this.terrain.getHeight(grenadeTarget.x, grenadeTarget.z) + 0.2;

    // Fuse timer 1.8s
    window.setTimeout(() => {
      this.particles.spawnExplosion(grenadeTarget, 8.0);

      // Radial damage to player & bots
      const pDist = this.player.position.distanceTo(grenadeTarget);
      if (pDist < 8.0) {
        const dmg = Math.round((1 - pDist / 8.0) * 110);
        const died = this.player.takeDamage(dmg, false);
        this.callbacks.onDamageTaken();
        if (died) this.handlePlayerDeath('Grenade');
      }

      for (const bot of this.bots) {
        if (!bot.isDead) {
          const bDist = bot.position.distanceTo(grenadeTarget);
          if (bDist < 8.0) {
            const dmg = Math.round((1 - bDist / 8.0) * 110);
            const died = bot.takeDamage(dmg, false);
            if (died) {
              this.handleBotDeath(bot, 'Player', 'Frag Grenade', false);
            }
          }
        }
      }
    }, 1800);
  }

  private handleBotDeath(bot: BotController, killerName: string, weaponName: string, isHeadshot: boolean) {
    bot.isDead = true;
    this.playersAlive = Math.max(1, this.playersAlive - 1);

    if (killerName === 'Player') {
      this.player.kills++;
    }

    // Drop Death Crate
    this.lootManager.spawnDeathCrate(bot.position, bot.name);

    // Emit kill feed
    this.callbacks.onKillFeed({
      id: `kf_${Date.now()}_${Math.random()}`,
      killerName,
      victimName: bot.name,
      weaponName,
      isHeadshot,
      isPlayerKiller: killerName === 'Player',
      isPlayerVictim: false,
      timestamp: Date.now(),
    });

    // Check Victory Condition!
    if (this.playersAlive === 1 && !this.player.isDead) {
      this.handleVictory();
    }
  }

  private handlePlayerDeath(killerName: string) {
    this.phase = 'GAMEOVER';
    this.callbacks.onPhaseChange('GAMEOVER');

    this.callbacks.onKillFeed({
      id: `kf_${Date.now()}`,
      killerName,
      victimName: 'Player',
      weaponName: 'Eliminated',
      isHeadshot: false,
      isPlayerKiller: false,
      isPlayerVictim: true,
      timestamp: Date.now(),
    });

    const stats: PlayerStats = {
      kills: this.player.kills,
      damageDealt: Math.round(this.player.damageDealt),
      survivalTime: Math.round(this.matchTime),
      rank: this.playersAlive,
      totalPlayers: this.totalPlayers,
      headshots: this.player.headshots,
    };

    this.callbacks.onGameOver(stats, false);
  }

  private handleVictory() {
    this.phase = 'VICTORY';
    this.callbacks.onPhaseChange('VICTORY');
    soundEngine.playVictoryFanfare();

    const stats: PlayerStats = {
      kills: this.player.kills,
      damageDealt: Math.round(this.player.damageDealt),
      survivalTime: Math.round(this.matchTime),
      rank: 1,
      totalPlayers: this.totalPlayers,
      headshots: this.player.headshots,
    };

    this.callbacks.onGameOver(stats, true);
  }

  public pickupLootItem(lootId: string) {
    const collected = this.lootManager.collectLoot(lootId);
    if (!collected) return;

    const item = collected.item;

    if (item.category === 'weapon' && item.weaponType) {
      const newDef = item.weaponType;
      // If primary1 is empty or active, swap
      if (this.player.inventory.activeSlot === 'pistol' && newDef === 'pistol') {
        this.player.inventory.pistol = { weapon: this.player.inventory.pistol!.weapon, ammoInClip: 12 };
      } else if (!this.player.inventory.primary2) {
        this.player.inventory.primary2 = {
          weapon: this.player.inventory.primary1 ? this.player.inventory.primary1.weapon : this.player.inventory.pistol!.weapon,
          ammoInClip: 30,
        };
      }
      this.player.switchWeapon(this.player.inventory.activeSlot);
    } else if (item.category === 'armor' && item.level) {
      const dur = item.level === 3 ? 300 : item.level === 2 ? 250 : 200;
      this.player.inventory.armor = { level: item.level, durability: dur, maxDurability: dur };
    } else if (item.category === 'helmet' && item.level) {
      const dur = item.level === 3 ? 200 : item.level === 2 ? 150 : 100;
      this.player.inventory.helmet = { level: item.level, durability: dur, maxDurability: dur };
    } else if (item.category === 'med') {
      if (item.name.includes('Medkit')) this.player.inventory.meds.medkit += item.amount || 1;
      else if (item.name.includes('Bandage')) this.player.inventory.meds.bandage += item.amount || 5;
      else if (item.name.includes('Energy')) this.player.inventory.meds.energyDrink += item.amount || 1;
    } else if (item.category === 'throwable') {
      this.player.inventory.grenades += item.amount || 1;
    } else if (item.category === 'ammo' && item.ammoType) {
      this.player.inventory.ammo[item.ammoType] += item.amount || 30;
    }
  }

  // Helper: perpendicular distance from point to ray
  private pointRayDistance(point: THREE.Vector3, rayOrigin: THREE.Vector3, rayDir: THREE.Vector3): number {
    const toPoint = point.clone().sub(rayOrigin);
    const proj = toPoint.dot(rayDir);
    if (proj <= 0) return toPoint.length();
    const projVector = rayDir.clone().multiplyScalar(proj);
    return toPoint.sub(projVector).length();
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose() {
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
  }
}
