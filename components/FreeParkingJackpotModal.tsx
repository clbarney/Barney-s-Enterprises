'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Coins, CheckCircle2, XCircle, ArrowRight, Dices } from 'lucide-react';
import { Player } from '@/types/monopoly';
import { soundFx } from '@/lib/sound';

export interface FreeParkingJackpotModalProps {
  isOpen: boolean;
  player: Player;
  lotteryPool: number;
  onRollDoublesChallenge: () => { d1: number; d2: number; isDoubles: boolean };
  onResolveChallenge: (won: boolean, poolAmount: number) => void;
}

function FreeParkingJackpotModalContent({
  player,
  lotteryPool,
  onRollDoublesChallenge,
  onResolveChallenge,
}: Omit<FreeParkingJackpotModalProps, 'isOpen'>) {
  const [hasRolled, setHasRolled] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [rollResult, setRollResult] = useState<{ d1: number; d2: number; isDoubles: boolean } | null>(null);

  const handleRoll = useCallback(() => {
    if (isRolling || hasRolled) return;
    setIsRolling(true);
    soundFx.playDiceRoll();

    setTimeout(() => {
      const res = onRollDoublesChallenge();
      setRollResult(res);
      setIsRolling(false);
      setHasRolled(true);

      if (res.isDoubles) {
        soundFx.playCash();
      } else {
        soundFx.playCardDraw();
      }
    }, 750);
  }, [isRolling, hasRolled, onRollDoublesChallenge]);

  useEffect(() => {
    if (player.isAi && !hasRolled && !isRolling) {
      const t = setTimeout(() => {
        handleRoll();
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [player.isAi, hasRolled, isRolling, handleRoll]);

  const handleContinue = () => {
    if (!rollResult) return;
    onResolveChallenge(rollResult.isDoubles, lotteryPool);
  };

  return (
    <div
      id="free-parking-jackpot-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
    >
      <div
        id="free-parking-jackpot-modal-container"
        className="bg-slate-950/95 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_60px_rgba(245,158,11,0.25)] space-y-6 text-white text-center animate-in zoom-in-95 duration-200"
      >
        {/* Header Vault Icon */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
            <Coins className="w-9 h-9 animate-bounce" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            Free Parking Vault Jackpot
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Crack the Vault!
          </h2>
        </div>

        {/* Current Jackpot Display */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/40">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Current Lottery Pool
          </div>
          <div className="text-4xl font-black text-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)] mt-1">
            ${lotteryPool}
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Roll one more time! Roll <strong className="text-amber-400">DOUBLES</strong> to win the entire jackpot and reset the vault to $100!
          </p>
        </div>

        {/* Dice Rolling & Results */}
        {!hasRolled ? (
          <div className="space-y-4">
            <button
              id="btn-free-parking-bonus-roll"
              onClick={handleRoll}
              disabled={isRolling}
              className={`w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                isRolling ? 'opacity-70 animate-pulse' : 'hover:scale-[1.02] active:scale-95'
              }`}
            >
              <Dices className={`w-5 h-5 ${isRolling ? 'animate-spin' : ''}`} />
              <span>{isRolling ? 'Rolling Dice...' : player.isAi ? `${player.name} Rolling...` : 'Roll for the Jackpot!'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Dice Visuals */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-amber-400/60 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                {rollResult?.d1}
              </div>
              <div className="text-slate-500 font-bold text-xl">&amp;</div>
              <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-amber-400/60 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                {rollResult?.d2}
              </div>
            </div>

            {/* Outcome Announcement */}
            {rollResult?.isDoubles ? (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  DOUBLES! JACKPOT AWARDED!
                </div>
                <div className="text-xs text-emerald-200/90">
                  {player.name} won the full <strong className="text-white">${lotteryPool}</strong> cash lottery!
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-1">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-slate-300">
                  <XCircle className="w-4 h-4 text-slate-500" />
                  No Doubles ({rollResult?.d1} &amp; {rollResult?.d2})
                </div>
                <div className="text-xs text-slate-400">
                  The ${lotteryPool} jackpot stays in the vault for the next visitor.
                </div>
              </div>
            )}

            <button
              id="btn-finish-free-parking-challenge"
              onClick={handleContinue}
              className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue Turn</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FreeParkingJackpotModal({
  isOpen,
  player,
  lotteryPool,
  onRollDoublesChallenge,
  onResolveChallenge,
}: FreeParkingJackpotModalProps) {
  if (!isOpen) return null;

  return (
    <FreeParkingJackpotModalContent
      key={`${player.id}-${lotteryPool}`}
      player={player}
      lotteryPool={lotteryPool}
      onRollDoublesChallenge={onRollDoublesChallenge}
      onResolveChallenge={onResolveChallenge}
    />
  );
}
