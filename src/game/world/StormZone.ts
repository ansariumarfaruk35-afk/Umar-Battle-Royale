/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { StormPhaseData } from '../core/GameTypes';
import { soundEngine } from '../audio/SoundEngine';

export class StormZone {
  public currentCenter: THREE.Vector2 = new THREE.Vector2(0, 0);
  public currentRadius: number = 240;

  public nextCenter: THREE.Vector2 = new THREE.Vector2(0, 0);
  public nextRadius: number = 170;

  public currentPhase: number = 0;
  public totalPhases: number = 5;
  public isShrinking: boolean = false;
  public phaseTimeRemaining: number = 60; // seconds before next shrink

  private phases: StormPhaseData[] = [
    { waitDuration: 45, shrinkDuration: 40, targetRadius: 160, targetCenter: new THREE.Vector2(10, -10), dps: 2.0 },
    { waitDuration: 35, shrinkDuration: 35, targetRadius: 105, targetCenter: new THREE.Vector2(-15, 20), dps: 4.5 },
    { waitDuration: 30, shrinkDuration: 30, targetRadius: 65, targetCenter: new THREE.Vector2(5, 10), dps: 7.5 },
    { waitDuration: 25, shrinkDuration: 25, targetRadius: 30, targetCenter: new THREE.Vector2(0, 5), dps: 12.0 },
    { waitDuration: 20, shrinkDuration: 20, targetRadius: 8, targetCenter: new THREE.Vector2(0, 5), dps: 18.0 },
  ];

  public stormMesh: THREE.Mesh;
  public safeZoneMarkerRing: THREE.Mesh;
  public nextZoneMarkerRing: THREE.Mesh;
  public group: THREE.Group = new THREE.Group();

  private shrinkStartRadius: number = 240;
  private shrinkStartCenter: THREE.Vector2 = new THREE.Vector2(0, 0);
  private shrinkElapsedTime: number = 0;

  constructor() {
    // 1. Storm Barrier Wall: Translucent double-sided cylinder
    const stormGeo = new THREE.CylinderGeometry(1, 1, 90, 64, 1, true);
    stormGeo.translate(0, 45, 0);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.25)');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Grid lines for high-tech storm barrier look
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const stormTex = new THREE.CanvasTexture(canvas);
    stormTex.wrapS = THREE.RepeatWrapping;
    stormTex.wrapT = THREE.RepeatWrapping;
    stormTex.repeat.set(16, 2);

    const stormMat = new THREE.MeshBasicMaterial({
      map: stormTex,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.stormMesh = new THREE.Mesh(stormGeo, stormMat);
    this.group.add(this.stormMesh);

    // 2. White dashed ring for next safe zone ground projection
    const ringGeo = new THREE.RingGeometry(0.97, 1.0, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const whiteRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this.nextZoneMarkerRing = new THREE.Mesh(ringGeo, whiteRingMat);
    this.nextZoneMarkerRing.position.y = 0.3;
    this.group.add(this.nextZoneMarkerRing);

    // 3. Current active zone ground ring
    const blueRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.safeZoneMarkerRing = new THREE.Mesh(ringGeo.clone(), blueRingMat);
    this.safeZoneMarkerRing.position.y = 0.35;
    this.group.add(this.safeZoneMarkerRing);

    this.initPhase(0);
  }

  private initPhase(phaseIndex: number) {
    this.currentPhase = phaseIndex;
    const p = this.phases[phaseIndex];
    if (!p) return;

    this.isShrinking = false;
    this.phaseTimeRemaining = p.waitDuration;
    this.nextRadius = p.targetRadius;
    this.nextCenter.copy(p.targetCenter);

    this.updateVisuals();
  }

  public update(dt: number) {
    if (this.currentPhase >= this.phases.length) return;
    const p = this.phases[this.currentPhase];

    this.phaseTimeRemaining -= dt;

    if (!this.isShrinking) {
      if (this.phaseTimeRemaining <= 0) {
        // Transition to shrinking state
        this.isShrinking = true;
        this.phaseTimeRemaining = p.shrinkDuration;
        this.shrinkElapsedTime = 0;
        this.shrinkStartRadius = this.currentRadius;
        this.shrinkStartCenter.copy(this.currentCenter);
        soundEngine.playStormWarning();
      }
    } else {
      this.shrinkElapsedTime += dt;
      const progress = Math.min(1.0, this.shrinkElapsedTime / p.shrinkDuration);

      // Lerp radius and center
      this.currentRadius = THREE.MathUtils.lerp(this.shrinkStartRadius, p.targetRadius, progress);
      this.currentCenter.lerpVectors(this.shrinkStartCenter, p.targetCenter, progress);

      if (progress >= 1.0) {
        // Phase complete, advance to next phase
        if (this.currentPhase + 1 < this.phases.length) {
          this.initPhase(this.currentPhase + 1);
        } else {
          this.isShrinking = false;
          this.phaseTimeRemaining = 0;
        }
      }
    }

    this.updateVisuals();
  }

  private updateVisuals() {
    // Scale and position storm mesh
    this.stormMesh.scale.set(this.currentRadius, 1, this.currentRadius);
    this.stormMesh.position.set(this.currentCenter.x, 0, this.currentCenter.y);

    this.safeZoneMarkerRing.scale.set(this.currentRadius, 1, this.currentRadius);
    this.safeZoneMarkerRing.position.set(this.currentCenter.x, 0.4, this.currentCenter.y);

    this.nextZoneMarkerRing.scale.set(this.nextRadius, 1, this.nextRadius);
    this.nextZoneMarkerRing.position.set(this.nextCenter.x, 0.3, this.nextCenter.y);
  }

  public isInsideSafeZone(pos: THREE.Vector3): boolean {
    const distSq = (pos.x - this.currentCenter.x) ** 2 + (pos.z - this.currentCenter.y) ** 2;
    return distSq <= this.currentRadius * this.currentRadius;
  }

  public getDistanceToSafeZone(pos: THREE.Vector3): number {
    const dist = Math.hypot(pos.x - this.currentCenter.x, pos.z - this.currentCenter.y);
    return dist - this.currentRadius; // > 0 if outside
  }

  public getCurrentDps(): number {
    const p = this.phases[this.currentPhase];
    return p ? p.dps : 15.0;
  }
}
