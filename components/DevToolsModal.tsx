'use client';

import React, { useState } from 'react';
import {
  Wrench,
  X,
  FastForward,
  MapPin,
  Building2,
  Sparkles,
  HelpCircle,
  Gift,
  Coins,
  ShieldCheck,
  User,
  Plus,
  Minus,
  Check,
  Zap,
  RotateCcw,
  ArrowRight,
  Sliders,
  ChevronRight,
  Lock,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Player, Property, BoardSpace, Wildcard, ColorGroup } from '@/types/monopoly';
import { INITIAL_BOARD_SPACES, INITIAL_PROPERTIES } from '@/lib/boardData';
import { ALL_WILDCARDS } from '@/lib/wildcards';
import { ALL_CHANCE_CARDS, ChanceCard } from '@/lib/chanceCards';
import { ALL_COMMUNITY_CHEST_CARDS, CommunityChestCard } from '@/lib/communityChestCards';
import { PROPERTY_SET_THEMES } from '@/lib/propertyThemes';
import { soundFx } from '@/lib/sound';

export interface DevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  activePlayerId: number;
  properties: Property[];
  boardSpaces: BoardSpace[];
  onTeleportPlayer: (spaceIdx: number, triggerLanding?: boolean) => void;
  onAcquireProperty: (propertyId: string, targetPlayerId: number) => void;
  onAcquireColorSet: (colorGroup: ColorGroup, targetPlayerId: number) => void;
  onAcquireAllProperties: (targetPlayerId: number) => void;
  onUpdatePlayerCash: (playerId: number, amountDelta: number) => void;
  onSetPlayerCash: (playerId: number, exactAmount: number) => void;
  onSetPropertyBuildings: (propertyId: string, houses: number, hotel: boolean) => void;
  onToggleMortgage: (propertyId: string) => void;
  onTransferProperty: (propertyId: string, newOwnerId: number | null) => void;
  onAddWildcard: (wildcardId: string, targetPlayerId: number) => void;
  onTriggerChanceCard: (card: ChanceCard) => void;
  onTriggerCommunityChestCard: (card: CommunityChestCard) => void;
  onSkipStraightToMyTurn: () => void;
  onToggleJailStatus: (playerId: number) => void;
  isTimerDisabled?: boolean;
  onToggleTimerDisabled?: () => void;
  onBankruptPlayer?: (playerId: number) => void;
  onSetSpreeTimer?: (seconds: number, phase: 1 | 2) => void;
}

type DevTab = 'TELEPORT' | 'PROPERTIES' | 'WILDCARDS' | 'CHANCE' | 'CHEST' | 'PLAYERS' | 'SETTINGS';

