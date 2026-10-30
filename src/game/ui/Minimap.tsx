/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';

interface MinimapProps {
  engine: GameEngine | null;
  onOpenFullMap: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({ engine, onOpenFullMap }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !engine) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const mapScale = size / 480; // 480 world units across minimap view

      ctx.clearRect(0, 0, size, size);

      // Save canvas state for circular mask
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, center - 4, 0, Math.PI * 2);
      ctx.clip();

      // Background terrain color
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, size, size);

      const pX = engine.player.position.x;
      const pZ = engine.player.position.z;

      // Coordinate converter: world to minimap coords centered on player
      const worldToMap = (wx: number, wz: number) => {
        return {
          x: center + (wx - pX) * mapScale,
          y: center + (wz - pZ) * mapScale,
        };
      };

      // 1. Draw Island outline / landmass
      ctx.fillStyle = '#334e2c';
      ctx.beginPath();
      const islandCenter = worldToMap(0, 0);
      ctx.arc(islandCenter.x, islandCenter.y, 200 * mapScale, 0, Math.PI * 2);
      ctx.fill();

      // 2. Central Lake
      ctx.fillStyle = '#0284c7';
      const lake = worldToMap(40, -30);
      ctx.beginPath();
      ctx.arc(lake.x, lake.y, 45 * mapScale, 0, Math.PI * 2);
      ctx.fill();

      // 3. Compounds markers
      ctx.fillStyle = '#64748b';
      for (const comp of engine.structures.compounds) {
        const cpos = worldToMap(comp.position.x, comp.position.z);
        ctx.fillRect(cpos.x - 3, cpos.y - 3, 6, 6);
      }

      // 4. Drop Plane Path (dotted line)
      const pStart = worldToMap(engine.planeStartPos.x, engine.planeStartPos.z);
      const pEnd = worldToMap(engine.planeEndPos.x, engine.planeEndPos.z);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Current Storm / Safe Zone Ring
      const safe = worldToMap(engine.stormZone.currentCenter.x, engine.stormZone.currentCenter.y);
      const safeR = engine.stormZone.currentRadius * mapScale;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(safe.x, safe.y, safeR, 0, Math.PI * 2);
      ctx.stroke();

      // 6. Next Shrink Safe Zone Ring (White dashed)
      const nextSafe = worldToMap(engine.stormZone.nextCenter.x, engine.stormZone.nextCenter.y);
      const nextSafeR = engine.stormZone.nextRadius * mapScale;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(nextSafe.x, nextSafe.y, nextSafeR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 7. Enemy Gunfire Radar Audio Blips
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      for (const bot of engine.bots) {
        if (!bot.isDead && bot.fireTimer > 0.05) {
          const bPos = worldToMap(bot.position.x, bot.position.z);
          ctx.beginPath();
          ctx.arc(bPos.x, bPos.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 8. Player Arrow Marker (Center)
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(-engine.player.yaw);

      // Vision cone
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 38, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
      ctx.fill();

      // Sharp arrowhead
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 7);
      ctx.lineTo(0, 4);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore(); // restore clipping

      // Outer bezel ring
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(center, center, center - 2, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Compass Heading calculation in degrees
  const headingDeg = engine
    ? Math.round(((-engine.player.yaw * 180) / Math.PI + 360) % 360)
    : 0;

  const getCompassDirection = (deg: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  return (
    <div className="flex flex-col items-end pointer-events-auto select-none">
      {/* Compass Bar */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-none border border-white/20 rounded-t-md text-xs font-mono font-bold text-white mb-1 shadow-md">
        <span className="text-amber-400">{getCompassDirection(headingDeg)}</span>
        <span className="text-zinc-300 tabular-nums">{headingDeg}°</span>
      </div>

      {/* Minimap Circle Button */}
      <button
        onClick={onOpenFullMap}
        className="relative group p-0.5 rounded-full bg-slate-900 border-2 border-slate-700 hover:border-amber-400 transition-all shadow-xl active:scale-95"
        title="Click to expand Full Map (M)"
      >
        <canvas ref={canvasRef} width={150} height={150} className="rounded-full w-28 h-28 sm:w-36 sm:h-36 block" />
        <span className="absolute bottom-1 right-2 text-[10px] bg-black/80 px-1 rounded text-zinc-300 font-mono">
          MAP [M]
        </span>
      </button>
    </div>
  );
};
