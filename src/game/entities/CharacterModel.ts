/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CharacterCustomization, WeaponType } from '../core/GameTypes';
import { WEAPON_DEFINITIONS } from '../weapons/WeaponConfig';

export class CharacterModel {
  public group: THREE.Group = new THREE.Group();

  // Rig parts
  public hips: THREE.Group = new THREE.Group();
  public torso: THREE.Group = new THREE.Group();
  public head: THREE.Group = new THREE.Group();
  public leftArm: THREE.Group = new THREE.Group();
  public rightArm: THREE.Group = new THREE.Group();
  public leftLeg: THREE.Group = new THREE.Group();
  public rightLeg: THREE.Group = new THREE.Group();
  public backpack: THREE.Mesh;
  public helmetMesh: THREE.Mesh;
  public weaponHolder: THREE.Group = new THREE.Group();
  public parachuteGroup: THREE.Group = new THREE.Group();

  private weaponMesh: THREE.Group = new THREE.Group();
  private outfitColors = {
    camo: 0x3f6212, // army olive
    cyber: 0x0284c7, // high-tech cyan
    desert: 0xb45309, // desert sand tan
    arctic: 0xe2e8f0, // arctic white/ice
    neon: 0xd946ef, // neon fuchsia
  };

  private skinColors = {
    light: 0xfcd34d,
    tan: 0xd97706,
    dark: 0x78350f,
    bronze: 0x92400e,
  };

