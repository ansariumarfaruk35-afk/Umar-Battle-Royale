/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerStats } from '../core/GameTypes';
import { Trophy, Skull, Target, Clock, Flame, RotateCcw, Award } from 'lucide-react';

interface GameOverModalProps {
  stats: PlayerStats;
  isVictory: boolean;
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isVictory,
  onPlayAgain,
  onReturnToMenu,
}) => {
  useEffect(() => {
    if (isVictory) {
      // Fire victory celebration confetti
      const end = Date.now() + 3500;
      const colors = ['#f59e0b', '#38bdf8', '#ef4444', '#10b981', '#ffffff'];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isVictory]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none font-sans">
      <div
        className={`relative max-w-md w-full rounded-2xl p-6 shadow-2xl border-2 flex flex-col items-center text-center ${
          isVictory
            ? 'bg-gradient-to-b from-amber-950/95 via-slate-900/95 to-slate-950 border-amber-400'
            : 'bg-gradient-to-b from-red-950/90 via-slate-900/95 to-slate-950 border-red-500'
        }`}
      >
        {/* Banner / Title Header */}
        <div className="mb-4">
          {isVictory ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mb-2 shadow-lg animate-bounce">
                <Trophy size={32} className="text-amber-400" />
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-orange-500 tracking-wider">
                BOOYAH!
              </h1>
              <span className="text-sm font-mono font-bold text-amber-300 tracking-widest uppercase mt-0.5">
                #1 SURVIVOR • CHAMPION
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center mb-2">
                <Skull size={28} className="text-red-400" />
              </div>
              <h1 className="text-3xl font-black text-red-500 tracking-wider">ELIMINATED</h1>
              <div className="text-lg font-mono font-bold text-zinc-300 mt-1">
                RANK <span className="text-amber-400 text-2xl font-black">#{stats.rank}</span> / {stats.totalPlayers}
              </div>
            </div>
          )}
        </div>

        {/* Match Statistics Card */}
        <div className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 my-3 font-mono grid grid-cols-2 gap-3 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-amber-500/10 text-amber-400">
              <Skull size={18} />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase">TOTAL KILLS</span>
              <span className="text-lg font-black text-white tabular-nums">{stats.kills}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-red-500/10 text-red-400">
              <Flame size={18} />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase">DAMAGE DEALT</span>
              <span className="text-lg font-black text-white tabular-nums">{stats.damageDealt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-sky-500/10 text-sky-400">
              <Clock size={18} />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase">SURVIVED</span>
              <span className="text-sm font-black text-white">{formatTime(stats.survivalTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-purple-500/10 text-purple-400">
              <Target size={18} />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block uppercase">HEADSHOTS</span>
              <span className="text-lg font-black text-white tabular-nums">{stats.headshots}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full mt-3 font-mono">
          <button
            onClick={onPlayAgain}
            className={`w-full py-3.5 px-6 rounded-xl font-black text-sm tracking-wider uppercase transition shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
              isVictory
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <RotateCcw size={18} />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={onReturnToMenu}
            className="w-full py-2.5 px-6 rounded-xl font-bold text-xs tracking-wider uppercase text-zinc-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            RETURN TO MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};
