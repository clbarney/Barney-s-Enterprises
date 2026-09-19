'use client';

import React from 'react';
import { Landmark, ShieldAlert, Sparkles, X, Home, Building2, Train, Zap, CheckCircle2 } from 'lucide-react';
import { Player, Property } from '@/types/monopoly';
import { calculateTaxBill } from '@/lib/gameEngine';

export interface TaxBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  properties: Property[];
  bankerLapCounter: number;
}

export function TaxBreakdownModal({
  isOpen,
  onClose,
  player,
  properties,
  bankerLapCounter,
}: TaxBreakdownModalProps) {
  if (!isOpen) return null;

  const taxResult = calculateTaxBill(player, properties);
  const lapsUntilTax = 5 - (bankerLapCounter % 5 || 5);

  return (
    <div
      id="tax-breakdown-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        id="tax-breakdown-modal-container"
        className="bg-slate-950/95 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-inner">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                  Municipal Tax Day
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Due in {lapsUntilTax} {lapsUntilTax === 1 ? 'lap' : 'laps'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Portfolio Tax Assessment
              </h2>
            </div>
          </div>
          <button
            id="btn-close-tax-breakdown"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Summary Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs text-slate-400 font-medium">Estimated Assessment</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300">
              ${taxResult.totalTax}
            </div>
          </div>
          {taxResult.isExempt ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Tax Exempt Active
            </div>
          ) : (
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Your Current Liquid Cash</div>
              <div className={`text-base font-bold ${player.cash >= taxResult.totalTax ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${player.cash}
              </div>
            </div>
          )}
        </div>

        {/* Breakdown List */}
        <div className="space-y-2">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
            Itemized Tax Calculation
          </div>

          {taxResult.items.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              {taxResult.isExempt ? 'Your active Tax Exempt Wildcard waives all municipal property taxes.' : 'No unmortgaged taxable assets currently held.'}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {taxResult.items.map((item, idx) => {
                const isRebate = item.subtotal < 0;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs border ${
                      isRebate
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center gap-2">
                        {item.category}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({item.count} @ ${Math.abs(item.ratePerUnit)}/ea)
                        </span>
                      </div>
                      {item.note && (
                        <div className="text-[10px] text-emerald-400 font-medium">
                          {item.note}
                        </div>
                      )}
                    </div>
                    <div className={`font-black text-sm ${isRebate ? 'text-emerald-400' : 'text-slate-100'}`}>
                      {isRebate ? `-$${Math.abs(item.subtotal)}` : `+$${item.subtotal}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rules Footer */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            Every <strong className="text-slate-200">5 banker laps</strong>, municipal taxes are automatically deducted from all players and deposited into the <strong className="text-amber-300">Free Parking Vault</strong>. Players unable to pay face foreclosure auctions!
          </div>
        </div>

        <button
          id="btn-confirm-tax-breakdown"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
