/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { Crosshair, Shield, Activity, RefreshCw, ArrowUp, Disc, Eye } from 'lucide-react';

interface MobileControlsProps {
  engine: GameEngine | null;
  onJump: () => void;
  onCrouch: () => void;
  onReload: () => void;
  onADS: () => void;
  onHeal: () => void;
  onPickupFirstNearby: () => void;
  isADS: boolean;
  hasNearbyLoot: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  engine,
  onJump,
  onCrouch,
  onReload,
  onADS,
  onHeal,
  onPickupFirstNearby,
  isADS,
  hasNearbyLoot,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const joystickTouchIdRef = useRef<number | null>(null);

  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number } | null>(null);

  // --- TOUCH HANDLERS FOR LEFT JOYSTICK ---
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    setIsJoystickActive(true);
    updateJoystickPos(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        updateJoystickPos(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setIsJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        if (engine) {
          engine.moveInput = { x: 0, y: 0 };
        }
        break;
      }
    }
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current || !engine) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2 - 10;
    const dist = Math.hypot(dx, dy);

    let normX = dx;
    let normY = dy;
    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: normX, y: normY });
    // Normalize input between -1 and 1
    engine.moveInput = {
      x: normX / maxRadius,
      y: normY / maxRadius,
    };
  };

  // --- TOUCH HANDLERS FOR RIGHT-SIDE AIM DRAG ---
  const handleLookTouchStart = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    // Check if right half of screen
    if (touch.clientX > window.innerWidth * 0.4) {
      lookTouchIdRef.current = touch.identifier;
      lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current && lastLookPosRef.current && engine) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        const sens = 0.005;
        engine.player.yaw -= dx * sens;
        engine.player.pitch = Math.max(-1.3, Math.min(1.3, engine.player.pitch - dy * sens));
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        lastLookPosRef.current = null;
        break;
      }
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none z-30"
      onTouchStart={handleLookTouchStart}
      onTouchMove={handleLookTouchMove}
      onTouchEnd={handleLookTouchEnd}
      onTouchCancel={handleLookTouchEnd}
    >
      {/* Left Virtual Joystick */}
      <div className="absolute bottom-6 left-6 pointer-events-auto">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          className="relative w-36 h-36 rounded-full bg-slate-900/60 border-2 border-white/30 flex items-center justify-center touch-none shadow-xl"
        >
          <div
            className="w-16 h-16 rounded-full bg-amber-500/80 border border-white/50 shadow-md transition-transform duration-75 flex items-center justify-center"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-5 h-5 rounded-full bg-white/60"></div>
          </div>
        </div>
      </div>

      {/* Right Action Buttons Cluster (Free Fire layout) */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Upper Row: ADS & Reload & Heal */}
        <div className="flex items-center gap-3">
          {hasNearbyLoot && (
            <button
              onClick={onPickupFirstNearby}
              className="w-14 h-14 rounded-full bg-emerald-600/90 text-white font-bold flex flex-col items-center justify-center border-2 border-white/50 shadow-lg active:scale-90"
            >
              <Disc size={18} />
              <span className="text-[9px]">LOOT</span>
            </button>
          )}

          <button
            onClick={onHeal}
            className="w-13 h-13 rounded-full bg-blue-600/80 text-white font-bold flex flex-col items-center justify-center border border-white/40 shadow-lg active:scale-90"
          >
            <Activity size={18} />
            <span className="text-[9px]">HEAL</span>
          </button>

          <button
            onClick={onReload}
            className="w-13 h-13 rounded-full bg-slate-800/80 text-white font-bold flex flex-col items-center justify-center border border-white/40 shadow-lg active:scale-90"
          >
            <RefreshCw size={18} />
            <span className="text-[9px]">RELOAD</span>
          </button>

          <button
            onClick={onADS}
            className={`w-14 h-14 rounded-full font-bold flex flex-col items-center justify-center border-2 shadow-lg active:scale-90 ${
              isADS ? 'bg-amber-500 border-white text-slate-950' : 'bg-slate-900/80 border-white/40 text-white'
            }`}
          >
            <Eye size={20} />
            <span className="text-[9px]">ADS</span>
          </button>
        </div>

        {/* Lower Row: Jump, Crouch, Big Shoot Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCrouch}
            className="w-13 h-13 rounded-full bg-slate-800/80 text-white font-bold flex flex-col items-center justify-center border border-white/40 shadow-lg active:scale-90"
          >
            <span className="text-xs font-black">CROUCH</span>
          </button>

          <button
            onClick={onJump}
            className="w-14 h-14 rounded-full bg-slate-700/80 text-white font-bold flex flex-col items-center justify-center border-2 border-white/40 shadow-lg active:scale-90"
          >
            <ArrowUp size={20} />
            <span className="text-[9px]">JUMP</span>
          </button>

          {/* Big Red Shoot Button */}
          <button
            onTouchStart={() => {
              if (engine) engine.isMouseDown = true;
            }}
            onTouchEnd={() => {
              if (engine) engine.isMouseDown = false;
            }}
            onMouseDown={() => {
              if (engine) engine.isMouseDown = true;
            }}
            onMouseUp={() => {
              if (engine) engine.isMouseDown = false;
            }}
            className="w-20 h-20 rounded-full bg-red-600/90 text-white font-black flex flex-col items-center justify-center border-4 border-white/80 shadow-2xl active:scale-95 active:bg-red-700"
          >
            <Crosshair size={26} />
            <span className="text-[10px] tracking-wider">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
