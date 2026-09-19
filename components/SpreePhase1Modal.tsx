'use client';

import React from 'react';
import { Sparkles, Clock, ArrowRight, Building, CheckCircle2 } from 'lucide-react';

export interface SpreeAwardItem {
  playerName: string;
  playerColor: string;
  autoCompletedSets: string[];
  freePropertiesGranted: string[];
  housesGrantedCount: number;
}

export interface SpreePhase1ModalProps {
  isOpen: boolean;
  onClose: () => void;
  awards: SpreeAwardItem[];
}

export const SpreePhase1Modal: React.FC<SpreePhase1ModalProps> = ({
  isOpen,
  onClose,
  awards,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative bg-slate-900 border-2 border-purple-500/70 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-center shadow-[0_0_70px_rgba(168,85,247,0.3)] flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Top Purple Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-amber-400 rounded-t-3xl" />

        {/* Modal Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
              90-Minute Milestone Reached
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              Great Monopoly Spree: Phase 1 Fired!
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
              All 2+ property sets have auto-completed for free with 1 bonus house. The final{' '}
              <strong className="text-amber-400">30-minute sudden death</strong> has commenced!
            </p>
          </div>
        </div>

        {/* Awards Breakdown Card List */}
        <div className="space-y-2.5 text-left max-h-60 overflow-y-auto pr-1">
          {awards.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
              No partial sets met the 2+ threshold for auto-completion at this milestone.
            </div>
          ) : (
            awards.map((award, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: award.playerColor }}
                    />
                    <span className="font-bold text-sm text-white">{award.playerName}</span>
                  </div>
                  {award.housesGrantedCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      +{award.housesGrantedCount} Free Houses
                    </span>
                  )}
                </div>

                {award.freePropertiesGranted.length > 0 && (
                  <div className="text-xs text-slate-300 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Granted unowned deeds:{' '}
                      <strong className="text-emerald-300">
                        {award.freePropertiesGranted.join(', ')}
                      </strong>
                    </span>
                  </div>
                )}

                {award.autoCompletedSets.length > 0 && (
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>
                      Monopolies completed:{' '}
                      <strong className="text-purple-300">
                        {award.autoCompletedSets.join(', ')}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Phase 2 Timer Alert Box */}
        <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/60 flex items-center justify-between gap-3 text-left">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 block">
              Next Stage
            </span>
            <span className="text-xs text-slate-200 font-medium">
              30-Minute Sudden Death countdown active &bull; Net worth liquidation at 0:00
            </span>
          </div>
          <span className="text-lg font-black font-mono text-amber-300 bg-slate-950/80 px-3 py-1 rounded-xl border border-purple-500/40 shrink-0">
            30:00
          </span>
        </div>

        {/* Confirm Button */}
        <button
          id="btn-spree-phase1-continue"
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue Match</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SpreePhase1Modal;