export const DevToolsModal: React.FC<DevToolsModalProps> = ({
  isOpen,
  onClose,
  players,
  activePlayerId,
  properties,
  boardSpaces,
  onTeleportPlayer,
  onAcquireProperty,
  onAcquireColorSet,
  onAcquireAllProperties,
  onUpdatePlayerCash,
  onSetPlayerCash,
  onSetPropertyBuildings,
  onToggleMortgage,
  onTransferProperty,
  onAddWildcard,
  onTriggerChanceCard,
  onTriggerCommunityChestCard,
  onSkipStraightToMyTurn,
  onToggleJailStatus,
  isTimerDisabled = false,
  onToggleTimerDisabled,
  onBankruptPlayer,
  onSetSpreeTimer,
}) => {
  const [activeTab, setActiveTab] = useState<DevTab>('TELEPORT');
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(0);
  const [propertyColorFilter, setPropertyColorFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customCashInput, setCustomCashInput] = useState<Record<number, string>>({});

  if (!isOpen) return null;

  const humanPlayer = players.find((p) => p.id === 0) || players[0];
  const targetPlayer = players.find((p) => p.id === selectedPlayerId) || humanPlayer;

  // Group properties by color
  const colorGroups: ColorGroup[] = [
    'Brown',
    'LightBlue',
    'Pink',
    'Orange',
    'Red',
    'Yellow',
    'Green',
    'DarkBlue',
    'Railroad',
    'Utility',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-5xl h-[88vh] max-h-[780px] shadow-2xl shadow-black flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold shadow-md shadow-amber-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  Developer Control Center
                </h2>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Dev Mode Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Board Teleportation, Instant Card Acquisition, Player Economy & Instant Turn Skip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Timer Toggle Button */}
            <button
              id="dev-btn-toggle-timer"
              onClick={() => {
                soundFx.playCardDraw();
                onToggleTimerDisabled?.();
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                isTimerDisabled
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
              }`}
              title="Toggle 30-second turn countdown timer"
            >
              <Clock className="w-4 h-4" />
              <span>Turn Timer: {isTimerDisabled ? 'OFF' : 'ON'}</span>
            </button>

            {/* Instant Skip to My Turn Button */}
            <button
              id="dev-btn-skip-to-my-turn"
              onClick={() => {
                soundFx.playCardDraw();
                onSkipStraightToMyTurn();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 border border-amber-400 active:scale-95 transition-all cursor-pointer"
              title="Instantly execute all bot turns in rapid sequence and return to player turn"
            >
              <FastForward className="w-4 h-4 fill-slate-950" />
              <span>Skip Straight to My Turn</span>
            </button>

            <button
              id="dev-btn-close"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Context Selector Bar */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              Apply Actions To:
            </span>
            <div className="flex items-center gap-1.5">
              {players.map((p) => {
                const isSelected = p.id === selectedPlayerId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span>{p.name}</span>
                    {p.id === 0 && (
                      <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded">
                        YOU
                      </span>
                    )}
                    <span className="font-mono text-emerald-400 font-black">${p.cash}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Active Turn:</span>
            <span className="font-black text-amber-400">
              {players.find((p) => p.id === activePlayerId)?.name || 'Player 1'}
            </span>
            {activePlayerId !== 0 && (
              <span className="text-[10px] text-rose-400 font-bold bg-rose-950/60 border border-rose-800 px-1.5 py-0.5 rounded">
                BOT TURN
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 shrink-0 overflow-x-auto">
          {[
            { id: 'TELEPORT', label: 'Teleport Space', icon: MapPin },
            { id: 'PROPERTIES', label: 'Properties & Deeds', icon: Building2 },
            { id: 'WILDCARDS', label: 'Wildcards', icon: Sparkles },
            { id: 'CHANCE', label: 'Chance Cards', icon: HelpCircle },
            { id: 'CHEST', label: 'Community Chest', icon: Gift },
            { id: 'PLAYERS', label: 'Players & Cash', icon: Coins },
            { id: 'SETTINGS', label: 'Rules & Timer', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DevTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
          {/* =========================================================================
              TAB 1: TELEPORT TO ANY SPACE
          ========================================================================= */}
          {activeTab === 'TELEPORT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    Teleport {targetPlayer.name} to Any Space (0 - 39)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Current Position: Index {targetPlayer.position} (
                    {boardSpaces[targetPlayer.position]?.name || 'Unknown'})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                {boardSpaces.map((space) => {
                  const isCurrent = targetPlayer.position === space.index;
                  return (
                    <button
                      key={space.index}
                      onClick={() => {
                        soundFx.playCardDraw();
                        onTeleportPlayer(space.index, true);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/60 text-amber-200'
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                        <span className="font-mono font-bold">#{space.index}</span>
                        <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-slate-800">
                          {space.type}
                        </span>
                      </div>
                      <div className="text-xs font-bold leading-tight line-clamp-2">
                        {space.name}
                      </div>
                      <div className="mt-2 text-[10px] text-amber-400 font-bold flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                        <span>Teleport</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: PROPERTIES (ACQUIRE, MONOPOLIES, BUILDINGS, MORTGAGE)
          ========================================================================= */}
          {activeTab === 'PROPERTIES' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    Property Deed Acquisition & Controls
                  </h3>
                  <p className="text-xs text-slate-400">
                    Acquiring properties grants title deeds directly to{' '}
                    <strong className="text-amber-300">{targetPlayer.name}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      soundFx.playCash();
                      onAcquireAllProperties(targetPlayer.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow transition cursor-pointer"
                  >
                    👑 Give ALL 28 Properties
                  </button>
                </div>
              </div>

              {/* Color Group Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setPropertyColorFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                    propertyColorFilter === 'ALL'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({properties.length})
                </button>
                {colorGroups.map((cg) => (
                  <button
                    key={cg}
                    onClick={() => setPropertyColorFilter(cg)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      propertyColorFilter === cg
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cg}
                  </button>
                ))}
              </div>

              {/* Color Grouped Property Cards */}
              <div className="space-y-4">
                {colorGroups
                  .filter((cg) => propertyColorFilter === 'ALL' || propertyColorFilter === cg)
                  .map((cg) => {
                    const groupProps = properties.filter((p) => p.colorGroup === cg);
                    const allOwnedByTarget =
                      groupProps.length > 0 && groupProps.every((p) => p.ownerId === targetPlayer.id);

                    return (
                      <div
                        key={cg}
                        className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                              {cg} Group ({groupProps.length} properties)
                            </span>
                            {allOwnedByTarget && (
                              <span className="text-[10px] bg-emerald-950/80 border border-emerald-500 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                                Monopoly Owned
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              soundFx.playCash();
                              onAcquireColorSet(cg, targetPlayer.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition cursor-pointer"
                          >
                            + Grant Complete {cg} Monopoly
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {groupProps.map((prop) => {
                            const isOwnedByTarget = prop.ownerId === targetPlayer.id;
                            const owner = players.find((p) => p.id === prop.ownerId);

                            return (
                              <div
                                key={prop.id}
                                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition ${
                                  isOwnedByTarget
                                    ? 'bg-amber-950/20 border-amber-500/50'
                                    : 'bg-slate-900/90 border-slate-800'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-200 truncate pr-2">
                                      {prop.name}
                                    </span>
                                    <span className="font-mono text-slate-400 text-[11px]">
                                      ${prop.basePrice}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 text-[11px]">
                                    <span className="text-slate-500">Owner:</span>
                                    {owner ? (
                                      <span
                                        className="font-bold"
                                        style={{ color: owner.color }}
                                      >
                                        {owner.name}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic">Unowned</span>
                                    )}
                                  </div>
                                </div>

                                {/* Controls */}
                                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                                  {isOwnedByTarget ? (
                                    <>
                                      {/* House controls */}
                                      {!['Railroad', 'Utility'].includes(prop.colorGroup) && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            disabled={prop.houses === 0 && !prop.hotel}
                                            onClick={() => {
                                              if (prop.hotel) {
                                                onSetPropertyBuildings(prop.id, 4, false);
                                              } else {
                                                onSetPropertyBuildings(
                                                  prop.id,
                                                  Math.max(0, (prop.houses || 0) - 1),
                                                  false
                                                );
                                              }
                                            }}
                                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                                          >
                                            -
                                          </button>
                                          <span className="font-mono text-[10px] font-bold px-1">
                                            {prop.hotel ? '★ Hotel' : `${prop.houses || 0}H`}
                                          </span>
                                          <button
                                            disabled={!!prop.hotel}
                                            onClick={() => {
                                              if (prop.houses === 4) {
                                                onSetPropertyBuildings(prop.id, 0, true);
                                              } else {
                                                onSetPropertyBuildings(
                                                  prop.id,
                                                  Math.min(4, (prop.houses || 0) + 1),
                                                  false
                                                );
                                              }
                                            }}
                                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}

                                      <button
                                        onClick={() => onToggleMortgage(prop.id)}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          prop.isMortgaged
                                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                                            : 'bg-slate-800 text-slate-400'
                                        }`}
                                      >
                                        {prop.isMortgaged ? 'MORTGAGED' : 'MORTGAGE'}
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        soundFx.playCash();
                                        onAcquireProperty(prop.id, targetPlayer.id);
                                      }}
                                      className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider text-center transition cursor-pointer"
                                    >
                                      Take Deed
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: WILDCARDS
          ========================================================================= */}
          {activeTab === 'WILDCARDS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    All Wildcard Cards ({ALL_WILDCARDS.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add wildcards directly into {targetPlayer.name}&apos;s hand.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_WILDCARDS.map((w) => {
                  const isInHand = targetPlayer.wildcardsHand.some((hw) => hw.id === w.id);
                  return (
                    <div
                      key={w.id}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">{w.name}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                              w.type === 'Super'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {w.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          {w.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {w.executionType}
                        </span>
                        <button
                          onClick={() => {
                            soundFx.playCardDraw();
                            onAddWildcard(w.id, targetPlayer.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isInHand ? 'Add Another' : 'Add to Hand'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 4: CHANCE CARDS
          ========================================================================= */}
          {activeTab === 'CHANCE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-orange-400" />
                    All Chance Cards ({ALL_CHANCE_CARDS.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Trigger or execute any Chance card event immediately in-game.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_CHANCE_CARDS.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-orange-950/20 border border-orange-800/40 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-orange-300 uppercase tracking-wide">
                          {c.title}
                        </span>
                        <span className="text-[9px] font-mono text-orange-400/80">
                          {c.actionType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="pt-2 border-t border-orange-900/30 flex justify-end">
                      <button
                        onClick={() => {
                          soundFx.playCardDraw();
                          onTriggerChanceCard(c);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Trigger In Game</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 5: COMMUNITY CHEST CARDS
          ========================================================================= */}
          {activeTab === 'CHEST' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400" />
                    All Community Chest Cards ({ALL_COMMUNITY_CHEST_CARDS.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Trigger or execute any Community Chest event immediately in-game.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_COMMUNITY_CHEST_CARDS.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                          {c.title}
                        </span>
                        <span className="text-[9px] font-mono text-amber-400/80">
                          {c.actionType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="pt-2 border-t border-amber-900/30 flex justify-end">
                      <button
                        onClick={() => {
                          soundFx.playCardDraw();
                          onTriggerCommunityChestCard(c);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 fill-slate-950" />
                        <span>Trigger In Game</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 6: PLAYERS & ECONOMY (MONEY & JAIL CONTROLS)
          ========================================================================= */}
          {activeTab === 'PLAYERS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    Player Economy & Bankroll Balances
                  </h3>
                  <p className="text-xs text-slate-400">
                    Directly adjust cash reserves, jail status, and properties for every player.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {players.map((p) => {
                  const ownedProps = properties.filter((prop) => prop.ownerId === p.id);
                  const inputValue = customCashInput[p.id] ?? '';

                  return (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="text-sm font-black text-white">{p.name}</span>
                            {p.id === 0 ? (
                              <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                                YOU
                              </span>
                            ) : (
                              <span className="text-[9px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded">
                                BOT
                              </span>
                            )}
                          </div>
                          <div className="text-base font-black text-emerald-400 font-mono">
                            ${p.cash}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                          <span>Properties Owned: {ownedProps.length}</span>
                          <span>•</span>
                          <span>Position: #{p.position}</span>
                          <span>•</span>
                          <span className={p.inJail ? 'text-rose-400 font-bold' : ''}>
                            {p.inJail ? 'IN JAIL' : 'FREE'}
                          </span>
                        </div>
                      </div>

                      {/* Cash Adjustment Quick Buttons */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="text-[11px] font-bold text-slate-400">Quick Adjust Cash:</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              soundFx.playCash();
                              onUpdatePlayerCash(p.id, 500);
                            }}
                            className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-emerald-900/80 cursor-pointer"
                          >
                            +$500
                          </button>
                          <button
                            onClick={() => {
                              soundFx.playCash();
                              onUpdatePlayerCash(p.id, 2000);
                            }}
                            className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-emerald-900/80 cursor-pointer"
                          >
                            +$2,000
                          </button>
                          <button
                            onClick={() => {
                              soundFx.playCash();
                              onUpdatePlayerCash(p.id, -500);
                            }}
                            className="px-2 py-1 rounded bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold text-xs hover:bg-rose-900/80 cursor-pointer"
                          >
                            -$500
                          </button>
                          <button
                            onClick={() => {
                              soundFx.playCash();
                              onSetPlayerCash(p.id, 10000);
                            }}
                            className="px-2 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-900/80 cursor-pointer"
                          >
                            Set $10,000
                          </button>
                          <button
                            onClick={() => onToggleJailStatus(p.id)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                          >
                            {p.inJail ? 'Release from Jail' : 'Send to Jail'}
                          </button>
                          {onBankruptPlayer && !p.isBankrupt && (
                            <button
                              onClick={() => onBankruptPlayer(p.id)}
                              className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-600/50 text-rose-300 font-bold text-xs cursor-pointer"
                              title="Instantly declare this player bankrupt to test victory conditions"
                            >
                              💀 Bankrupt Player
                            </button>
                          )}
                        </div>

                        {/* Custom cash input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="number"
                            placeholder="Exact Cash $"
                            value={inputValue}
                            onChange={(e) =>
                              setCustomCashInput((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                          />
                          <button
                            onClick={() => {
                              const val = parseInt(inputValue, 10);
                              if (!isNaN(val)) {
                                soundFx.playCash();
                                onSetPlayerCash(p.id, val);
                                setCustomCashInput((prev) => ({ ...prev, [p.id]: '' }));
                              }
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 7: SETTINGS & TIMER CONTROLS
          ========================================================================= */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Turn Timer &amp; Gameplay Rules
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure real-time gameplay rules and developer overrides
                  </p>
                </div>
              </div>

              {/* Turn Timer Setting Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">30-Second Turn Countdown Timer</h4>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        isTimerDisabled
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isTimerDisabled ? 'DISABLED' : 'ENABLED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                    When enabled, human players have 30 seconds per turn to roll or make landing decisions before auto-actions take over. When disabled, players have unlimited time with no countdown penalty or auto-rolling.
                  </p>
                </div>

                <button
                  id="dev-btn-toggle-timer-setting"
                  onClick={() => {
                    soundFx.playCardDraw();
                    onToggleTimerDisabled?.();
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer shrink-0 border ${
                    isTimerDisabled
                      ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 border-rose-400'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                  }`}
                >
                  {isTimerDisabled ? (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      <span>Timer Disabled</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      <span>Timer Enabled</span>
                    </>
                  )}
                </button>
              </div>

              {/* Great Monopoly Spree Fast-Forward Controls */}
              {onSetSpreeTimer && (
                <div className="p-5 rounded-2xl bg-purple-950/30 border border-purple-800/60 flex flex-col gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                        Great Monopoly Spree Milestone Testing
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        90m &amp; 30m Flow
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Fast-forward the Spree timer to test Phase 1 (2+ property auto-completion &amp; free house) or Phase 2 (30-minute final liquidation &amp; net worth evaluation).
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap pt-1">
                    <button
                      onClick={() => {
                        soundFx.playCardDraw();
                        onSetSpreeTimer(5, 1);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Fast-Forward Phase 1 (5s left of 90m)</span>
                    </button>
                    <button
                      onClick={() => {
                        soundFx.playCardDraw();
                        onSetSpreeTimer(5, 2);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Fast-Forward Phase 2 (5s left of 30m)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
