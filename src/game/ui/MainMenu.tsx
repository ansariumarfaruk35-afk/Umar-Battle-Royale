/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CharacterCustomization, GameSettings } from '../core/GameTypes';
import { Play, Settings, User, BookOpen, Volume2, Shield, Crosshair, Award } from 'lucide-react';

interface MainMenuProps {
  onStartGame: () => void;
  customization: CharacterCustomization;
  onUpdateCustomization: (c: CharacterCustomization) => void;
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  customization,
  onUpdateCustomization,
  settings,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'play' | 'profile' | 'settings' | 'guide'>('play');

  const outfits = [
    { id: 'camo', name: 'Camo Elite', color: '#4d7c0f' },
    { id: 'cyber', name: 'Cyber Strike', color: '#0284c7' },
    { id: 'desert', name: 'Desert Warrior', color: '#b45309' },
    { id: 'arctic', name: 'Arctic Frost', color: '#e2e8f0' },
    { id: 'neon', name: 'Neon Shadow', color: '#d946ef' },
  ];

  const skinTones = [
    { id: 'light', name: 'Fair', color: '#fcd34d' },
    { id: 'tan', name: 'Tan', color: '#d97706' },
    { id: 'bronze', name: 'Bronze', color: '#92400e' },
    { id: 'dark', name: 'Dark', color: '#78350f' },
  ];

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-between p-6 bg-radial from-slate-900/90 via-slate-950/95 to-black text-white select-none overflow-y-auto font-sans">
      {/* Top Header & Navigation Tabs */}
      <div className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg">
            U
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-red-500">
              UMAR BATTLE ROYALE
            </h1>
            <span className="text-[10px] text-zinc-400 font-mono tracking-widest block uppercase">
              NEXT-GEN 3D SURVIVAL SHOOTER • SOLO 1 VS 30
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveTab('play')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              activeTab === 'play' ? 'bg-amber-500 text-slate-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Play size={14} />
            <span>PLAY</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              activeTab === 'profile' ? 'bg-amber-500 text-slate-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User size={14} />
            <span>CUSTOMIZE</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              activeTab === 'settings' ? 'bg-amber-500 text-slate-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Settings size={14} />
            <span>SETTINGS</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
              activeTab === 'guide' ? 'bg-amber-500 text-slate-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <BookOpen size={14} />
            <span>CONTROLS</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="w-full max-w-2xl my-auto py-6">
        {activeTab === 'play' && (
          <div className="flex flex-col items-center text-center">
            {/* Hero Emblem Lockup */}
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-orange-600/30 to-red-600/20 border-2 border-amber-500/50 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                <Crosshair size={64} className="text-amber-400 animate-pulse" />
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-wide uppercase">
                READY TO DROP, <span className="text-amber-400">{customization.name || 'SURVIVOR'}</span>?
              </h2>
              <p className="text-zinc-400 text-sm mt-2 max-w-md mx-auto">
                Parachute into a 550m tropical island, gear up with military weapons and armor, out-shoot 30 tactical AI bots, and conquer the shrinking storm zone!
              </p>
            </div>

            {/* Quick Match Specs */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-md mb-8 font-mono text-center">
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase block">PLAYERS</span>
                <span className="text-lg font-black text-amber-400">1 vs 30</span>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase block">MAP</span>
                <span className="text-lg font-black text-sky-400">ISLAND</span>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase block">DIFFICULTY</span>
                <span className="text-lg font-black text-emerald-400 uppercase">{settings.botDifficulty}</span>
              </div>
            </div>

            {/* BIG PLAY BUTTON */}
            <button
              onClick={onStartGame}
              className="w-full max-w-md py-4 px-8 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:via-orange-400 hover:to-red-500 text-slate-950 font-black text-xl tracking-wider uppercase rounded-2xl shadow-2xl border-2 border-white/80 active:scale-95 transition transform"
            >
              DEPLOY TO ISLAND [SPACE / CLICK]
            </button>
            <span className="text-xs text-zinc-400 font-mono mt-3">
              WASD Move • Mouse Aim • Left Click Shoot • Space Jump
            </span>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 font-mono">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <User size={20} />
              <span>WARRIOR PROFILE & LOADOUT</span>
            </h3>

            {/* Name Input */}
            <div className="mb-5">
              <label className="text-xs text-zinc-400 uppercase font-bold block mb-1.5">
                CODENAME / PLAYER TAG
              </label>
              <input
                type="text"
                value={customization.name}
                onChange={e => onUpdateCustomization({ ...customization, name: e.target.value })}
                maxLength={16}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:border-amber-400 outline-none"
              />
            </div>

            {/* Outfit Selection */}
            <div className="mb-5">
              <label className="text-xs text-zinc-400 uppercase font-bold block mb-2">
                TACTICAL COMBAT OUTFIT
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {outfits.map(o => (
                  <button
                    key={o.id}
                    onClick={() => onUpdateCustomization({ ...customization, outfit: o.id as any })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition ${
                      customization.outfit === o.id
                        ? 'border-amber-400 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full border border-white/30" style={{ backgroundColor: o.color }}></span>
                    <span className="text-xs font-bold">{o.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Skin Tone */}
            <div>
              <label className="text-xs text-zinc-400 uppercase font-bold block mb-2">
                SKIN TONE
              </label>
              <div className="grid grid-cols-4 gap-2.5">
                {skinTones.map(st => (
                  <button
                    key={st.id}
                    onClick={() => onUpdateCustomization({ ...customization, skinTone: st.id as any })}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                      customization.skinTone === st.id
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-950'
                    }`}
                  >
                    <span className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: st.color }}></span>
                    <span className="text-[10px] text-zinc-300 font-bold">{st.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 font-mono">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <Settings size={20} />
              <span>GAMEPLAY & GRAPHICS SETTINGS</span>
            </h3>

            {/* Graphics Quality */}
            <div className="mb-5">
              <label className="text-xs text-zinc-400 uppercase font-bold block mb-2">
                GRAPHICS QUALITY (FPS TARGET)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['low', 'medium', 'high'] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => onUpdateSettings({ ...settings, graphicsQuality: q })}
                    className={`py-2 px-4 rounded-xl border text-xs font-bold uppercase transition ${
                      settings.graphicsQuality === q
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {q} {q === 'high' ? '(Shadows)' : q === 'low' ? '(60+ FPS)' : '(Balanced)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bot Difficulty */}
            <div className="mb-5">
              <label className="text-xs text-zinc-400 uppercase font-bold block mb-2">
                BOT AI DIFFICULTY
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(['easy', 'medium', 'hard'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => onUpdateSettings({ ...settings, botDifficulty: diff })}
                    className={`py-2 px-4 rounded-xl border text-xs font-bold uppercase transition ${
                      settings.botDifficulty === diff
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Aim Sensitivity Slider */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-zinc-400 mb-1">
                <span className="uppercase font-bold">LOOK SENSITIVITY</span>
                <span className="text-amber-400">{Math.round(settings.sensitivity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={settings.sensitivity}
                onChange={e => onUpdateSettings({ ...settings, sensitivity: parseFloat(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>

            {/* Sound Volumes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>SFX VOLUME</span>
                  <span className="text-amber-400">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={e => onUpdateSettings({ ...settings, sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>MUSIC VOLUME</span>
                  <span className="text-amber-400">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={e => onUpdateSettings({ ...settings, musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 font-mono text-xs">
            <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <BookOpen size={20} />
              <span>CONTROLS & SURVIVAL MANUAL</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-amber-400 font-bold block mb-2 uppercase">DESKTOP CONTROLS</span>
                <ul className="space-y-1 text-zinc-300">
                  <li><span className="text-white font-bold">W, A, S, D</span> — Move & Strafe</li>
                  <li><span className="text-white font-bold">Shift</span> — Sprint</li>
                  <li><span className="text-white font-bold">Mouse Look</span> — Aim (Click to lock)</li>
                  <li><span className="text-white font-bold">Left Click</span> — Shoot</li>
                  <li><span className="text-white font-bold">Right Click</span> — Aim Down Sights (ADS)</li>
                  <li><span className="text-white font-bold">Space</span> — Jump / Drop / Chute</li>
                  <li><span className="text-white font-bold">C</span> — Crouch (tighter spread)</li>
                  <li><span className="text-white font-bold">R</span> — Reload</li>
                  <li><span className="text-white font-bold">E</span> — Pickup ground loot</li>
                  <li><span className="text-white font-bold">1 / 2 / 3</span> — Switch Weapons</li>
                  <li><span className="text-white font-bold">4 / 5</span> — Medkit / Energy Drink</li>
                  <li><span className="text-white font-bold">G</span> — Frag Grenade</li>
                  <li><span className="text-white font-bold">M / Tab</span> — Map / Inventory</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-sky-400 font-bold block mb-2 uppercase">MOBILE CONTROLS</span>
                <ul className="space-y-1 text-zinc-300">
                  <li><span className="text-white font-bold">Left Joystick</span> — 360° Walk / Sprint</li>
                  <li><span className="text-white font-bold">Right Touch</span> — Aim Camera</li>
                  <li><span className="text-white font-bold">Big Red Button</span> — Shoot</li>
                  <li><span className="text-white font-bold">ADS Button</span> — Scope Zoom</li>
                  <li><span className="text-white font-bold">Jump / Crouch</span> — Action buttons</li>
                  <li><span className="text-white font-bold">Heal Button</span> — Quick Med</li>
                  <li><span className="text-white font-bold">Loot Badge</span> — Tap to pickup</li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/40 p-3 rounded-xl text-amber-200">
              <span className="font-bold block mb-1">PRO BATTLE ROYALE TIPS:</span>
              Headshots deal 1.6x–2.8x critical damage. Always pick up Level 3 armor and helmets from death crates. Watch the minimap for enemy gunshot blips and stay inside the shrinking safe circle!
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="w-full max-w-4xl flex items-center justify-between text-xs text-zinc-500 font-mono border-t border-slate-800 pt-3">
        <span>UMAR BATTLE ROYALE • v1.0.0</span>
        <span>WEBGL HIGH-PERFORMANCE 60 FPS ENGINE</span>
      </div>
    </div>
  );
};
