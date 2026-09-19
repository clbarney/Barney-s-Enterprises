'use client';

import React from 'react';
import { Train, ArrowRight, ShieldCheck, DollarSign, X } from 'lucide-react';
import { Player, Property } from '@/types/monopoly';

export interface RailwayTransitModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  currentSpaceIndex: number;
  properties: Property[];
  players: Player[];
  onSelectTransit: (targetSpaceIndex: number, cost: number, stationName: string) => void;
}

const RAILROAD_STATIONS = [
  { spaceIndex: 5, propId: 'reading_railroad', name: 'Reading Railroad' },
  { spaceIndex: 15, propId: 'pennsylvania_railroad', name: 'Pennsylvania Railroad' },
  { spaceIndex: 25, propId: 'b_and_o_railroad', name: 'B. & O. Railroad' },
  { spaceIndex: 35, propId: 'short_line', name: 'Short Line Railroad' },
];

export function RailwayTransitModal({
  isOpen,
  onClose,
  player,
  currentSpaceIndex,
  properties,
  players,
  onSelectTransit,
}: RailwayTransitModalProps) {
  if (!isOpen) return null;

  const ownedRailroads = properties.filter(
    (p) => p.colorGroup === 'Railroad' && p.ownerId === player.id
  );
  const isMultiTrainOwner = ownedRailroads.length >= 2;

  // Station options (exclude current station)
  const availableStations = RAILROAD_STATIONS.filter(
    (s) => s.spaceIndex !== currentSpaceIndex
  );

  // Find index of current station in the 4-station loop (0 to 3)
  const currentIdx = RAILROAD_STATIONS.findIndex((s) => s.spaceIndex === currentSpaceIndex);

  return (
    <div
      id="railway-transit-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="railway-transit-modal-container"
        className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 text-white"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Train className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Barney&apos;s Fast-Transit System
              </span>
              <h2 className="text-xl font-black text-white">Railway Transportation</h2>
            </div>
          </div>
          <button
            id="btn-close-railway-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ownership Status Banner */}
        <div
          id="railway-privilege-banner"
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-3 ${
            isMultiTrainOwner
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          }`}
        >
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold">
              {isMultiTrainOwner
                ? `Multi-Train Owner Privilege (${ownedRailroads.length} Railroads Owned)`
                : `Single Train Owner (${ownedRailroads.length} Railroad Owned)`}
            </div>
            <p className="opacity-80 text-[11px] mt-0.5">
              {isMultiTrainOwner
                ? 'All transit between stations is 100% FREE! You can travel forward or backward to any station.'
                : 'Transit to next station for $50, or across the board for $100.'}
            </p>
          </div>
        </div>

        {/* Station Options */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Select Destination Station:
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {availableStations.map((station) => {
              const targetIdxInLoop = RAILROAD_STATIONS.findIndex(
                (s) => s.spaceIndex === station.spaceIndex
              );
              // Calculate relative forward distance along the 4 stations (1, 2, or 3 stations away)
              const stationsAhead = (targetIdxInLoop - currentIdx + 4) % 4;

              let cost = 0;
              let transitTypeLabel = '';

              if (isMultiTrainOwner) {
                cost = 0;
                transitTypeLabel = 'FREE (Multi-Owner Pass)';
              } else {
                if (stationsAhead === 1) {
                  cost = 50;
                  transitTypeLabel = 'Next Station ($50)';
                } else if (stationsAhead === 2) {
                  cost = 100;
                  transitTypeLabel = 'Across the Board ($100)';
                } else {
                  // 3 stations ahead (which is 1 backwards) - single train owners can only take forward next or across
                  cost = 100;
                  transitTypeLabel = 'Long-Distance Transit ($100)';
                }
              }

              const prop = properties.find((p) => p.id === station.propId);
              const owner = prop?.ownerId !== null ? players.find((p) => p.id === prop?.ownerId) : null;
              const isOwnedByMe = prop?.ownerId === player.id;
              const canAfford = player.cash >= cost;

              return (
                <div
                  key={station.spaceIndex}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    canAfford
                      ? 'bg-slate-800/60 border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-800'
                      : 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{station.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-black bg-slate-700 text-slate-300">
                        Space #{station.spaceIndex}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs mt-1 text-slate-400">
                      <span>{transitTypeLabel}</span>
                      <span>•</span>
                      {isOwnedByMe ? (
                        <span className="text-emerald-400 font-medium">Your Station</span>
                      ) : owner ? (
                        <span className="text-rose-300">Owned by {owner.name}</span>
                      ) : (
                        <span className="text-amber-300 font-medium">Unowned ($200 to Buy)</span>
                      )}
                    </div>
                  </div>

                  <button
                    id={`btn-transit-to-${station.spaceIndex}`}
                    disabled={!canAfford}
                    onClick={() => onSelectTransit(station.spaceIndex, cost, station.name)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-md active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Board</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            id="btn-decline-transit"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            Stay at Current Station
          </button>
        </div>
      </div>
    </div>
  );
}
