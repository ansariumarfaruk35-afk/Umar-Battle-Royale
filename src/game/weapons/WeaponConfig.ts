/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeaponData, WeaponType, LootItem } from '../core/GameTypes';

export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponData> = {
  pistol: {
    id: 'pistol',
    name: 'Desert Hawk .50',
    category: 'Secondary',
    damage: 34,
    headshotMultiplier: 2.2,
    fireRate: 4.5, // 4.5 shots per sec
    magazineSize: 12,
    reloadTime: 1.5,
    bulletSpeed: 240,
    recoil: 0.025,
    spread: 0.015,
    adsZoom: 0.85,
    ammoType: '9mm',
    color: '#9ca3af',
    rarity: 'common',
  },
  smg: {
    id: 'smg',
    name: 'MP40 Viper',
    category: 'Primary',
    damage: 22,
    headshotMultiplier: 1.8,
    fireRate: 13.0, // fast fire rate
    magazineSize: 32,
    reloadTime: 1.8,
    bulletSpeed: 280,
    recoil: 0.018,
    spread: 0.035,
    adsZoom: 0.75,
    ammoType: '9mm',
    color: '#38bdf8',
    rarity: 'rare',
  },
  rifle: {
    id: 'rifle',
    name: 'AK-47 Warlord',
    category: 'Primary',
    damage: 36,
    headshotMultiplier: 2.3,
    fireRate: 9.0,
    magazineSize: 30,
    reloadTime: 2.2,
    bulletSpeed: 380,
    recoil: 0.032,
    spread: 0.02,
    adsZoom: 0.65,
    ammoType: '7.62mm',
    color: '#a855f7',
    rarity: 'epic',
  },
  shotgun: {
    id: 'shotgun',
    name: 'SPAS-12 Breaker',
    category: 'Primary',
    damage: 16, // per pellet
    pellets: 8, // total potential: 128
    headshotMultiplier: 1.6,
    fireRate: 1.4,
    magazineSize: 6,
    reloadTime: 2.8,
    bulletSpeed: 200,
    recoil: 0.065,
    spread: 0.075,
    adsZoom: 0.85,
    ammoType: '12gauge',
    color: '#4ade80',
    rarity: 'uncommon',
  },
  sniper: {
    id: 'sniper',
    name: 'AWM Thunder',
    category: 'Primary',
    damage: 110,
    headshotMultiplier: 2.8,
    fireRate: 0.9,
    magazineSize: 5,
    reloadTime: 3.2,
    bulletSpeed: 520,
    recoil: 0.08,
    spread: 0.003,
    adsZoom: 0.28, // high scope zoom!
    ammoType: '300mag',
    color: '#f59e0b',
    rarity: 'legendary',
  },
};

export const BASE_LOOT_TABLE: Omit<LootItem, 'id'>[] = [
  // Weapons
  { name: 'Desert Hawk .50', category: 'weapon', rarity: 'common', weaponType: 'pistol', ammoType: '9mm', description: 'Semi-auto high caliber sidearm.', iconName: 'crosshair' },
  { name: 'SPAS-12 Breaker', category: 'weapon', rarity: 'uncommon', weaponType: 'shotgun', ammoType: '12gauge', description: 'Heavy pump shotgun with devastating close spread.', iconName: 'target' },
  { name: 'MP40 Viper', category: 'weapon', rarity: 'rare', weaponType: 'smg', ammoType: '9mm', description: 'Rapid firing submachine gun for close quarters.', iconName: 'zap' },
  { name: 'AK-47 Warlord', category: 'weapon', rarity: 'epic', weaponType: 'rifle', ammoType: '7.62mm', description: 'High-damage reliable assault rifle.', iconName: 'flame' },
  { name: 'AWM Thunder', category: 'weapon', rarity: 'legendary', weaponType: 'sniper', ammoType: '300mag', description: 'Bolt-action beast with extreme headshot lethality.', iconName: 'eye' },

  // Armor & Helmets
  { name: 'Kevlar Vest Lv1', category: 'armor', rarity: 'common', level: 1, description: 'Basic body armor absorbs 30% torso damage.', iconName: 'shield' },
  { name: 'Tactical Vest Lv2', category: 'armor', rarity: 'rare', level: 2, description: 'Military vest absorbs 40% torso damage.', iconName: 'shield' },
  { name: 'Spetsnaz Vest Lv3', category: 'armor', rarity: 'legendary', level: 3, description: 'Reinforced ballistic vest absorbs 55% torso damage.', iconName: 'shield' },
  { name: 'Motorcycle Helmet Lv1', category: 'helmet', rarity: 'common', level: 1, description: 'Protects against headshots by 30%.', iconName: 'hard-hat' },
  { name: 'Military Helmet Lv2', category: 'helmet', rarity: 'rare', level: 2, description: 'Protects against headshots by 40%.', iconName: 'hard-hat' },
  { name: 'Spetsnaz Helmet Lv3', category: 'helmet', rarity: 'legendary', level: 3, description: 'Heavy face-shield helmet absorbs 55% head damage.', iconName: 'hard-hat' },

  // Ammo
  { name: '9mm Rounds (60x)', category: 'ammo', rarity: 'common', ammoType: '9mm', amount: 60, description: 'Pistol & SMG ammunition.', iconName: 'box' },
  { name: '7.62mm Rounds (60x)', category: 'ammo', rarity: 'uncommon', ammoType: '7.62mm', amount: 60, description: 'Heavy rifle ammunition.', iconName: 'box' },
  { name: '12-Gauge Shells (18x)', category: 'ammo', rarity: 'common', ammoType: '12gauge', amount: 18, description: 'Shotgun shell buckshot.', iconName: 'box' },
  { name: '.300 Magnum (15x)', category: 'ammo', rarity: 'rare', ammoType: '300mag', amount: 15, description: 'High-power sniper cartridges.', iconName: 'box' },

  // Meds
  { name: 'Bandage (5x)', category: 'med', rarity: 'common', amount: 5, description: 'Restores 15 HP up to 75%.', iconName: 'activity' },
  { name: 'First Aid Medkit', category: 'med', rarity: 'rare', amount: 1, description: 'Full trauma kit restores health to 100%.', iconName: 'heart' },
  { name: 'Energy Drink', category: 'med', rarity: 'uncommon', amount: 1, description: 'Boosts run speed by 15% and provides steady health regen.', iconName: 'coffee' },

  // Throwables
  { name: 'Frag Grenade', category: 'throwable', rarity: 'uncommon', amount: 1, description: 'High-explosive grenade with 3s fuse and large blast radius.', iconName: 'bomb' },
];

export const RARITY_COLORS: Record<string, string> = {
  common: '#e2e8f0', // slate-200
  uncommon: '#22c55e', // green-500
  rare: '#3b82f6', // blue-500
  epic: '#a855f7', // purple-500
  legendary: '#f59e0b', // amber-500
};
