/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { DamageNumber } from '../core/GameTypes';
import { soundEngine } from '../audio/SoundEngine';

export interface BulletTracer {
  start: THREE.Vector3;
  end: THREE.Vector3;
  current: THREE.Vector3;
  progress: number;
  speed: number;
  mesh: THREE.Line;
}

export interface ActiveExplosion {
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  lifetime: number;
  maxLifetime: number;
  mesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
}

export class ParticleEffects {
  public group: THREE.Group = new THREE.Group();
  public tracers: BulletTracer[] = [];
  public explosions: ActiveExplosion[] = [];
  public damageNumbers: DamageNumber[] = [];
  private damageCounter: number = 0;

  // Flash light pool
  private muzzleLight: THREE.PointLight;

  constructor() {
    this.muzzleLight = new THREE.PointLight(0xf59e0b, 0, 15);
    this.group.add(this.muzzleLight);
  }

  public triggerMuzzleFlash(pos: THREE.Vector3) {
    this.muzzleLight.position.copy(pos);
    this.muzzleLight.intensity = 4.5;
  }

  public spawnBulletTracer(origin: THREE.Vector3, target: THREE.Vector3, color: number = 0xfef08a) {
    const geo = new THREE.BufferGeometry().setFromPoints([origin.clone(), origin.clone()]);
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    this.group.add(line);

    this.tracers.push({
      start: origin.clone(),
      end: target.clone(),
      current: origin.clone(),
      progress: 0,
      speed: 12.0, // progress speed per sec
      mesh: line,
    });
  }

  public spawnDamageNumber(amount: number, isHeadshot: boolean, position: THREE.Vector3) {
    this.damageNumbers.push({
      id: `dmg_${this.damageCounter++}`,
      amount: Math.round(amount),
      isHeadshot,
      position: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.4, (Math.random() - 0.5) * 0.4)),
      lifetime: 0,
      maxLifetime: 0.9,
    });
  }

  public spawnExplosion(pos: THREE.Vector3, maxRadius: number = 6.0) {
    soundEngine.playExplosion();

    // Fireball sphere
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.9,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.copy(pos);
    this.group.add(sphere);

    // Shockwave ground ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.position.y += 0.15;
    this.group.add(ring);

    this.explosions.push({
      position: pos.clone(),
      radius: 0.5,
      maxRadius,
      lifetime: 0,
      maxLifetime: 0.75,
      mesh: sphere,
      ringMesh: ring,
    });
  }

  public update(dt: number) {
    // Fade muzzle light
    if (this.muzzleLight.intensity > 0) {
      this.muzzleLight.intensity = Math.max(0, this.muzzleLight.intensity - dt * 25);
    }

    // Update bullet tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.progress += dt * t.speed;
      if (t.progress >= 1.0) {
        this.group.remove(t.mesh);
        t.mesh.geometry.dispose();
        this.tracers.splice(i, 1);
      } else {
        const currentHead = t.start.clone().lerp(t.end, Math.min(1.0, t.progress + 0.15));
        const currentTail = t.start.clone().lerp(t.end, t.progress);
        t.mesh.geometry.setFromPoints([currentTail, currentHead]);
      }
    }

    // Update damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.lifetime += dt;
      dn.position.y += dt * 1.6; // float upwards
      if (dn.lifetime >= dn.maxLifetime) {
        this.damageNumbers.splice(i, 1);
      }
    }

    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.lifetime += dt;
      const progress = exp.lifetime / exp.maxLifetime;

      if (progress >= 1.0) {
        this.group.remove(exp.mesh);
        this.group.remove(exp.ringMesh);
        exp.mesh.geometry.dispose();
        exp.ringMesh.geometry.dispose();
        this.explosions.splice(i, 1);
      } else {
        const scale = THREE.MathUtils.lerp(0.5, exp.maxRadius, Math.sin(progress * Math.PI * 0.5));
        exp.mesh.scale.set(scale, scale, scale);
        exp.ringMesh.scale.set(scale * 1.5, 1, scale * 1.5);
        (exp.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - progress;
        (exp.ringMesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress) * 0.8;
      }
    }
  }
}
