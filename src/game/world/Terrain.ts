/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export class Terrain {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public size: number = 550; // map width/depth
  public segments: number = 140; // vertex resolution
  public maxElevation: number = 32;

  constructor() {
    const { mesh, waterMesh } = this.buildTerrain();
    this.mesh = mesh;
    this.waterMesh = waterMesh;
  }

  // Analytical height function for collision and actor grounding
  public getHeight(x: number, z: number): number {
    const distFromCenter = Math.hypot(x, z);

    // Island falloff to sea level
    const maxRadius = 230;
    if (distFromCenter > maxRadius) {
      const oceanDrop = (distFromCenter - maxRadius) * 0.4;
      return -5 - oceanDrop;
    }

    const falloff = Math.cos((distFromCenter / maxRadius) * (Math.PI / 2));
    const islandMask = Math.pow(Math.max(0, falloff), 0.85);

    // Lake depression around (x: 40, z: -30)
    const lakeDist = Math.hypot(x - 40, z + 30);
    let lakeDepth = 0;
    if (lakeDist < 50) {
      lakeDepth = (1 - lakeDist / 50) * 12;
    }

    // Compound hills and ridges using analytical octaves
    const h1 = Math.sin(x * 0.015) * Math.cos(z * 0.015) * 12;
    const h2 = Math.sin(x * 0.035 + 1.2) * Math.cos(z * 0.03 + 0.8) * 6;
    const h3 = Math.cos(x * 0.07 - z * 0.05) * 2.5;

    // Mountain ridge in northeast
    const ridgeDist = Math.hypot(x - 90, z - 90);
    const mountainPeak = Math.max(0, 1 - ridgeDist / 90) * 20;

    // Military high ground in southwest
    const swRidge = Math.max(0, 1 - Math.hypot(x + 110, z - 80) / 80) * 15;

    const rawHeight = (h1 + h2 + h3 + mountainPeak + swRidge + 6) * islandMask - lakeDepth;
    return rawHeight;
  }

  private buildTerrain(): { mesh: THREE.Mesh; waterMesh: THREE.Mesh } {
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getHeight(x, z);
      pos.setY(i, y);
    }
    geo.computeVertexNormals();

    // Procedural terrain texture via HTML5 canvas
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base grass fill
    ctx.fillStyle = '#486834';
    ctx.fillRect(0, 0, 1024, 1024);

    // Grass color variation
    for (let i = 0; i < 400; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 1024;
      const r = 15 + Math.random() * 35;
      ctx.fillStyle = Math.random() > 0.5 ? '#3b582a' : '#57793d';
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dirt trails and compound roads
    ctx.strokeStyle = '#856f4d';
    ctx.lineWidth = 14;
    ctx.beginPath();
    // Central crossroad
    ctx.moveTo(120, 512);
    ctx.bezierCurveTo(350, 480, 680, 540, 900, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(512, 100);
    ctx.bezierCurveTo(490, 360, 530, 720, 512, 920);
    ctx.stroke();

    // Secondary connector path around lake
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(600, 430, 140, 0, Math.PI * 2);
    ctx.stroke();

    // Coastal sand fringe
    const grad = ctx.createRadialGradient(512, 512, 380, 512, 512, 510);
    grad.addColorStop(0, 'rgba(217, 190, 142, 0)');
    grad.addColorStop(0.7, 'rgba(217, 190, 142, 0.4)');
    grad.addColorStop(1, '#cbb279');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    const terrainTexture = new THREE.CanvasTexture(canvas);
    terrainTexture.wrapS = THREE.RepeatWrapping;
    terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(4, 4);
    terrainTexture.colorSpace = THREE.SRGBColorSpace;

    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true, // Stylized Free Fire low-poly aesthetic!
    });

    const mesh = new THREE.Mesh(geo, terrainMat);
    mesh.receiveShadow = true;

    // Ocean & Lake Water Plane
    const waterGeo = new THREE.PlaneGeometry(this.size * 1.6, this.size * 1.6);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1e88e5,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.5; // Sea level
    waterMesh.receiveShadow = true;

    return { mesh, waterMesh };
  }
}
