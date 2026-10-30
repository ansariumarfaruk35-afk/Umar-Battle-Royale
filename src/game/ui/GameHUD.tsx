/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GamePhase, KillFeedEntry, LootItem, WeaponData } from '../core/GameTypes';
import { Minimap } from './Minimap';
import { RARITY_COLORS } from '../weapons/WeaponConfig';
import { Shield, Skull, Crosshair, AlertTriangle, Disc, Heart, Zap, Bomb, Eye, Menu } from 'lucide-react';

interface GameHUDProps {
  engine: GameEngine | null;
  phase: GamePhase;
  health: number;
  maxHealth: number;
  armorDurability: number;
  maxArmorDurability: number;
  armorLevel: number;
  ammoInClip: number;
  ammoReserve: number;
  activeWeapon: WeaponData | null;
  playersAlive: number;
  kills: number;
  stormPhase: number;
  stormTimeRemaining: number;
  isStormShrinking: boolean;
  isOutsideZone: boolean;
  killFeed: KillFeedEntry[];
  nearbyLoot: { id: string; item: LootItem }[];
  showHitMarker: boolean;
  hitMarkerHeadshot: boolean;
  isDamageFlashing: boolean;
  onOpenFullMap: () => void;
  onOpenInventory: () => void;
  onPickupLoot: (lootId: string) => void;
  onUseMed: (type: 'medkit' | 'bandage' | 'energyDrink') => void;
  onThrowGrenade: () => void;
  onPlaneJump: () => void;
  onDeployParachute: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  engine,
  phase,
  health,
  maxHealth,
  armorDurability,
  maxArmorDurability,
  armorLevel,
  ammoInClip,
  ammoReserve,
  activeWeapon,
  playersAlive,
  kills,
  stormPhase,
  stormTimeRemaining,
  isStormShrinking,
  isOutsideZone,
  killFeed,
  nearbyLoot,
  showHitMarker,
  hitMarkerHeadshot,
  isDamageFlashing,
  onOpenFullMap,
  onOpenInventory,
  onPickupLoot,
  onUseMed,
  onThrowGrenade,
  onPlaneJump,
  onDeployParachute,
  onPause,
}) => {
  const healthPercent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const armorPercent = maxArmorDurability > 0 ? Math.max(0, Math.min(100, (armorDurability / maxArmorDurability) * 100)) : 0;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden font-sans">
      {/* Damage Screen Edge Flash */}
      {isDamageFlashing && (
        <div className="absolute inset-0 border-8 border-red-600/70 pointer-events-none transition-opacity duration-150 animate-pulse" />
      )}

      {/* Outside Safe Zone Storm Vignette */}
      {isOutsideZone && (
        <div className="absolute inset-0 bg-radial from-transparent via-purple-900/20 to-red-900/40 pointer-events-none" />
      )}

      {/* --- TOP BAR: PLAYERS ALIVE, STORM TIMER, MINIMAP, KILL FEED --- */}
      <div className="absolute top-3 left-4 right-4 flex items-start justify-between">
        {/* Left: Alive count & Kills badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-lg">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono font-black text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>ALIVE</span>
              <span className="text-white text-base tabular-nums">{playersAlive}</span>
              <span className="text-zinc-500">/ 31</span>
            </div>
            <div className="h-4 w-px bg-slate-700"></div>
            <div className="flex items-center gap-1 text-red-400 font-mono font-bold text-sm">
              <Skull size={15} />
              <span className="text-white text-base tabular-nums">{kills}</span>
            </div>
          </div>

          <button
            onClick={onPause}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-zinc-300 hover:text-white hover:bg-slate-800 transition shadow"
            title="Menu / Settings [Esc]"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Center: Storm Warning Banner */}
        <div className="flex flex-col items-center">
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-lg font-mono font-bold text-xs uppercase ${
              isOutsideZone
                ? 'bg-red-600/90 border-white text-white animate-bounce'
                : isStormShrinking
                ? 'bg-purple-900/80 border-purple-400 text-purple-200'
                : 'bg-slate-900/80 border-slate-700 text-zinc-300'
            }`}
          >
            {isOutsideZone ? (
              <>
                <AlertTriangle size={15} className="text-yellow-300" />
                <span>OUTSIDE SAFE ZONE - TAKE COVER!</span>
              </>
            ) : isStormShrinking ? (
              <>
                <Zap size={14} className="text-purple-400" />
                <span>ZONE SHRINKING PHASE {stormPhase}</span>
              </>
            ) : (
              <>
                <Shield size={14} className="text-sky-400" />
                <span>ZONE {stormPhase} IN: </span>
                <span className="text-amber-400 tabular-nums">
                  {Math.floor(stormTimeRemaining / 60)}:
                  {(stormTimeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Minimap & Killfeed */}
        <div className="flex flex-col items-end gap-2">
          <Minimap engine={engine} onOpenFullMap={onOpenFullMap} />

          {/* Killfeed Notifications */}
          <div className="flex flex-col gap-1 items-end max-w-xs mt-1">
            {killFeed.slice(-3).map(entry => (
              <div
                key={entry.id}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono shadow-md border ${
                  entry.isPlayerKiller
                    ? 'bg-amber-950/90 border-amber-500 text-amber-200 font-bold'
                    : entry.isPlayerVictim
                    ? 'bg-red-950/90 border-red-500 text-red-200 font-bold'
                    : 'bg-slate-900/80 border-slate-700/60 text-zinc-300'
                }`}
              >
                <span className={entry.isPlayerKiller ? 'text-amber-400 font-bold' : 'text-zinc-200'}>
                  {entry.killerName}
                </span>
                <span className="text-zinc-400 text-[10px]">[{entry.weaponName}]</span>
                {entry.isHeadshot && <span className="text-red-400 text-[10px]">🎯</span>}
                <span className={entry.isPlayerVictim ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                  {entry.victimName}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- FLIGHT / SKYDIVE / DROP PROMPT --- */}
      {phase === 'PLANE' && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto">
          <div className="bg-black/80 border-2 border-amber-400 px-6 py-3 rounded-xl text-center shadow-2xl">
            <div className="text-amber-400 font-mono font-black text-lg tracking-wider">
              CARGO PLANE FLYING OVER ISLAND
            </div>
            <div className="text-zinc-300 text-xs mt-1">Choose your landing spot on the minimap</div>
          </div>
          <button
            onClick={onPlaneJump}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black tracking-wider text-base rounded-xl shadow-2xl border-2 border-white active:scale-95 transition"
          >
            JUMP FROM PLANE [SPACE]
          </button>
        </div>
      )}

      {phase === 'DIVING' && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-auto">
          <div className="bg-black/80 border border-sky-400 px-5 py-2.5 rounded-lg text-center shadow-xl">
            <div className="text-sky-400 font-mono font-bold text-sm">FREEFALLING - STEER WITH WASD</div>
            <div className="text-zinc-400 text-[11px]">Parachute auto-deploys near ground</div>
          </div>
          <button
            onClick={onDeployParachute}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm rounded-lg shadow-xl border border-white active:scale-95 transition"
          >
            OPEN PARACHUTE [SPACE]
          </button>
        </div>
      )}

      {/* --- CENTER PLAYFIELD: DYNAMIC CROSSHAIR & HITMARKER --- */}
      {phase === 'PLAYING' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dynamic Crosshair */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Center dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm"></div>
            {/* Cross ticks */}
            <div className="absolute top-0 w-0.5 h-2 bg-white/80 shadow"></div>
            <div className="absolute bottom-0 w-0.5 h-2 bg-white/80 shadow"></div>
            <div className="absolute left-0 w-2 h-0.5 bg-white/80 shadow"></div>
            <div className="absolute right-0 w-2 h-0.5 bg-white/80 shadow"></div>

            {/* Hit Marker X */}
            {showHitMarker && (
              <div
                className={`absolute w-7 h-7 flex items-center justify-center transition-transform scale-125 duration-75 ${
                  hitMarkerHeadshot ? 'text-red-500' : 'text-amber-400'
                }`}
              >
                <div className="absolute w-4 h-0.5 bg-current rotate-45"></div>
                <div className="absolute w-4 h-0.5 bg-current -rotate-45"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- RIGHT MID: NEARBY LOOT QUICK PICKUP LIST --- */}
      {phase === 'PLAYING' && nearbyLoot.length > 0 && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 max-w-xs pointer-events-auto">
          <span className="text-[10px] font-mono font-bold text-amber-400 tracking-wider uppercase bg-black/60 px-2 py-0.5 rounded self-start">
            NEARBY GROUND LOOT [E]
          </span>
          {nearbyLoot.slice(0, 4).map(l => (
            <button
              key={l.id}
              onClick={() => onPickupLoot(l.id)}
              className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 border rounded-lg shadow-lg text-left transition group active:scale-95"
              style={{ borderColor: RARITY_COLORS[l.item.rarity] }}
            >
              <div className="flex items-center gap-2">
                <Disc size={15} style={{ color: RARITY_COLORS[l.item.rarity] }} />
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    {l.item.name}
                  </div>
                  <div className="text-[10px] text-zinc-400">{l.item.category.toUpperCase()}</div>
                </div>
              </div>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-400 font-mono font-bold">
                PICK [E]
              </span>
            </button>
          ))}
        </div>
      )}

      {/* --- BOTTOM SECTION: HEALTH & ARMOR BARS, WEAPON SLOTS, AMMO READOUT --- */}
      <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between pointer-events-none">
        {/* Left: Health and Armor Bars */}
        <div className="flex flex-col gap-1.5 pointer-events-auto max-w-xs w-full">
          {/* Armor Bar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sky-400 font-mono text-xs font-bold w-16">
              <Shield size={14} />
              <span>LV{armorLevel}</span>
            </div>
            <div className="flex-1 h-2.5 bg-slate-900/80 rounded-full border border-slate-700 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-200"
                style={{ width: `${armorPercent}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-mono text-sky-300 tabular-nums w-8 text-right">
              {Math.round(armorDurability)}
            </span>
          </div>

          {/* Health Bar */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-emerald-400 font-mono text-xs font-bold w-16">
              <Heart size={14} />
              <span>HP</span>
            </div>
            <div className="flex-1 h-3.5 bg-slate-900/80 rounded-full border border-slate-700 overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-200 ${
                  healthPercent > 40
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                    : 'bg-gradient-to-r from-red-600 to-orange-500 animate-pulse'
                }`}
                style={{ width: `${healthPercent}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono font-bold text-white tabular-nums w-8 text-right">
              {Math.round(health)}
            </span>
          </div>

          {/* Quick Med Shortcuts */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => onUseMed('medkit')}
              className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700 hover:border-emerald-400 text-[11px] font-mono text-zinc-300 hover:text-white transition shadow"
              title="Use Medkit (4)"
            >
              [4] Medkit
            </button>
            <button
              onClick={() => onUseMed('energyDrink')}
              className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700 hover:border-amber-400 text-[11px] font-mono text-zinc-300 hover:text-white transition shadow"
              title="Energy Drink (5)"
            >
              [5] Drink
            </button>
            <button
              onClick={onThrowGrenade}
              className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700 hover:border-red-400 text-[11px] font-mono text-zinc-300 hover:text-white transition shadow flex items-center gap-1"
              title="Throw Grenade (G)"
            >
              <Bomb size={12} className="text-red-400" />
              <span>[G] Nade</span>
            </button>
            <button
              onClick={onOpenInventory}
              className="px-2 py-1 rounded bg-slate-900/80 border border-slate-700 hover:border-white text-[11px] font-mono text-zinc-300 hover:text-white transition shadow"
              title="Inventory [Tab]"
            >
              [Tab] Bag
            </button>
          </div>
        </div>

        {/* Center: Weapon Slots (1, 2, 3) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {engine && (
            <>
              {/* Primary 1 */}
              <button
                onClick={() => engine.player.switchWeapon('primary1')}
                className={`px-3 py-2 rounded-lg border font-mono text-left transition shadow-lg ${
                  engine.player.inventory.activeSlot === 'primary1'
                    ? 'border-amber-400 bg-slate-900/90 ring-1 ring-amber-400'
                    : 'border-slate-700 bg-slate-900/60 opacity-75'
                }`}
              >
                <div className="text-[10px] text-zinc-400 font-bold">[1] PRIMARY</div>
                <div
                  className="text-xs font-black truncate max-w-[90px]"
                  style={{
                    color: engine.player.inventory.primary1
                      ? RARITY_COLORS[engine.player.inventory.primary1.weapon.rarity]
                      : '#94a3b8',
                  }}
                >
                  {engine.player.inventory.primary1 ? engine.player.inventory.primary1.weapon.name : 'Empty'}
                </div>
              </button>

              {/* Primary 2 */}
              <button
                onClick={() => engine.player.switchWeapon('primary2')}
                className={`px-3 py-2 rounded-lg border font-mono text-left transition shadow-lg ${
                  engine.player.inventory.activeSlot === 'primary2'
                    ? 'border-amber-400 bg-slate-900/90 ring-1 ring-amber-400'
                    : 'border-slate-700 bg-slate-900/60 opacity-75'
                }`}
              >
                <div className="text-[10px] text-zinc-400 font-bold">[2] SECONDARY</div>
                <div
                  className="text-xs font-black truncate max-w-[90px]"
                  style={{
                    color: engine.player.inventory.primary2
                      ? RARITY_COLORS[engine.player.inventory.primary2.weapon.rarity]
                      : '#94a3b8',
                  }}
                >
                  {engine.player.inventory.primary2 ? engine.player.inventory.primary2.weapon.name : 'Empty'}
                </div>
              </button>

              {/* Pistol */}
              <button
                onClick={() => engine.player.switchWeapon('pistol')}
                className={`px-3 py-2 rounded-lg border font-mono text-left transition shadow-lg ${
                  engine.player.inventory.activeSlot === 'pistol'
                    ? 'border-amber-400 bg-slate-900/90 ring-1 ring-amber-400'
                    : 'border-slate-700 bg-slate-900/60 opacity-75'
                }`}
              >
                <div className="text-[10px] text-zinc-400 font-bold">[3] SIDEARM</div>
                <div
                  className="text-xs font-black truncate max-w-[80px]"
                  style={{
                    color: engine.player.inventory.pistol
                      ? RARITY_COLORS[engine.player.inventory.pistol.weapon.rarity]
                      : '#94a3b8',
                  }}
                >
                  {engine.player.inventory.pistol ? engine.player.inventory.pistol.weapon.name : 'Empty'}
                </div>
              </button>
            </>
          )}
        </div>

        {/* Right: Active Ammo Display */}
        <div className="flex flex-col items-end pointer-events-auto">
          {activeWeapon && (
            <div className="bg-slate-900/85 border border-slate-700/80 px-4 py-2.5 rounded-xl shadow-2xl flex flex-col items-end font-mono">
              <span className="text-[10px] text-zinc-400 tracking-wider uppercase font-bold">
                {activeWeapon.ammoType}
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl font-black text-amber-400 tabular-nums">{ammoInClip}</span>
                <span className="text-zinc-500 text-lg font-bold">/</span>
                <span className="text-sm font-bold text-zinc-300 tabular-nums">{ammoReserve}</span>
              </div>
              <span className="text-[10px] text-zinc-400 mt-0.5">[R] Reload</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
