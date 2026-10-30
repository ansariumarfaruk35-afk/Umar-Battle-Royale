/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { GroundLoot, LootItem } from '../core/GameTypes';
import { BASE_LOOT_TABLE, RARITY_COLORS } from '../weapons/WeaponConfig';
import { soundEngine } from '../audio/SoundEngine';

export class LootManager {
  public group: THREE.Group = new THREE.Group();
  public groundLootList: GroundLoot[] = [];
  private itemCounter: number = 0;

  constructor(spawnPoints: THREE.Vector3[]) {
    this.populateInitialLoot(spawnPoints);
  }

  private populateInitialLoot(spawnPoints: THREE.Vector3[]) {
    // Distribute loot across spawn points
    for (const point of spawnPoints) {
      if (Math.random() < 0.8) {
        // Pick random item from base table
        const template = BASE_LOOT_TABLE[Math.floor(Math.random() * BASE_LOOT_TABLE.length)];
        this.spawnLoot(
          {
            ...template,
            id: `loot_${this.itemCounter++}`,
          },
          new THREE.Vector3(
            point.x + (Math.random() - 0.5) * 1.5,
            point.y + 0.15,
            point.z + (Math.random() - 0.5) * 1.5
          )
        );
      }
    }
  }

  public spawnLoot(item: LootItem, position: THREE.Vector3) {
    const lootGroup = new THREE.Group();
    lootGroup.position.copy(position);

    const rarityColor = RARITY_COLORS[item.rarity] || '#ffffff';
    const colorInt = new THREE.Color(rarityColor).getHex();

    // 1. Rarity Glowing Ground Pillar / Beam
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.25, 2.5, 8);
    beamGeo.translate(0, 1.25, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: colorInt,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    lootGroup.add(beam);

    // 2. Base pedestal / disc
    const ringGeo = new THREE.RingGeometry(0.35, 0.5, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorInt,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.05;
    lootGroup.add(ring);

    // 3. Iconic 3D Item Model
    let itemMesh: THREE.Object3D;
    if (item.category === 'weapon') {
      // Gun silhouette
      const gunGeo = new THREE.BoxGeometry(0.2, 0.35, 1.2);
      const gunMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.3,
        metalness: 0.8,
      });
      itemMesh = new THREE.Mesh(gunGeo, gunMat);
      itemMesh.position.y = 0.55;
    } else if (item.category === 'armor' || item.category === 'helmet') {
      // Armor / Helmet sphere/box
      const armorGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.45, 8);
      const armorMat = new THREE.MeshStandardMaterial({
        color: colorInt,
        roughness: 0.3,
        metalness: 0.7,
      });
      itemMesh = new THREE.Mesh(armorGeo, armorMat);
      itemMesh.position.y = 0.55;
    } else if (item.category === 'med') {
      // First aid kit box with red cross
      const medGeo = new THREE.BoxGeometry(0.45, 0.35, 0.45);
      const medMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.5,
        metalness: 0.2,
      });
      itemMesh = new THREE.Mesh(medGeo, medMat);
      itemMesh.position.y = 0.5;
    } else if (item.category === 'throwable') {
      // Frag grenade
      const nadeGeo = new THREE.SphereGeometry(0.22, 8, 8);
      const nadeMat = new THREE.MeshStandardMaterial({
        color: 0x15803d, // military olive
        roughness: 0.6,
        metalness: 0.4,
      });
      itemMesh = new THREE.Mesh(nadeGeo, nadeMat);
      itemMesh.position.y = 0.5;
    } else {
      // Ammo Box
      const ammoGeo = new THREE.BoxGeometry(0.4, 0.28, 0.35);
      const ammoMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.5,
        metalness: 0.6,
      });
      itemMesh = new THREE.Mesh(ammoGeo, ammoMat);
      itemMesh.position.y = 0.45;
    }

    lootGroup.add(itemMesh);
    this.group.add(lootGroup);

    this.groundLootList.push({
      id: item.id,
      item,
      position: position.clone(),
      mesh: lootGroup,
      collected: false,
    });
  }

  // Drop death crate when bot or player dies!
  public spawnDeathCrate(position: THREE.Vector3, botName: string) {
    const crateGroup = new THREE.Group();
    crateGroup.position.copy(position);

    // Military death loot crate
    const crateGeo = new THREE.BoxGeometry(1.2, 0.9, 1.2);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.5,
      metalness: 0.3,
    });
    const crateMesh = new THREE.Mesh(crateGeo, crateMat);
    crateMesh.position.y = 0.45;
    crateMesh.castShadow = true;
    crateGroup.add(crateMesh);

    // Glowing skull / cross on top
    const topGeo = new THREE.BoxGeometry(1.25, 0.1, 1.25);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      metalness: 0.8,
    });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.95;
    crateGroup.add(top);

    // Golden beacon beam
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.35, 4.0, 8);
    beamGeo.translate(0, 2.0, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    crateGroup.add(beam);

    this.group.add(crateGroup);

    // Scatter 3-5 valuable loot items around the crate
    const drops = [
      BASE_LOOT_TABLE.find(x => x.category === 'med' && x.name.includes('Medkit')) || BASE_LOOT_TABLE[0],
      BASE_LOOT_TABLE.find(x => x.category === 'ammo') || BASE_LOOT_TABLE[1],
      BASE_LOOT_TABLE.find(x => x.category === 'weapon' && (x.weaponType === 'rifle' || x.weaponType === 'sniper')) || BASE_LOOT_TABLE[2],
      BASE_LOOT_TABLE.find(x => x.category === 'armor' && x.level === 3) || BASE_LOOT_TABLE[3],
    ];

    drops.forEach((drop, idx) => {
      const angle = (idx / drops.length) * Math.PI * 2;
      const dropPos = position.clone().add(new THREE.Vector3(Math.cos(angle) * 1.6, 0.2, Math.sin(angle) * 1.6));
      this.spawnLoot(
        {
          ...drop,
          id: `death_loot_${this.itemCounter++}_${botName}`,
        },
        dropPos
      );
    });
  }

  public update(dt: number, time: number) {
    // Gentle hovering & rotation for floating loot
    for (const loot of this.groundLootList) {
      if (loot.mesh && !loot.collected) {
        loot.mesh.rotation.y += dt * 1.5;
        // Bobbing
        const itemChild = loot.mesh.children[2];
        if (itemChild) {
          itemChild.position.y = 0.5 + Math.sin(time * 3 + parseFloat(loot.id.replace(/\D/g, '') || '0')) * 0.08;
        }
      }
    }
  }

  public getNearbyLoot(pos: THREE.Vector3, range: number = 2.8): GroundLoot[] {
    const nearby: GroundLoot[] = [];
    for (const loot of this.groundLootList) {
      if (!loot.collected && loot.position.distanceTo(pos) <= range) {
        nearby.push(loot);
      }
    }
    return nearby;
  }

  public collectLoot(lootId: string): GroundLoot | null {
    const found = this.groundLootList.find(x => x.id === lootId && !x.collected);
    if (found) {
      found.collected = true;
      if (found.mesh) {
        this.group.remove(found.mesh);
      }
      soundEngine.playPickup();
      return found;
    }
    return null;
  }
}
