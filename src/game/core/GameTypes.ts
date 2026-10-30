/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type WeaponType = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper';

export type AmmoType = '9mm' | '5.56mm' | '7.62mm' | '12gauge' | '300mag';

export interface WeaponData {
  id: WeaponType;
  name: string;
  category: 'Secondary' | 'Primary';
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // rounds per second
  magazineSize: number;
  reloadTime: number; // seconds
  bulletSpeed: number; // units per second
  recoil: number;
  spread: number;
  adsZoom: number; // FOV multiplier, e.g. 0.7
  pellets?: number; // for shotgun
  ammoType: AmmoType;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export type LootRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type LootCategory = 'weapon' | 'ammo' | 'armor' | 'helmet' | 'med' | 'throwable';

export interface LootItem {
  id: string;
  name: string;
  category: LootCategory;
  rarity: LootRarity;
  weaponType?: WeaponType;
  ammoType?: AmmoType;
  amount?: number;
  level?: number; // 1, 2, 3
  description: string;
  iconName: string;
}

export interface GroundLoot {
  id: string;
  item: LootItem;
  position: THREE.Vector3;
  mesh?: THREE.Group;
  collected?: boolean;
}

export interface PlayerInventory {
  primary1: { weapon: WeaponData; ammoInClip: number } | null;
  primary2: { weapon: WeaponData; ammoInClip: number } | null;
  pistol: { weapon: WeaponData; ammoInClip: number } | null;
  activeSlot: 'primary1' | 'primary2' | 'pistol';
  ammo: {
    '9mm': number;
    '5.56mm': number;
    '7.62mm': number;
    '12gauge': number;
    '300mag': number;
  };
  armor: { level: number; durability: number; maxDurability: number } | null;
  helmet: { level: number; durability: number; maxDurability: number } | null;
  meds: {
    medkit: number;
    bandage: number;
    energyDrink: number;
  };
  grenades: number;
}

export type GamePhase = 'LOBBY' | 'PLANE' | 'DIVING' | 'PARACHUTING' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';

export interface StormPhaseData {
  waitDuration: number;
  shrinkDuration: number;
  targetRadius: number;
  targetCenter: THREE.Vector2;
  dps: number;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  victimName: string;
  weaponName: string;
  isHeadshot: boolean;
  isPlayerKiller: boolean;
  isPlayerVictim: boolean;
  timestamp: number;
}

export interface DamageNumber {
  id: string;
  amount: number;
  isHeadshot: boolean;
  position: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
}

export interface PlayerStats {
  kills: number;
  damageDealt: number;
  survivalTime: number; // in seconds
  rank: number;
  totalPlayers: number;
  headshots: number;
}

export interface CharacterCustomization {
  name: string;
  outfit: 'camo' | 'cyber' | 'desert' | 'arctic' | 'neon';
  skinTone: 'light' | 'tan' | 'dark' | 'bronze';
  hairColor: string;
}

export interface GameSettings {
  graphicsQuality: 'low' | 'medium' | 'high';
  sensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  botDifficulty: 'easy' | 'medium' | 'hard';
}
