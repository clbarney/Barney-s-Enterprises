'use client';

import React, { useState } from 'react';
import { Crown, DollarSign, Compass, ArrowRight, X } from 'lucide-react';
import { Player, BoardSpace } from '@/types/monopoly';

export interface LandOnGoModalProps {
  isOpen: boolean;
  player: Player;
  boardSpaces: BoardSpace[];
  onTakeDoubleCash: () => void;
  onWarpToSpace: (targetSpaceIndex: number, spaceName: string) => void;
}

export function LandOnGoModal({
  isOpen,
  player,
  boardSpaces,
  onTakeDoubleCash,
  onWarpToSpace,
}: LandOnGoModalProps) {
  const [selectedSpaceIndex, setSelectedSpaceIndex] = useState<number>(1);
  const [isWarpSelectorOpen, setIsWarpSelectorOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const validTargetSpaces = boardSpaces.filter((s) => s.index !== 0);

  return (
    <div
      id="land-on-go-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="land-on-go-modal-container"
        className="bg-slate-900 border-2 border-amber-500/70 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-white"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Crown className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Barney&apos;s Special Expansion Rule
            </span>
            <h2 className="text-2xl font-black text-white">Land on GO Privilege!</h2>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Congratulations! You landed directly on <strong className="text-amber-400">GO</strong>.
          Under Barney&apos;s house rules, you may choose to take a double cash payday (totaling $400)
          or warp to any space of your choosing on the board!
        </p>

        {/* Choice Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Option 1: Double Cash */}
          <div
            id="opt-double-cash"
            onClick={onTakeDoubleCash}
            className="p-4 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/60 cursor-pointer transition flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-center gap-2 text-emerald-400">
              <DollarSign className="w-5 h-5" />
              <span className="font-bold text-sm">Double Cash</span>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-300">+$200 Extra</div>
              <div className="text-[11px] text-emerald-200/80 mt-1">
                Collect an additional $200 for a total $400 GO payday.
              </div>
            </div>
            <button
              id="btn-choose-double-cash"
              className="w-full py-2 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-xs transition"
            >
              Collect $400 Payday
            </button>
          </div>

          {/* Option 2: Tactical Board Warp */}
          <div
            id="opt-tactical-warp"
            onClick={() => setIsWarpSelectorOpen(true)}
            className="p-4 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-950/60 cursor-pointer transition flex flex-col justify-between space-y-3 group"
          >
            <div className="flex items-center gap-2 text-indigo-400">
              <Compass className="w-5 h-5" />
              <span className="font-bold text-sm">Tactical Board Warp</span>
            </div>
            <div>
              <div className="text-2xl font-black text-indigo-300">Any Space</div>
              <div className="text-[11px] text-indigo-200/80 mt-1">
                Instantly fly to any property, corner, or station on the board.
              </div>
            </div>
            <button
              id="btn-choose-tactical-warp"
              className="w-full py-2 rounded-xl bg-indigo-600 group-hover:bg-indigo-500 text-white font-bold text-xs transition"
            >
              Select Destination
            </button>
          </div>
        </div>

        {/* Warp Selector Sub-Panel */}
        {isWarpSelectorOpen && (
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Choose Destination Space:
            </span>
            <select
              id="warp-destination-select"
              value={selectedSpaceIndex}
              onChange={(e) => setSelectedSpaceIndex(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
            >
              {validTargetSpaces.map((space) => (
                <option key={space.index} value={space.index}>
                  #{space.index} - {space.name} ({space.type})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2 pt-1">
              <button
                id="btn-cancel-warp"
                onClick={() => setIsWarpSelectorOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition"
              >
                Back
              </button>
              <button
                id="btn-confirm-warp"
                onClick={() => {
                  const space = boardSpaces.find((s) => s.index === selectedSpaceIndex);
                  onWarpToSpace(selectedSpaceIndex, space?.name || `Space ${selectedSpaceIndex}`);
                }}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition"
              >
                <span>Warp Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
