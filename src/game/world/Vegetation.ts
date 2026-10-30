/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { Terrain } from './Terrain';
import { CollisionBox } from './Structures';

export class Vegetation {
  public group: THREE.Group = new THREE.Group();
  public treeTrunkMesh: THREE.InstancedMesh;
  public treeFoliageMesh: THREE.InstancedMesh;
  public rockMesh: THREE.InstancedMesh;
  public collisionObstacles: { x: number; z: number; radius: number }[] = [];

  constructor(private terrain: Terrain, collisionBoxes: CollisionBox[]) {
    const treeCount = 280;
    const rockCount = 140;

    // --- PINE / OAK TREES (Trunks + Conical Foliage) ---
    // Trunk Geometry: Pivot at bottom (y: 0 to 4)
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 4.0, 7);
    trunkGeo.translate(0, 2.0, 0);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    this.treeTrunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    this.treeTrunkMesh.castShadow = true;
    this.treeTrunkMesh.receiveShadow = true;

    // Foliage Geometry: Stacked multi-layer low-poly cone
    const foliageGeo = new THREE.ConeGeometry(2.6, 6.0, 7);
    foliageGeo.translate(0, 5.5, 0);
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.8,
      metalness: 0.05,
      flatShading: true,
    });
    this.treeFoliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
    this.treeFoliageMesh.castShadow = true;
    this.treeFoliageMesh.receiveShadow = true;

    // --- ROCKS & BOULDERS (Dodecahedron with irregular scaling) ---
    const rockGeo = new THREE.DodecahedronGeometry(1.6, 1);
    rockGeo.translate(0, 1.2, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      roughness: 0.85,
      metalness: 0.15,
      flatShading: true,
    });
    this.rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    this.rockMesh.castShadow = true;
    this.rockMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // Place trees across the island avoiding compounds
    let placedTrees = 0;
    let attempts = 0;
    while (placedTrees < treeCount && attempts < 2000) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const radius = 15 + Math.random() * 190;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.terrain.getHeight(x, z);

      // Skip underwater or lake
      if (y < 0.6) continue;

      // Skip inside buildings
      let insideBuilding = false;
      for (const box of collisionBoxes) {
        if (x > box.min.x - 3 && x < box.max.x + 3 && z > box.min.z - 3 && z < box.max.z + 3) {
          insideBuilding = true;
          break;
        }
      }
      if (insideBuilding) continue;

      // Instance scale variation ±15%
      const scale = 0.85 + Math.random() * 0.35;
      const rotY = Math.random() * Math.PI * 2;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, rotY, 0);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      this.treeTrunkMesh.setMatrixAt(placedTrees, dummy.matrix);
      this.treeFoliageMesh.setMatrixAt(placedTrees, dummy.matrix);

      // Color variation for natural look
      const greenVariation = 0.85 + Math.random() * 0.3;
      color.setRGB(0.18 * greenVariation, 0.35 * greenVariation, 0.15 * greenVariation);
      this.treeFoliageMesh.setColorAt(placedTrees, color);

      this.collisionObstacles.push({ x, z, radius: 0.8 * scale });
      placedTrees++;
    }

    // Place rocks
    let placedRocks = 0;
    attempts = 0;
    while (placedRocks < rockCount && attempts < 1500) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const radius = 25 + Math.random() * 185;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.terrain.getHeight(x, z);

      if (y < 0.4) continue;

      const scaleX = 0.8 + Math.random() * 0.7;
      const scaleY = 0.7 + Math.random() * 0.6;
      const scaleZ = 0.8 + Math.random() * 0.7;

      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI * 2, Math.random() * 0.4);
      dummy.scale.set(scaleX, scaleY, scaleZ);
      dummy.updateMatrix();

      this.rockMesh.setMatrixAt(placedRocks, dummy.matrix);

      const gray = 0.3 + Math.random() * 0.15;
      color.setRGB(gray, gray * 0.95, gray * 0.9);
      this.rockMesh.setColorAt(placedRocks, color);

      this.collisionObstacles.push({ x, z, radius: 1.4 * Math.max(scaleX, scaleZ) });
      placedRocks++;
    }

    this.treeTrunkMesh.instanceMatrix.needsUpdate = true;
    this.treeFoliageMesh.instanceMatrix.needsUpdate = true;
    if (this.treeFoliageMesh.instanceColor) this.treeFoliageMesh.instanceColor.needsUpdate = true;
    this.rockMesh.instanceMatrix.needsUpdate = true;
    if (this.rockMesh.instanceColor) this.rockMesh.instanceColor.needsUpdate = true;

    this.treeTrunkMesh.computeBoundingSphere();
    this.treeFoliageMesh.computeBoundingSphere();
    this.rockMesh.computeBoundingSphere();

    this.group.add(this.treeTrunkMesh);
    this.group.add(this.treeFoliageMesh);
    this.group.add(this.rockMesh);
  }

  public checkObstacleCollision(pos: THREE.Vector3, playerRadius: number = 0.5): boolean {
    for (const obs of this.collisionObstacles) {
      const distSq = (pos.x - obs.x) ** 2 + (pos.z - obs.z) ** 2;
      const minDist = obs.radius + playerRadius;
      if (distSq < minDist * minDist) {
        return true;
      }
    }
    return false;
  }
}
