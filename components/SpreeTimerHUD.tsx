'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export interface SpreeTimerHUDProps {
  enabled: boolean;
  onPhase1Trigger: () => void;
  onEndgameLiquidation: () => void;
  initialSeconds?: number;
  initialPhase?: 1 | 2;
}

export const SpreeTimerHUD: React.FC<SpreeTimerHUDProps> = ({
  enabled,
  onPhase1Trigger,
  onEndgameLiquidation,
  initialSeconds = 90 * 60,
  initialPhase = 1,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [phase, setPhase] = useState<1 | 2>(initialPhase);

  useEffect(() => {
    if (!enabled) return;

    const handleSetTimer = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number; phase?: 1 | 2 }>;
      if (typeof customEvent.detail?.seconds === 'number') {
        setSecondsLeft(customEvent.detail.seconds);
      }
      if (customEvent.detail?.phase) {
        setPhase(customEvent.detail.phase);
      }
    };

    window.addEventListener('monopoly:set-spree-timer', handleSetTimer);
    return () => window.removeEventListener('monopoly:set-spree-timer', handleSetTimer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          if (phase === 1) {
            setPhase(2);
            setSecondsLeft(30 * 60); // Final 30m
            onPhase1Trigger();
          } else {
            onEndgameLiquidation();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [enabled, phase, onPhase1Trigger, onEndgameLiquidation]);

  if (!enabled) return null;

  return (
    <div
      id="hud-spree-timer"
      className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/90 border border-purple-500/50 shadow-xl backdrop-blur-xl text-white h-11 transition hover:border-purple-400 select-none pointer-events-auto"
    >
      <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
        <Clock className="w-4 h-4 animate-pulse" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-purple-300 leading-none">
            Spree P{phase}
          </span>
          <span
            className={`text-[8px] px-1 py-0.2 rounded font-bold ${
              phase === 2
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : 'bg-purple-900/60 text-purple-200'
            }`}
          >
            {phase === 2 ? 'Final 30m' : '90m'}
          </span>
        </div>
        <span
          className={`text-xs font-mono font-black mt-0.5 leading-none ${
            secondsLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-amber-300'
          }`}
        >
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};
