'use client';

import React from 'react';
import { Player, Property } from '@/types/monopoly';
import { soundFx } from '@/lib/sound';
import { AlertTriangle, DollarSign, Home, CheckCircle2, Skull } from 'lucide-react';

const COLOR_HEX_STR: Record<string, string> = {
  Brown: '#8B4513',
  LightBlue: '#38BDF8',
  Pink: '#EC4899',
  Orange: '#F97316',
  Red: '#EF4444',
  Yellow: '#EAB308',
  Green: '#22C55E',
  DarkBlue: '#1E40AF',
  Railroad: '#475569',
  Utility: '#0EA5E9',
};

interface DebtCrisisModalProps {
  player: Player;
  properties: Property[];
  onMortgageProperty: (propId: string) => void;
  onUnmortgageProperty: (propId: string) => void;
  onDeclareBankruptcy: (playerId: number) => void;
  onSellHouse?: (propId: string) => void;
}

export const DebtCrisisModal: React.FC<DebtCrisisModalProps> = ({
  player,
  properties,
  onMortgageProperty,
  onUnmortgageProperty,
  onDeclareBankruptcy,
  onSellHouse,
}) => {
  const playerProps = properties.filter((p) => p.ownerId === player.id);
  const unmortgagedProps = playerProps.filter((p) => !p.isMortgaged);
  const potentialMortgageCash = unmortgagedProps.reduce((sum, p) => sum + p.basePrice / 2, 0);

  const isSolvent = player.cash > 0;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-rose-500/60 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(244,63,94,0.35)] text-slate-100 flex flex-col gap-5 relative overflow-hidden">
        {/* Subtle Top Red Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-2xl text-rose-400 shrink-0">
            <AlertTriangle className="w-7 h-7 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-black text-rose-400 uppercase tracking-wide flex items-center gap-2">
              DEBT CRISIS — INSOLVENT!
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              <span className="font-bold text-slate-100">{player.name}</span>, your cash balance is{' '}
              <span className="font-mono font-black text-rose-400 text-sm">${player.cash}</span>. You must raise cash by mortgaging properties or declare bankruptcy.
            </p>
          </div>
        </div>

        {/* Cash Status Callout */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Current Balance:</span>
          </div>
          <span className={`font-mono text-lg font-black ${player.cash > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${player.cash}
          </span>
        </div>

        {/* Mortgage Management Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Home className="w-4 h-4 text-amber-400" />
              Mortgage Properties (+50% Value)
            </span>
            <span className="text-[11px] text-amber-400/90 font-mono">
              Potential: +${potentialMortgageCash}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {playerProps.length === 0 ? (
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-center text-xs text-slate-400 italic">
                You do not own any properties to mortgage.
              </div>
            ) : (
              playerProps.map((prop) => {
                const colorHex = COLOR_HEX_STR[prop.colorGroup] || '#475569';
                const mortgageVal = prop.basePrice / 2;
                const unmortgageCost = Math.round(mortgageVal * 1.1);

                return (
                  <div
                    key={prop.id}
                    className="flex items-center justify-between p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-sm shrink-0 border border-slate-900 shadow-sm"
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="text-xs font-bold text-slate-200 truncate">{prop.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {prop.isMortgaged ? (
                        <>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md font-mono font-bold">
                            MORTGAGED
                          </span>
                          <button
                            onClick={() => {
                              soundFx.playCash();
                              onUnmortgageProperty(prop.id);
                            }}
                            disabled={player.cash < unmortgageCost}
                            className="text-[11px] bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-2.5 py-1 rounded-lg font-bold transition"
                          >
                            Unmortgage (-${unmortgageCost})
                          </button>
                        </>
                      ) : (prop.hotel || (prop.houses !== undefined && prop.houses > 0)) && onSellHouse ? (
                        <button
                          onClick={() => {
                            soundFx.playCash();
                            onSellHouse(prop.id);
                          }}
                          className="text-[11px] bg-orange-500 hover:bg-orange-400 active:scale-95 text-slate-950 font-black px-3 py-1 rounded-lg transition shadow-md shadow-orange-500/20"
                        >
                          {prop.hotel ? `Sell Hotel (+${Math.round((prop.houseCost || 50) / 2)})` : `Sell House (+${Math.round((prop.houseCost || 50) / 2)})`}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundFx.playCash();
                            onMortgageProperty(prop.id);
                          }}
                          className="text-[11px] bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black px-3 py-1 rounded-lg transition shadow-md shadow-amber-500/20"
                        >
                          Mortgage (+${mortgageVal})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Buttons: If solvent -> Continue. Always offer Defeat */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800">
          {isSolvent && (
            <button
              onClick={() => soundFx.playCash()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>SOLVENT! RESUME GAME (${player.cash} CASH)</span>
            </button>
          )}

          <button
            onClick={() => {
              soundFx.playJail();
              onDeclareBankruptcy(player.id);
            }}
            className="w-full bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-black py-3 rounded-2xl text-sm shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
          >
            <Skull className="w-4 h-4" />
            <span>ACCEPT DEFEAT (DECLARE BANKRUPTCY)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
