/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { Terrain } from './Terrain';

export interface CollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface MapCompound {
  name: string;
  position: THREE.Vector3;
}

export class Structures {
  public group: THREE.Group = new THREE.Group();
  public collisionBoxes: CollisionBox[] = [];
  public compounds: MapCompound[] = [];
  public lootSpawnPoints: THREE.Vector3[] = [];
  public dropPlane: THREE.Group;

  constructor(private terrain: Terrain) {
    this.dropPlane = this.createDropPlane();
    this.group.add(this.dropPlane);
    this.buildMapCompounds();
  }

  // --- PROCEDURAL CARGO DROP PLANE (Free Fire / Battle Royale intro) ---
  public createDropPlane(): THREE.Group {
    const plane = new THREE.Group();

    // 1. Fuselage
    const fuselageGeo = new THREE.CylinderGeometry(3.5, 3.0, 28, 12);
    fuselageGeo.rotateZ(Math.PI / 2);
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // dark stealth charcoal
      roughness: 0.35,
      metalness: 0.7,
    });
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
    fuselage.castShadow = true;
    plane.add(fuselage);

    // 2. Cockpit canopy
    const cockpitGeo = new THREE.ConeGeometry(3.1, 7, 12);
    cockpitGeo.rotateZ(-Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(17, 0, 0);
    plane.add(cockpit);

    // 3. Wings
    const wingGeo = new THREE.BoxGeometry(7, 0.4, 42);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.45,
      metalness: 0.5,
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(2, 0.8, 0);
    wings.castShadow = true;
    plane.add(wings);

    // 4. Jet Engines (2 engines under wings)
    const engineGeo = new THREE.CylinderGeometry(1.2, 1.2, 5, 10);
    engineGeo.rotateZ(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.2,
      metalness: 0.8,
    });
    const engineL = new THREE.Mesh(engineGeo, engineMat);
    engineL.position.set(2, -1.8, -10);
    const engineR = new THREE.Mesh(engineGeo, engineMat);
    engineR.position.set(2, -1.8, 10);
    plane.add(engineL, engineR);

    // 5. Tail Stabilizers (Vertical and Horizontal)
    const tailVertGeo = new THREE.BoxGeometry(5, 7, 0.5);
    const tailVert = new THREE.Mesh(tailVertGeo, wingMat);
    tailVert.position.set(-12, 4.5, 0);
    tailVert.rotation.z = -0.25;

    const tailHoriGeo = new THREE.BoxGeometry(4, 0.4, 14);
    const tailHori = new THREE.Mesh(tailHoriGeo, wingMat);
    tailHori.position.set(-12, 6, 0);
    plane.add(tailVert, tailHori);

    // 6. Accent Decals (Umar Battle Royale military orange trim)
    const trimGeo = new THREE.BoxGeometry(16, 0.6, 3.6);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.3,
      metalness: 0.2,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, 1.8, 0);
    plane.add(trim);

    plane.scale.set(1.4, 1.4, 1.4);
    plane.position.set(0, 150, 0); // High in sky
    return plane;
  }

  // --- PROCEDURAL 2-STORY HOUSE (3-12 parts) ---
  public createTwoStoryHouse(x: number, z: number, rotation: number = 0): THREE.Group {
    const y = this.terrain.getHeight(x, z);
    const house = new THREE.Group();
    house.position.set(x, y, z);
    house.rotation.y = rotation;

    // 1. Concrete Foundation
    const foundGeo = new THREE.BoxGeometry(13, 1.2, 11);
    const foundMat = new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.9, metalness: 0.1 });
    const foundation = new THREE.Mesh(foundGeo, foundMat);
    foundation.position.y = 0.6;
    foundation.receiveShadow = true;
    house.add(foundation);

    // 2. Floor 1 Walls (Plaster / Wood)
    const f1WallsGeo = new THREE.BoxGeometry(12, 4.2, 10);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.8, metalness: 0.05 });
    const f1Walls = new THREE.Mesh(f1WallsGeo, wallMat);
    f1Walls.position.y = 1.2 + 2.1;
    f1Walls.castShadow = true;
    f1Walls.receiveShadow = true;
    house.add(f1Walls);

    // 3. Middle Floor Divider / Balcony trim
    const trimGeo = new THREE.BoxGeometry(12.6, 0.4, 10.6);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.6, metalness: 0.3 });
    const midTrim = new THREE.Mesh(trimGeo, trimMat);
    midTrim.position.y = 5.4;
    house.add(midTrim);

    // 4. Floor 2 Walls
    const f2WallsGeo = new THREE.BoxGeometry(11, 3.8, 9);
    const f2Walls = new THREE.Mesh(f2WallsGeo, wallMat);
    f2Walls.position.y = 5.6 + 1.9;
    f2Walls.castShadow = true;
    house.add(f2Walls);

    // 5. Slanted Roof (Pitched prism)
    const roofGeo = new THREE.ConeGeometry(8.5, 3.2, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6, metalness: 0.1 }); // terracotta red roof
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 11;
    roof.scale.set(1.1, 1, 0.9);
    roof.castShadow = true;
    house.add(roof);

    // 6. Doorways & Window accent frames
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7, metalness: 0.1 });
    const doorGeo = new THREE.BoxGeometry(1.6, 3, 0.2);
    const doorFront = new THREE.Mesh(doorGeo, doorMat);
    doorFront.position.set(0, 2.7, 5.05);
    const doorBack = new THREE.Mesh(doorGeo, doorMat);
    doorBack.position.set(2, 2.7, -5.05);
    house.add(doorFront, doorBack);

    // Register collision box for the house
    this.collisionBoxes.push({
      min: new THREE.Vector3(x - 6.2, y, z - 5.2),
      max: new THREE.Vector3(x + 6.2, y + 10, z + 5.2),
    });

    // Loot points inside and around house
    this.lootSpawnPoints.push(
      new THREE.Vector3(x, y + 1.4, z),
      new THREE.Vector3(x - 3, y + 1.4, z + 2),
      new THREE.Vector3(x + 3, y + 5.8, z),
      new THREE.Vector3(x, y + 1.4, z + 6)
    );

    this.group.add(house);
    return house;
  }

  // --- PROCEDURAL WAREHOUSE / HANGAR ---
  public createWarehouse(x: number, z: number, rotation: number = 0): THREE.Group {
    const y = this.terrain.getHeight(x, z);
    const warehouse = new THREE.Group();
    warehouse.position.set(x, y, z);
    warehouse.rotation.y = rotation;

    // 1. Slab
    const slabGeo = new THREE.BoxGeometry(20, 0.8, 14);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.9, metalness: 0.2 });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.y = 0.4;
    warehouse.add(slab);

    // 2. Corrugated Industrial Walls
    const wallGeo = new THREE.BoxGeometry(19, 6.5, 13);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.6 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = 4.0;
    walls.castShadow = true;
    warehouse.add(walls);

    // 3. Arched / Pitched Roof
    const roofGeo = new THREE.CylinderGeometry(7, 7, 19.4, 8, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.rotateX(Math.PI / 2);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 7.2, 0);
    roof.castShadow = true;
    warehouse.add(roof);

    // 4. Large cargo bay door opening visual
    const bayDoorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.8 });
    const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 0.4), bayDoorMat);
    bayDoor.position.set(0, 3.2, 6.6);
    warehouse.add(bayDoor);

    this.collisionBoxes.push({
      min: new THREE.Vector3(x - 9.8, y, z - 6.8),
      max: new THREE.Vector3(x + 9.8, y + 10, z + 6.8),
    });

    this.lootSpawnPoints.push(
      new THREE.Vector3(x - 5, y + 1.0, z - 2),
      new THREE.Vector3(x + 5, y + 1.0, z + 2),
      new THREE.Vector3(x, y + 1.0, z),
      new THREE.Vector3(x + 7, y + 1.0, z - 4)
    );

    this.group.add(warehouse);
    return warehouse;
  }

  // --- PROCEDURAL WATCHTOWER / SNIPER TOWER ---
  public createWatchtower(x: number, z: number): THREE.Group {
    const y = this.terrain.getHeight(x, z);
    const tower = new THREE.Group();
    tower.position.set(x, y, z);

    // 4 Metal leg stilts
    const legGeo = new THREE.CylinderGeometry(0.2, 0.2, 10, 6);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.35, metalness: 0.8 });
    const legPositions = [
      [-2, -2],
      [2, -2],
      [-2, 2],
      [2, 2],
    ];
    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(lx, 5, lz);
      leg.castShadow = true;
      tower.add(leg);
    });

    // Cross braces
    const braceGeo = new THREE.BoxGeometry(0.1, 0.1, 3);
    const b1 = new THREE.Mesh(braceGeo, metalMat);
    b1.position.set(2, 5, 0);
    const b2 = new THREE.Mesh(braceGeo, metalMat);
    b2.position.set(-2, 5, 0);
    tower.add(b1, b2);

    // Platform
    const platformGeo = new THREE.BoxGeometry(5.4, 0.4, 5.4);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8, metalness: 0.1 });
    const platform = new THREE.Mesh(platformGeo, woodMat);
    platform.position.y = 10;
    platform.receiveShadow = true;
    tower.add(platform);

    // Railing
    const railMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.6 });
    const railGeo = new THREE.BoxGeometry(5.4, 1.2, 0.2);
    const r1 = new THREE.Mesh(railGeo, railMat);
    r1.position.set(0, 10.6, 2.6);
    const r2 = new THREE.Mesh(railGeo, railMat);
    r2.position.set(0, 10.6, -2.6);
    tower.add(r1, r2);

    // Roof
    const roofGeo = new THREE.ConeGeometry(4.2, 1.8, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, metalMat);
    roof.position.y = 13.5;
    tower.add(roof);

    this.collisionBoxes.push({
      min: new THREE.Vector3(x - 2.5, y, z - 2.5),
      max: new THREE.Vector3(x + 2.5, y + 14, z + 2.5),
    });

    // High sniper loot point!
    this.lootSpawnPoints.push(
      new THREE.Vector3(x, y + 10.6, z),
      new THREE.Vector3(x + 1.2, y + 10.6, z - 1.2)
    );

    this.group.add(tower);
    return tower;
  }

  // --- PROCEDURAL MILITARY BUNKER / DEFENSE SHED ---
  public createBunker(x: number, z: number, rotation: number = 0): THREE.Group {
    const y = this.terrain.getHeight(x, z);
    const bunker = new THREE.Group();
    bunker.position.set(x, y, z);
    bunker.rotation.y = rotation;

    // Concrete heavy walls with slit
    const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.85, metalness: 0.2 });
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 6), bunkerMat);
    mainBody.position.y = 1.6;
    mainBody.castShadow = true;
    bunker.add(mainBody);

    // Sandbags around entrance
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xd4b982, roughness: 0.9, metalness: 0.05 });
    const sandbag = new THREE.Mesh(new THREE.BoxGeometry(4, 0.9, 1.2), sandbagMat);
    sandbag.position.set(0, 0.45, 3.4);
    bunker.add(sandbag);

    // Camo net / roof
    const camoRoof = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.4, 6.6),
      new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9, metalness: 0.1 })
    );
    camoRoof.position.y = 3.4;
    bunker.add(camoRoof);

    this.collisionBoxes.push({
      min: new THREE.Vector3(x - 4.3, y, z - 3.3),
      max: new THREE.Vector3(x + 4.3, y + 4.0, z + 3.3),
    });

    this.lootSpawnPoints.push(
      new THREE.Vector3(x - 1.5, y + 1.0, z),
      new THREE.Vector3(x + 1.5, y + 1.0, z)
    );

    this.group.add(bunker);
    return bunker;
  }

  // --- ASSEMBLE ALL COMPOUNDS ACROSS THE ISLAND ---
  private buildMapCompounds() {
    // 1. Clock Village (Central Town, high-tier loot hotspot)
    const villagePos = new THREE.Vector3(0, this.terrain.getHeight(0, 0), 0);
    this.compounds.push({ name: 'Clock Village', position: villagePos });
    this.createTwoStoryHouse(-18, -12, 0);
    this.createTwoStoryHouse(18, -10, Math.PI / 2);
    this.createTwoStoryHouse(-12, 22, -Math.PI / 4);
    this.createTwoStoryHouse(15, 20, Math.PI / 3);
    this.createWarehouse(0, -32, 0);
    this.createWatchtower(0, 36);

    // 2. Military Base (Southwest fortress)
    const milPos = new THREE.Vector3(-110, this.terrain.getHeight(-110, 80), 80);
    this.compounds.push({ name: 'Military Base', position: milPos });
    this.createWarehouse(-110, 70, Math.PI / 2);
    this.createWarehouse(-130, 85, 0);
    this.createBunker(-90, 85, Math.PI / 4);
    this.createBunker(-110, 105, 0);
    this.createWatchtower(-135, 60);
    this.createWatchtower(-85, 105);

    // 3. Lake Resort (East Compound near water)
    const lakePos = new THREE.Vector3(80, this.terrain.getHeight(80, -25), -25);
    this.compounds.push({ name: 'Lake Resort', position: lakePos });
    this.createTwoStoryHouse(75, -15, -Math.PI / 6);
    this.createTwoStoryHouse(95, -35, Math.PI / 4);
    this.createTwoStoryHouse(70, -45, 0);
    this.createWatchtower(98, -15);

    // 4. Ridge Outpost (Northeast Mountain Peak)
    const ridgePos = new THREE.Vector3(90, this.terrain.getHeight(90, 80), 80);
    this.compounds.push({ name: 'Ridge Outpost', position: ridgePos });
    this.createBunker(90, 75, 0);
    this.createTwoStoryHouse(105, 85, -Math.PI / 3);
    this.createWatchtower(80, 90);

    // 5. Shipment Yard (Northwest Coast)
    const shipPos = new THREE.Vector3(-80, this.terrain.getHeight(-80, -80), -80);
    this.compounds.push({ name: 'Shipment Yard', position: shipPos });
    this.createWarehouse(-80, -75, 0);
    this.createWarehouse(-60, -90, Math.PI / 2);
    this.createTwoStoryHouse(-100, -80, Math.PI / 5);
    this.createWatchtower(-65, -65);

    // 6. South Bay Compounds (South Shore)
    const southPos = new THREE.Vector3(0, this.terrain.getHeight(0, 120), 120);
    this.compounds.push({ name: 'South Bay', position: southPos });
    this.createTwoStoryHouse(-20, 120, 0);
    this.createTwoStoryHouse(20, 125, Math.PI / 2);
    this.createBunker(0, 140, 0);
  }

  // Quick bounding box check for player & bot physics
  public checkCollision(pos: THREE.Vector3, radius: number = 0.5): boolean {
    for (const box of this.collisionBoxes) {
      if (
        pos.x + radius > box.min.x &&
        pos.x - radius < box.max.x &&
        pos.z + radius > box.min.z &&
        pos.z - radius < box.max.z &&
        pos.y > box.min.y &&
        pos.y < box.max.y
      ) {
        return true;
      }
    }
    return false;
  }
}
