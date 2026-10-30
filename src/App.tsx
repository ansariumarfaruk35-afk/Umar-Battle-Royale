/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/core/GameEngine';
import {
  CharacterCustomization,
  GamePhase,
  GameSettings,
  KillFeedEntry,
  LootItem,
  PlayerStats,
  WeaponData,
} from './game/core/GameTypes';
import { soundEngine } from './game/audio/SoundEngine';
import { MainMenu } from './game/ui/MainMenu';
import { GameHUD } from './game/ui/GameHUD';
import { MobileControls } from './game/ui/MobileControls';
import { FullMapModal } from './game/ui/FullMapModal';
import { InventoryModal } from './game/ui/InventoryModal';
import { GameOverModal } from './game/ui/GameOverModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Match & UI State
  const [phase, setPhase] = useState<GamePhase>('LOBBY');
  const [isPaused, setIsPaused] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // HUD stats state
  const [hudStats, setHudStats] = useState({
    health: 100,
    maxHealth: 100,
    armorDurability: 150,
    maxArmorDurability: 150,
    armorLevel: 1,
    ammoInClip: 30,
    ammoReserve: 90,
    activeWeapon: null as WeaponData | null,
    playersAlive: 31,
    kills: 0,
    stormPhase: 1,
    stormTimeRemaining: 60,
    isStormShrinking: false,
    isOutsideZone: false,
  });

  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [nearbyLoot, setNearbyLoot] = useState<{ id: string; item: LootItem }[]>([]);
  const [showHitMarker, setShowHitMarker] = useState(false);
  const [hitMarkerHeadshot, setHitMarkerHeadshot] = useState(false);
  const [isDamageFlashing, setIsDamageFlashing] = useState(false);
  const [gameOverStats, setGameOverStats] = useState<{ stats: PlayerStats; isVictory: boolean } | null>(null);

  // Settings & Customization
  const [customization, setCustomization] = useState<CharacterCustomization>({
    name: 'UmarWarrior',
    outfit: 'camo',
    skinTone: 'tan',
    hairColor: '#000000',
  });

  const [settings, setSettings] = useState<GameSettings>({
    graphicsQuality: 'medium',
    sensitivity: 1.0,
    masterVolume: 0.8,
    sfxVolume: 0.8,
    musicVolume: 0.5,
    botDifficulty: 'medium',
  });

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
  }, []);

  // Update volumes when settings change
  useEffect(() => {
    soundEngine.setVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume);
  }, [settings.masterVolume, settings.sfxVolume, settings.musicVolume]);

  // Start menu music on lobby
  useEffect(() => {
    if (phase === 'LOBBY') {
      soundEngine.startMenuMusic();
    } else {
      soundEngine.stopMenuMusic();
    }
  }, [phase]);

  // --- START / RESTART MATCH ---
  const startMatch = useCallback(() => {
    soundEngine.init();
    soundEngine.stopMenuMusic();

    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    if (canvasMountRef.current) {
      canvasMountRef.current.innerHTML = '';
      const engine = new GameEngine(
        canvasMountRef.current,
        settings,
        customization,
        {
          onPhaseChange: newPhase => {
            setPhase(newPhase);
          },
          onStatsUpdate: stats => {
            setHudStats(stats);
          },
          onKillFeed: entry => {
            setKillFeed(prev => [...prev.slice(-6), entry]);
          },
          onDamageTaken: () => {
            setIsDamageFlashing(true);
            setTimeout(() => setIsDamageFlashing(false), 180);
          },
          onHitMarker: isHeadshot => {
            setShowHitMarker(true);
            setHitMarkerHeadshot(isHeadshot);
            setTimeout(() => setShowHitMarker(false), 150);
          },
          onGameOver: (stats, isVictory) => {
            setGameOverStats({ stats, isVictory });
            document.exitPointerLock?.();
          },
          onNearbyLootUpdate: loot => {
            setNearbyLoot(loot);
          },
        }
      );
      engineRef.current = engine;
      setPhase('PLANE');
      setGameOverStats(null);
      setIsPaused(false);
      setShowFullMap(false);
      setShowInventory(false);
      setKillFeed([]);
    }
  }, [customization, settings]);

  // --- KEYBOARD & MOUSE CONTROLS (DESKTOP) ---
  useEffect(() => {
    const keysHeld = new Set<string>();

    const updateMovement = () => {
      const engine = engineRef.current;
      if (!engine) return;

      let x = 0;
      let y = 0;
      if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) y -= 1;
      if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) y += 1;
      if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) x -= 1;
      if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) x += 1;

      // Normalize diagonal
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }

      engine.moveInput = { x, y };
      engine.player.isSprinting = keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'LOBBY') {
        if (e.code === 'Space' || e.code === 'Enter') {
          startMatch();
        }
        return;
      }

      keysHeld.add(e.code);
      updateMovement();

      const engine = engineRef.current;
      if (!engine) return;

      if (e.code === 'Space') {
        if (engine.phase === 'PLANE') {
          engine.playerJumpFromPlane();
        } else if (engine.phase === 'DIVING') {
          engine.playerDeployParachute();
        } else {
          engine.player.jump();
        }
      } else if (e.code === 'KeyC') {
        engine.player.toggleCrouch();
      } else if (e.code === 'KeyR') {
        engine.player.reload();
      } else if (e.code === 'KeyE' || e.code === 'KeyF') {
        const nearby = engine.lootManager.getNearbyLoot(engine.player.position, 2.8);
        if (nearby.length > 0) {
          engine.pickupLootItem(nearby[0].id);
        }
      } else if (e.code === 'Digit1') {
        engine.player.switchWeapon('primary1');
      } else if (e.code === 'Digit2') {
        engine.player.switchWeapon('primary2');
      } else if (e.code === 'Digit3') {
        engine.player.switchWeapon('pistol');
      } else if (e.code === 'Digit4') {
        engine.player.useMed('medkit');
      } else if (e.code === 'Digit5') {
        engine.player.useMed('energyDrink');
      } else if (e.code === 'KeyG') {
        engine.throwGrenade();
      } else if (e.code === 'KeyM') {
        setShowFullMap(prev => !prev);
      } else if (e.code === 'Tab') {
        e.preventDefault();
        setShowInventory(prev => !prev);
      } else if (e.code === 'Escape') {
        setIsPaused(prev => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
      updateMovement();
    };

    const handleBlur = () => {
      keysHeld.clear();
      updateMovement();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || document.pointerLockElement !== canvasMountRef.current) return;

      const sens = 0.0022 * settings.sensitivity;
      engine.player.yaw -= e.movementX * sens;
      engine.player.pitch = Math.max(-1.3, Math.min(1.3, engine.player.pitch - e.movementY * sens));
    };

    const handleMouseDown = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || phase === 'LOBBY' || phase === 'GAMEOVER' || phase === 'VICTORY') return;

      // Request Pointer Lock on left click if inside canvas
      if (document.pointerLockElement !== canvasMountRef.current && e.button === 0) {
        canvasMountRef.current?.requestPointerLock();
      }

      if (e.button === 0) {
        engine.isMouseDown = true;
      } else if (e.button === 2) {
        // Right click ADS toggle
        engine.player.toggleADS(true);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.button === 0) {
        engine.isMouseDown = false;
      } else if (e.button === 2) {
        engine.player.toggleADS(false);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent right-click context menu in battle royale!
    };

    const handleResize = () => {
      if (engineRef.current && canvasMountRef.current) {
        engineRef.current.resize(canvasMountRef.current.clientWidth, canvasMountRef.current.clientHeight);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, [phase, settings.sensitivity, startMatch]);

  // Clean disposal on component unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. Isolated WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {/* 2. Main Menu / Title Screen */}
      {phase === 'LOBBY' && (
        <MainMenu
          onStartGame={startMatch}
          customization={customization}
          onUpdateCustomization={setCustomization}
          settings={settings}
          onUpdateSettings={setSettings}
        />
      )}

      {/* 3. In-Game HUD (Battle Royale Interface) */}
      {phase !== 'LOBBY' && (
        <GameHUD
          engine={engineRef.current}
          phase={phase}
          health={hudStats.health}
          maxHealth={hudStats.maxHealth}
          armorDurability={hudStats.armorDurability}
          maxArmorDurability={hudStats.maxArmorDurability}
          armorLevel={hudStats.armorLevel}
          ammoInClip={hudStats.ammoInClip}
          ammoReserve={hudStats.ammoReserve}
          activeWeapon={hudStats.activeWeapon}
          playersAlive={hudStats.playersAlive}
          kills={hudStats.kills}
          stormPhase={hudStats.stormPhase}
          stormTimeRemaining={hudStats.stormTimeRemaining}
          isStormShrinking={hudStats.isStormShrinking}
          isOutsideZone={hudStats.isOutsideZone}
          killFeed={killFeed}
          nearbyLoot={nearbyLoot}
          showHitMarker={showHitMarker}
          hitMarkerHeadshot={hitMarkerHeadshot}
          isDamageFlashing={isDamageFlashing}
          onOpenFullMap={() => setShowFullMap(true)}
          onOpenInventory={() => setShowInventory(true)}
          onPickupLoot={id => engineRef.current?.pickupLootItem(id)}
          onUseMed={type => engineRef.current?.player.useMed(type)}
          onThrowGrenade={() => engineRef.current?.throwGrenade()}
          onPlaneJump={() => engineRef.current?.playerJumpFromPlane()}
          onDeployParachute={() => engineRef.current?.playerDeployParachute()}
          onPause={() => setIsPaused(prev => !prev)}
        />
      )}

      {/* 4. Mobile Virtual Controls */}
      {phase !== 'LOBBY' && (isTouchDevice || settings.graphicsQuality === 'low') && (
        <MobileControls
          engine={engineRef.current}
          onJump={() => {
            if (engineRef.current?.phase === 'PLANE') {
              engineRef.current.playerJumpFromPlane();
            } else if (engineRef.current?.phase === 'DIVING') {
              engineRef.current.playerDeployParachute();
            } else {
              engineRef.current?.player.jump();
            }
          }}
          onCrouch={() => engineRef.current?.player.toggleCrouch()}
          onReload={() => engineRef.current?.player.reload()}
          onADS={() => engineRef.current?.player.toggleADS()}
          onHeal={() => engineRef.current?.player.useMed('medkit')}
          onPickupFirstNearby={() => {
            if (nearbyLoot.length > 0 && engineRef.current) {
              engineRef.current.pickupLootItem(nearbyLoot[0].id);
            }
          }}
          isADS={engineRef.current ? engineRef.current.player.isADS : false}
          hasNearbyLoot={nearbyLoot.length > 0}
        />
      )}

      {/* 5. Full Island Tactical Map Modal */}
      {showFullMap && (
        <FullMapModal engine={engineRef.current} onClose={() => setShowFullMap(false)} />
      )}

      {/* 6. Inventory & Backpack Modal */}
      {showInventory && engineRef.current && (
        <InventoryModal
          inventory={engineRef.current.player.inventory}
          onClose={() => setShowInventory(false)}
          onUseMed={type => engineRef.current?.player.useMed(type)}
          onSelectSlot={slot => engineRef.current?.player.switchWeapon(slot)}
        />
      )}

      {/* 7. Game Over / Victory Booyah Modal */}
      {gameOverStats && (
        <GameOverModal
          stats={gameOverStats.stats}
          isVictory={gameOverStats.isVictory}
          onPlayAgain={startMatch}
          onReturnToMenu={() => {
            setPhase('LOBBY');
            setGameOverStats(null);
            if (engineRef.current) {
              engineRef.current.dispose();
              engineRef.current = null;
            }
          }}
        />
      )}

      {/* 8. Pause Modal */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono select-none">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-black text-amber-400 mb-2">MATCH PAUSED</h2>
            <p className="text-zinc-400 text-xs mb-6">Umar Battle Royale</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setIsPaused(false)}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl uppercase transition active:scale-95"
              >
                RESUME MATCH
              </button>
              <button
                onClick={() => {
                  soundEngine.toggleMute();
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-zinc-300 font-bold rounded-xl text-xs uppercase transition"
              >
                TOGGLE AUDIO MUTE
              </button>
              <button
                onClick={() => {
                  setIsPaused(false);
                  setPhase('LOBBY');
                  if (engineRef.current) {
                    engineRef.current.dispose();
                    engineRef.current = null;
                  }
                }}
                className="w-full py-2.5 bg-red-900/80 hover:bg-red-800 text-red-200 font-bold rounded-xl text-xs uppercase transition"
              >
                EXIT TO LOBBY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
