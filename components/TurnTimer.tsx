'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Player } from '@/types/monopoly';
import { soundFx } from '@/lib/sound';
import { Clock, AlertTriangle, Footprints } from 'lucide-react';

interface TurnTimerProps {
  activePlayer: Player;
  turnPhase: string;
  gamePhase: string;
  isAnimating?: boolean;
  onEndTurn: () => void;
  onRoll?: () => void;
  maxSeconds?: number;
  disabled?: boolean;
}

export const TurnTimer: React.FC<TurnTimerProps> = ({
  activePlayer,
  turnPhase,
  gamePhase,
  isAnimating = false,
  onEndTurn,
  onRoll,
  maxSeconds = 30,
  disabled = false,
}) => {
  const [timeLeft, setTimeLeft] = useState(maxSeconds);

  // Timer countdown loop - runs during PRE_ROLL (time to roll dice) AND post-landing decision (!isAnimating)
  useEffect(() => {
    if (
      disabled ||
      gamePhase !== 'IN_GAME' ||
      activePlayer.isAi ||
      activePlayer.isBankrupt ||
      isAnimating // Pause/wait while dice physics or token is physically moving
    ) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        const nextVal = prev - 1;
        if (nextVal === 10) {
          soundFx.playTimerWarning();
        } else if (nextVal < 10) {
          soundFx.playTimerTick();
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activePlayer.id, activePlayer.isAi, activePlayer.isBankrupt, gamePhase, turnPhase, isAnimating, disabled]);

  // Handle timeout expiry auto roll or auto end turn
  const onEndTurnRef = useRef(onEndTurn);
  const onRollRef = useRef(onRoll);
  useEffect(() => {
    onEndTurnRef.current = onEndTurn;
    onRollRef.current = onRoll;
  }, [onEndTurn, onRoll]);

  useEffect(() => {
    if (
      !disabled &&
      timeLeft === 0 &&
      gamePhase === 'IN_GAME' &&
      !activePlayer.isAi &&
      !activePlayer.isBankrupt &&
      !isAnimating
    ) {
      if (turnPhase === 'PRE_ROLL') {
        soundFx.playDiceRoll();
        if (onRollRef.current) {
          onRollRef.current();
        } else {
          onEndTurnRef.current();
        }
      } else {
        soundFx.playJail();
        onEndTurnRef.current();
      }
    }
  }, [disabled, timeLeft, gamePhase, turnPhase, activePlayer.isAi, activePlayer.isBankrupt, isAnimating]);

  if (gamePhase !== 'IN_GAME' || activePlayer.isAi || activePlayer.isBankrupt) {
    return null;
  }

  if (disabled) {
    return (
      <div className="w-full transition-all duration-300 rounded-xl p-2 border border-slate-700/60 bg-slate-900/85 backdrop-blur-xl shadow-lg">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wider truncate text-emerald-300">
              TURN TIMER DISABLED (DEV)
            </span>
          </div>
          <span className="font-mono text-xs font-black text-emerald-400 shrink-0">
            ∞
          </span>
        </div>
      </div>
    );
  }

  const isWarning = timeLeft <= 10 && !isAnimating;
  const progressPercent = (timeLeft / maxSeconds) * 100;

  let headerLabel = 'TIME REMAINING';
  if (isAnimating) {
    headerLabel = 'MOVING...';
  } else if (turnPhase === 'PRE_ROLL') {
    headerLabel = isWarning ? `AUTO-ROLL (${timeLeft}s)` : 'ROLL DICE (30s)';
  } else if (isWarning) {
    headerLabel = '10s WARN!';
  } else {
    headerLabel = 'SPACE DECISION';
  }

  return (
    <div
      className={`w-full transition-all duration-500 rounded-xl p-2 border backdrop-blur-xl shadow-lg ${
        isWarning
          ? 'bg-rose-950/90 border-rose-500/90 text-rose-100 ring-2 ring-rose-500/60 shadow-rose-500/30 animate-pulse'
          : isAnimating
          ? 'bg-slate-900/70 border-slate-700/60 text-slate-300'
          : 'bg-slate-900/90 border-slate-700/80 text-slate-100 shadow-amber-500/10'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {isAnimating ? (
            <Footprints className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-bounce" />
          ) : isWarning ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-bounce" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin-slow" />
          )}
          <span className="text-[10px] font-black uppercase tracking-wider truncate text-slate-300">
            {headerLabel}
          </span>
        </div>

        <span
          className={`font-mono text-sm font-black leading-none shrink-0 ${
            isAnimating
              ? 'text-sky-300'
              : isWarning
              ? 'text-rose-300 animate-pulse'
              : 'text-amber-400'
          }`}
        >
          00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
        </span>
      </div>

      {/* Visual Progress Bar */}
      <div className="w-full h-1.5 bg-slate-950/80 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-1000 linear ${
            isAnimating
              ? 'bg-sky-400 shadow-sky-400/80'
              : isWarning
              ? 'bg-rose-500 shadow-rose-500/80'
              : 'bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
