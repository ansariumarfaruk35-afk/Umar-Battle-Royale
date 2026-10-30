/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { PlayerInventory } from '../core/GameTypes';
import { RARITY_COLORS } from '../weapons/WeaponConfig';
import { X, Shield, HardHat, Heart, Crosshair, Box, Trash2 } from 'lucide-react';

interface InventoryModalProps {
  inventory: PlayerInventory;
  onClose: () => void;
  onUseMed: (type: 'medkit' | 'bandage' | 'energyDrink') => void;
  onSelectSlot: (slot: 'primary1' | 'primary2' | 'pistol') => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  onClose,
  onUseMed,
  onSelectSlot,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 select-none">
      <div className="relative bg-slate-900 border-2 border-slate-700 rounded-xl p-5 shadow-2xl max-w-xl w-full text-white font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Box className="text-amber-400" />
            <h2 className="text-lg font-black tracking-wider uppercase">COMBAT BACKPACK [TAB]</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 text-zinc-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Weapons Slots */}
        <div className="mb-4">
          <span className="text-xs uppercase text-zinc-400 font-bold mb-2 block">EQUIPPED WEAPONS</span>
          <div className="grid grid-cols-3 gap-3">
            {/* Primary 1 */}
            <div
              onClick={() => onSelectSlot('primary1')}
              className={`p-3 rounded-lg border cursor-pointer transition ${
                inventory.activeSlot === 'primary1' ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 bg-slate-800/60'
              }`}
            >
              <span className="text-[10px] text-zinc-400 font-bold block mb-1">SLOT 1 [PRIMARY]</span>
              {inventory.primary1 ? (
                <div>
                  <div
                    className="font-bold text-sm"
                    style={{ color: RARITY_COLORS[inventory.primary1.weapon.rarity] }}
                  >
                    {inventory.primary1.weapon.name}
                  </div>
                  <div className="text-xs text-zinc-300 mt-1">
                    {inventory.primary1.ammoInClip} / {inventory.ammo[inventory.primary1.weapon.ammoType]}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic py-2">Empty</div>
              )}
            </div>

            {/* Primary 2 */}
            <div
              onClick={() => onSelectSlot('primary2')}
              className={`p-3 rounded-lg border cursor-pointer transition ${
                inventory.activeSlot === 'primary2' ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 bg-slate-800/60'
              }`}
            >
              <span className="text-[10px] text-zinc-400 font-bold block mb-1">SLOT 2 [PRIMARY]</span>
              {inventory.primary2 ? (
                <div>
                  <div
                    className="font-bold text-sm"
                    style={{ color: RARITY_COLORS[inventory.primary2.weapon.rarity] }}
                  >
                    {inventory.primary2.weapon.name}
                  </div>
                  <div className="text-xs text-zinc-300 mt-1">
                    {inventory.primary2.ammoInClip} / {inventory.ammo[inventory.primary2.weapon.ammoType]}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic py-2">Empty</div>
              )}
            </div>

            {/* Pistol */}
            <div
              onClick={() => onSelectSlot('pistol')}
              className={`p-3 rounded-lg border cursor-pointer transition ${
                inventory.activeSlot === 'pistol' ? 'border-amber-400 bg-amber-500/10' : 'border-slate-700 bg-slate-800/60'
              }`}
            >
              <span className="text-[10px] text-zinc-400 font-bold block mb-1">SLOT 3 [SIDEARM]</span>
              {inventory.pistol ? (
                <div>
                  <div
                    className="font-bold text-sm"
                    style={{ color: RARITY_COLORS[inventory.pistol.weapon.rarity] }}
                  >
                    {inventory.pistol.weapon.name}
                  </div>
                  <div className="text-xs text-zinc-300 mt-1">
                    {inventory.pistol.ammoInClip} / {inventory.ammo[inventory.pistol.weapon.ammoType]}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic py-2">Empty</div>
              )}
            </div>
          </div>
        </div>

        {/* Armor & Helmet Status */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 flex items-center gap-3">
            <Shield className="text-sky-400" size={24} />
            <div>
              <div className="text-xs text-zinc-400">VEST ARMOR</div>
              <div className="font-bold text-sm text-sky-400">
                {inventory.armor ? `Level ${inventory.armor.level} (${Math.round(inventory.armor.durability)}/${inventory.armor.maxDurability})` : 'None'}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 flex items-center gap-3">
            <HardHat className="text-amber-400" size={24} />
            <div>
              <div className="text-xs text-zinc-400">HELMET</div>
              <div className="font-bold text-sm text-amber-400">
                {inventory.helmet ? `Level ${inventory.helmet.level} (${Math.round(inventory.helmet.durability)}/${inventory.helmet.maxDurability})` : 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Medical & Consumables */}
        <div className="mb-4">
          <span className="text-xs uppercase text-zinc-400 font-bold mb-2 block">MEDICAL SUPPLIES</span>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => onUseMed('medkit')}
              disabled={inventory.meds.medkit <= 0}
              className="p-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-emerald-500 disabled:opacity-40 transition text-left"
            >
              <div className="text-emerald-400 font-bold text-xs">MEDKIT</div>
              <div className="text-sm font-black mt-1">{inventory.meds.medkit}x</div>
              <span className="text-[10px] text-zinc-400 block mt-1">Full 100% Heal</span>
            </button>

            <button
              onClick={() => onUseMed('bandage')}
              disabled={inventory.meds.bandage <= 0}
              className="p-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-emerald-500 disabled:opacity-40 transition text-left"
            >
              <div className="text-emerald-400 font-bold text-xs">BANDAGE</div>
              <div className="text-sm font-black mt-1">{inventory.meds.bandage}x</div>
              <span className="text-[10px] text-zinc-400 block mt-1">+15 HP (Up to 75)</span>
            </button>

            <button
              onClick={() => onUseMed('energyDrink')}
              disabled={inventory.meds.energyDrink <= 0}
              className="p-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-amber-500 disabled:opacity-40 transition text-left"
            >
              <div className="text-amber-400 font-bold text-xs">ENERGY DRINK</div>
              <div className="text-sm font-black mt-1">{inventory.meds.energyDrink}x</div>
              <span className="text-[10px] text-zinc-400 block mt-1">+25 HP & Speed</span>
            </button>
          </div>
        </div>

        {/* Ammo Reserve Inventory */}
        <div>
          <span className="text-xs uppercase text-zinc-400 font-bold mb-2 block">AMMO IN POUCHES</span>
          <div className="grid grid-cols-5 gap-2 text-center text-xs bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-zinc-500 block text-[10px]">9mm</span>
              <span className="font-bold text-white">{inventory.ammo['9mm']}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">7.62mm</span>
              <span className="font-bold text-white">{inventory.ammo['7.62mm']}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">12 Gauge</span>
              <span className="font-bold text-white">{inventory.ammo['12gauge']}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">.300 Mag</span>
              <span className="font-bold text-white">{inventory.ammo['300mag']}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Grenades</span>
              <span className="font-bold text-amber-400">{inventory.grenades}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
