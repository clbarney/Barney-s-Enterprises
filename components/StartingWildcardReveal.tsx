'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Flame, Shield, ArrowDown, Check } from 'lucide-react';
import { Wildcard } from '@/types/monopoly';
import { soundFx } from '@/lib/sound';

export interface StartingWildcardRevealProps {
  card: Wildcard | null;
  onComplete: () => void;
}

export function StartingWildcardReveal({ card, onComplete }: StartingWildcardRevealProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlyingToHand, setIsFlyingToHand] = useState(false);

  const handleFlyToHand = React.useCallback(() => {
    if (isFlyingToHand) return;
    soundFx.playCardDraw();
    setIsFlyingToHand(true);
    setTimeout(() => {
      onComplete();
    }, 550);
  }, [isFlyingToHand, onComplete]);

  useEffect(() => {
    if (!card) return;

    // 1. Initial appearance - flip card to front after brief suspense
    const flipTimer = setTimeout(() => {
      soundFx.playCardDraw();
      setIsFlipped(true);
    }, 450);

    // 2. Auto-fly to hand after 3.2 seconds if user doesn't click
    const autoFlyTimer = setTimeout(() => {
      handleFlyToHand();
    }, 3200);

    return () => {
      clearTimeout(flipTimer);
      clearTimeout(autoFlyTimer);
    };
  }, [card, handleFlyToHand]);

  if (!card) return null;

  const isSuper = card.type === 'Super';

  return (
    <div
      id="starting-wildcard-reveal-backdrop"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none transition-opacity duration-300 ${
        isFlyingToHand ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleFlyToHand}
    >
      {/* Title & Eyebrow */}
      <div
        className={`flex flex-col items-center text-center space-y-2 mb-6 transition-all duration-500 ${
          isFlyingToHand ? 'opacity-0 -translate-y-8' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/10">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          Opening Wildcard Reveal
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
          Your Secret Starting Wildcard!
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md">
          Granted for your starting strategy. Master its special perk during your turns!
        </p>
      </div>

      {/* 3D Card Flip Container */}
      <div
        className={`w-64 sm:w-72 h-96 [perspective:1200px] transition-all duration-500 cursor-pointer ${
          isFlyingToHand
            ? 'translate-y-[45vh] scale-25 opacity-0'
            : 'translate-y-0 scale-100 opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          handleFlyToHand();
        }}
      >
        <div
          className="relative w-full h-full [transform-style:preserve-3d] transition-transform duration-700 ease-out shadow-2xl rounded-3xl"
          style={{
            transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
          }}
        >
          {/* Card Back Face (Shown before flip) */}
          <div className="absolute inset-0 w-full h-full rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/60 p-6 flex flex-col items-center justify-center text-center shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 flex items-center justify-center shadow-inner">
              <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-amber-400 mt-4">
              Barney&apos;s Deck
            </div>
            <div className="text-xl font-black text-white tracking-wider">
              WILDCARD
            </div>
          </div>

          {/* Card Front Face (Revealed after flip) */}
          <div
            className={`absolute inset-0 w-full h-full rounded-3xl border-2 p-5 flex flex-col justify-between shadow-2xl [backface-visibility:hidden] ${
              isSuper
                ? 'bg-gradient-to-b from-purple-950 via-slate-900 to-slate-950 border-purple-500/80 shadow-purple-500/30'
                : 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-amber-500/80 shadow-amber-500/30'
            }`}
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  isSuper
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {card.type} Wildcard
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {card.duration === 'Permanent' ? 'Passive Effect' : 'One-Time Play'}
              </span>
            </div>

            {/* Center Art & Name */}
            <div className="flex flex-col items-center text-center space-y-3 my-auto">
              <div
                className={`w-16 h-16 rounded-2xl border flex items-center justify-center shadow-lg ${
                  isSuper
                    ? 'bg-purple-500/20 border-purple-400/50 text-purple-300 shadow-purple-500/20'
                    : 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-amber-500/20'
                }`}
              >
                {isSuper ? (
                  <Flame className="w-9 h-9 animate-pulse text-pink-400" />
                ) : (
                  <Sparkles className="w-9 h-9 text-amber-400" />
                )}
              </div>
              <h3 className="text-lg font-black text-white tracking-wide leading-snug">
                {card.name}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed px-2">
                {card.description}
              </p>
            </div>

            {/* Bottom Deck Insertion Button */}
            <button
              id="btn-claim-starting-wildcard"
              onClick={(e) => {
                e.stopPropagation();
                handleFlyToHand();
              }}
              className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                isSuper
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950'
              }`}
            >
              <ArrowDown className="w-4 h-4 animate-bounce" />
              <span>Add to Hand</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
