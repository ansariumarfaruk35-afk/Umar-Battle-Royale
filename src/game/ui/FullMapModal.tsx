/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { X } from 'lucide-react';

interface FullMapModalProps {
  engine: GameEngine | null;
  onClose: () => void;
}

export const FullMapModal: React.FC<FullMapModalProps> = ({ engine, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M' || e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let animId = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || !engine) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const mapScale = size / 550; // Map bounds -275 to 275
      const center = size / 2;

      ctx.clearRect(0, 0, size, size);

      // Sea background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, size);

      const worldToMap = (wx: number, wz: number) => ({
        x: center + wx * mapScale,
        y: center + wz * mapScale,
      });

      // 1. Island Terrain Body
      ctx.fillStyle = '#2d4726';
      ctx.beginPath();
      ctx.arc(center, center, 225 * mapScale, 0, Math.PI * 2);
      ctx.fill();

      // Sand shoreline
      ctx.strokeStyle = '#d4b982';
      ctx.lineWidth = 6;
      ctx.stroke();

      // 2. Central Lake
      ctx.fillStyle = '#0284c7';
      const lake = worldToMap(40, -30);
      ctx.beginPath();
      ctx.arc(lake.x, lake.y, 48 * mapScale, 0, Math.PI * 2);
      ctx.fill();

      // 3. Roads / Trails
      ctx.strokeStyle = '#785f37';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(center, center, 140 * mapScale, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Drop Plane Path (Dotted Orange)
      const pStart = worldToMap(engine.planeStartPos.x, engine.planeStartPos.z);
      const pEnd = worldToMap(engine.planeEndPos.x, engine.planeEndPos.z);
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Safe Zone & Storm Rings
      const safe = worldToMap(engine.stormZone.currentCenter.x, engine.stormZone.currentCenter.y);
      const safeR = engine.stormZone.currentRadius * mapScale;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(safe.x, safe.y, safeR, 0, Math.PI * 2);
      ctx.stroke();

      // Next Safe Zone Ring
      const nextSafe = worldToMap(engine.stormZone.nextCenter.x, engine.stormZone.nextCenter.y);
      const nextSafeR = engine.stormZone.nextRadius * mapScale;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(nextSafe.x, nextSafe.y, nextSafeR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 6. Compound Locations & Text Labels
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      for (const comp of engine.structures.compounds) {
        const cpos = worldToMap(comp.position.x, comp.position.z);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(cpos.x - 4, cpos.y - 4, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(comp.name, cpos.x, cpos.y - 8);
      }

      // 7. Player Icon
      const playerPos = worldToMap(engine.player.position.x, engine.player.position.z);
      ctx.save();
      ctx.translate(playerPos.x, playerPos.y);
      ctx.rotate(-engine.player.yaw);

      // Arrowhead
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 9);
      ctx.lineTo(0, 5);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 select-none">
      <div className="relative bg-slate-900 border-2 border-amber-500 rounded-xl p-4 shadow-2xl max-w-2xl w-full flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-3 px-2">
          <h2 className="text-xl font-black text-amber-400 tracking-wider uppercase font-mono">
            ISLAND TACTICAL MAP
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-slate-800 text-zinc-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={560}
          height={560}
          className="rounded-lg border border-slate-700 max-w-full h-auto bg-slate-950 shadow-inner"
        />

        <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs text-zinc-300 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span>You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-sky-400"></span>
            <span>Safe Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-dashed border-white"></span>
            <span>Next Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-orange-500"></span>
            <span>Flight Path</span>
          </div>
        </div>
      </div>
    </div>
  );
};