  constructor(public isBot: boolean, customization: CharacterCustomization) {
    const skinHex = this.skinColors[customization.skinTone] || 0xd97706;
    const outfitHex = this.outfitColors[customization.outfit] || 0x3f6212;

    // Materials with varied roughness/metalness
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinHex,
      roughness: 0.65,
      metalness: 0.05,
    });
    const outfitMat = new THREE.MeshStandardMaterial({
      color: outfitHex,
      roughness: 0.8,
      metalness: 0.15,
    });
    const vestMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // tactical black vest
      roughness: 0.5,
      metalness: 0.4,
    });
    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.4,
      metalness: 0.2,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.1,
      metalness: 0.9,
    });

    // 1. Hips (Root anchor around y: 0.95)
    this.hips.position.y = 0.95;
    const hipGeo = new THREE.BoxGeometry(0.55, 0.3, 0.35);
    const hipMesh = new THREE.Mesh(hipGeo, outfitMat);
    hipMesh.castShadow = true;
    this.hips.add(hipMesh);
    this.group.add(this.hips);

    // 2. Torso (mounted on hips)
    this.torso.position.y = 0.15;
    const torsoGeo = new THREE.BoxGeometry(0.65, 0.65, 0.38);
    const torsoMesh = new THREE.Mesh(torsoGeo, outfitMat);
    torsoMesh.position.y = 0.35;
    torsoMesh.castShadow = true;
    this.torso.add(torsoMesh);

    // Tactical Vest
    const vestGeo = new THREE.BoxGeometry(0.7, 0.5, 0.44);
    const vestMesh = new THREE.Mesh(vestGeo, vestMat);
    vestMesh.position.y = 0.35;
    vestMesh.castShadow = true;
    this.torso.add(vestMesh);

    // Backpack
    const packGeo = new THREE.BoxGeometry(0.5, 0.5, 0.25);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.2 });
    this.backpack = new THREE.Mesh(packGeo, packMat);
    this.backpack.position.set(0, 0.35, -0.32);
    this.backpack.castShadow = true;
    this.torso.add(this.backpack);

    // 3. Head & Visor
    this.head.position.y = 0.72;
    const headGeo = new THREE.BoxGeometry(0.36, 0.38, 0.36);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.y = 0.2;
    headMesh.castShadow = true;
    this.head.add(headMesh);

    // Tactical Sunglasses / Visor
    const visorGeo = new THREE.BoxGeometry(0.38, 0.12, 0.1);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.22, 0.16);
    this.head.add(visor);

    // Military Helmet
    const helmetGeo = new THREE.SphereGeometry(0.24, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const helmetMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.3,
      metalness: 0.6,
    });
    this.helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
    this.helmetMesh.position.set(0, 0.3, 0);
    this.head.add(this.helmetMesh);

    this.torso.add(this.head);

    // 4. Arms
    // Left Arm
    this.leftArm.position.set(-0.42, 0.62, 0);
    const armGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    armGeo.translate(0, -0.28, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, outfitMat);
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);
    this.torso.add(this.leftArm);

    // Right Arm (holds the weapon)
    this.rightArm.position.set(0.42, 0.62, 0);
    const rightArmMesh = new THREE.Mesh(armGeo.clone(), outfitMat);
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);

    // Weapon holder attached to right arm hand
    this.weaponHolder.position.set(0, -0.55, 0.2);
    this.rightArm.add(this.weaponHolder);
    this.torso.add(this.rightArm);

    this.hips.add(this.torso);

    // 5. Legs
    const legGeo = new THREE.BoxGeometry(0.22, 0.9, 0.24);
    legGeo.translate(0, -0.45, 0);

    // Left Leg
    this.leftLeg.position.set(-0.18, 0, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, outfitMat);
    leftLegMesh.castShadow = true;
    this.leftLeg.add(leftLegMesh);

    // Left Boot
    const bootGeo = new THREE.BoxGeometry(0.24, 0.2, 0.35);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.85, 0.05);
    leftBoot.castShadow = true;
    this.leftLeg.add(leftBoot);
    this.hips.add(this.leftLeg);

    // Right Leg
    this.rightLeg.position.set(0.18, 0, 0);
    const rightLegMesh = new THREE.Mesh(legGeo.clone(), outfitMat);
    rightLegMesh.castShadow = true;
    this.rightLeg.add(rightLegMesh);

    // Right Boot
    const rightBoot = new THREE.Mesh(bootGeo.clone(), bootMat);
    rightBoot.position.set(0, -0.85, 0.05);
    rightBoot.castShadow = true;
    this.rightLeg.add(rightBoot);
    this.hips.add(this.rightLeg);

    // 6. Deployable Parachute
    this.createParachuteCanopy();

    // Default weapon
    this.setWeaponModel('rifle');
  }

  private createParachuteCanopy() {
    this.parachuteGroup.position.set(0, 3.8, 0);
    this.parachuteGroup.visible = false;

    // Dome canopy
    const canopyGeo = new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // tactical orange
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 2.0;
    this.parachuteGroup.add(canopy);

    // Suspension cords
    const cordMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const cordPoints = [
      [-1.8, 2, -1.8],
      [1.8, 2, -1.8],
      [-1.8, 2, 1.8],
      [1.8, 2, 1.8],
    ];
    cordPoints.forEach(([cx, cy, cz]) => {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(cx, cy, cz),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(geo, cordMat);
      this.parachuteGroup.add(line);
    });

    this.group.add(this.parachuteGroup);
  }

  public setParachuteVisible(visible: boolean) {
    this.parachuteGroup.visible = visible;
  }

  public setWeaponModel(weaponType: WeaponType | null) {
    while (this.weaponHolder.children.length > 0) {
      this.weaponHolder.remove(this.weaponHolder.children[0]);
    }

    if (!weaponType) return;
    const def = WEAPON_DEFINITIONS[weaponType];
    const gun = new THREE.Group();

    // Barrel & Receiver
    const barrelGeo = new THREE.BoxGeometry(0.08, 0.12, 0.8);
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.3,
      metalness: 0.8,
    });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.z = 0.3;
    gun.add(barrel);

    // Magazine
    const magGeo = new THREE.BoxGeometry(0.07, 0.25, 0.12);
    const magMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.4,
      metalness: 0.7,
    });
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, -0.15, 0.1);
    gun.add(mag);

    // Stock & Grip
    const gripGeo = new THREE.BoxGeometry(0.08, 0.2, 0.1);
    const gripMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(def.color).getHex(),
      roughness: 0.5,
      metalness: 0.3,
    });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.12, -0.1);
    gun.add(grip);

    // Scope if Sniper or Rifle
    if (weaponType === 'sniper' || weaponType === 'rifle') {
      const scopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
      scopeGeo.rotateX(Math.PI / 2);
      const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.9 });
      const scope = new THREE.Mesh(scopeGeo, scopeMat);
      scope.position.set(0, 0.1, 0.15);
      gun.add(scope);
    }

    this.weaponMesh = gun;
    this.weaponHolder.add(gun);
  }

  // --- PROCEDURAL ANIMATIONS ---
  public updateAnimation(
    state: 'idle' | 'run' | 'crouch' | 'jump' | 'freefall' | 'parachute' | 'dead',
    time: number,
    aimPitch: number,
    recoilImpulse: number = 0
  ) {
    if (state === 'dead') {
      this.hips.position.y = 0.2;
      this.hips.rotation.x = -Math.PI / 2;
      this.torso.rotation.set(0, 0, 0);
      this.leftArm.rotation.set(0.3, 0, 0.5);
      this.rightArm.rotation.set(0.3, 0, -0.5);
      this.leftLeg.rotation.set(0.2, 0, 0.2);
      this.rightLeg.rotation.set(0.2, 0, -0.2);
      this.setParachuteVisible(false);
      return;
    }

    if (state === 'freefall') {
      // Skydive spread-eagle posture
      this.hips.position.y = 1.0;
      this.hips.rotation.x = 1.2; // leaning down into wind
      this.leftArm.rotation.set(-1.0, 0, -1.2);
      this.rightArm.rotation.set(-1.0, 0, 1.2);
      this.leftLeg.rotation.set(-0.6, 0, -0.4);
      this.rightLeg.rotation.set(-0.6, 0, 0.4);
      this.head.rotation.x = -0.8; // look ahead
      this.setParachuteVisible(false);
      return;
    }

    if (state === 'parachute') {
      this.hips.position.y = 0.95;
      this.hips.rotation.x = 0.1;
      this.leftArm.rotation.set(2.4, 0, -0.4); // holding risers
      this.rightArm.rotation.set(2.4, 0, 0.4);
      this.leftLeg.rotation.set(0.3, 0, 0.1);
      this.rightLeg.rotation.set(0.2, 0, -0.1);
      this.setParachuteVisible(true);
      return;
    }

    this.setParachuteVisible(false);

    // Aim Pitch & Recoil on upper body
    this.torso.rotation.x = -aimPitch + recoilImpulse * 0.4;

    if (state === 'jump') {
      this.hips.position.y = 1.1;
      this.hips.rotation.x = 0;
      this.leftLeg.rotation.x = -0.7;
      this.rightLeg.rotation.x = 0.4;
      this.leftArm.rotation.x = -0.8;
      this.rightArm.rotation.x = -aimPitch - 0.4 - recoilImpulse;
      return;
    }

    if (state === 'crouch') {
      this.hips.position.y = 0.55; // Lowered stance
      this.leftLeg.rotation.x = 1.2;
      this.rightLeg.rotation.x = 1.2;
      this.leftArm.rotation.x = -aimPitch - 0.6;
      this.rightArm.rotation.x = -aimPitch - 0.6 - recoilImpulse;
      this.head.rotation.x = aimPitch * 0.5;
      return;
    }

    if (state === 'run') {
      const freq = 12.0; // Strides per second
      const legStride = Math.sin(time * freq) * 0.75;
      const armSwing = Math.cos(time * freq) * 0.65;

      this.hips.position.y = 0.95 + Math.abs(Math.sin(time * freq)) * 0.08;
      this.hips.rotation.x = 0.15; // forward lean

      this.leftLeg.rotation.x = legStride;
      this.rightLeg.rotation.x = -legStride;

      // Left arm swings or supports, right arm aims weapon
      this.leftArm.rotation.x = -armSwing * 0.5 - 0.4;
      this.rightArm.rotation.x = -aimPitch - 0.3 - recoilImpulse;
      return;
    }

    // IDLE
    this.hips.position.y = 0.95;
    this.hips.rotation.x = 0;
    this.leftLeg.rotation.set(0, 0, 0);
    this.rightLeg.rotation.set(0, 0, 0);

    // Gentle breathing
    const breath = Math.sin(time * 2.5) * 0.03;
    this.torso.position.y = 0.15 + breath;
    this.head.rotation.x = breath * 0.5;

    // Combat weapon hold
    this.rightArm.rotation.x = -aimPitch - 0.5 - recoilImpulse;
    this.leftArm.rotation.x = -aimPitch - 0.4;
    this.leftArm.rotation.y = 0.3; // holding barrel grip
  }
}
