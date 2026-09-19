'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, Flame, Check, X, Search, RotateCcw, SlidersHorizontal, CheckSquare, Square } from 'lucide-react';
import { ALL_WILDCARDS } from '@/lib/wildcards';
import { Wildcard } from '@/types/monopoly';

export interface WildcardDeckCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  enabledWildcardIds?: string[];
  onSaveEnabledWildcardIds: (ids: string[]) => void;
}

function WildcardDeckCustomizerContent({
  onClose,
  enabledWildcardIds,
  onSaveEnabledWildcardIds,
}: Omit<WildcardDeckCustomizerModalProps, 'isOpen'>) {
  // If undefined, all cards are active by default
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return enabledWildcardIds !== undefined
      ? [...enabledWildcardIds]
      : ALL_WILDCARDS.map((c) => c.id);
  });

  const [activeTab, setActiveTab] = useState<'ALL' | 'CORE' | 'SUPER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCard = (cardId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(ALL_WILDCARDS.map((c) => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleRestoreDefaults = () => {
    setSelectedIds(ALL_WILDCARDS.map((c) => c.id));
  };

  const handleSave = () => {
    onSaveEnabledWildcardIds(selectedIds);
    onClose();
  };

  const filteredCards = ALL_WILDCARDS.filter((card) => {
    if (activeTab === 'CORE' && card.type !== 'Core') return false;
    if (activeTab === 'SUPER' && card.type !== 'Super') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        card.name.toLowerCase().includes(q) ||
        card.description.toLowerCase().includes(q) ||
        card.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const coreCount = ALL_WILDCARDS.filter((c) => c.type === 'Core').length;
  const superCount = ALL_WILDCARDS.filter((c) => c.type === 'Super').length;
  const totalSelected = selectedIds.length;

  return (
    <div
      id="wildcard-customizer-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        id="wildcard-customizer-modal-container"
        className="bg-slate-950/95 border border-purple-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between shrink-0 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-inner">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/30">
                  House Rules Deck Curation
                </span>
                <span className="text-[10px] font-bold text-amber-400">
                  {totalSelected} / {ALL_WILDCARDS.length} Cards Active
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                Customize Wildcards & Super Wildcards
              </h2>
            </div>
          </div>
          <button
            id="btn-close-wildcard-customizer"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex-1 sm:flex-initial text-center ${
                activeTab === 'ALL'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({ALL_WILDCARDS.length})
            </button>
            <button
              onClick={() => setActiveTab('CORE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex-1 sm:flex-initial text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'CORE'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Core ({coreCount})
            </button>
            <button
              onClick={() => setActiveTab('SUPER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex-1 sm:flex-initial text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'SUPER'
                  ? 'bg-pink-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-pink-300" />
              Super ({superCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search wildcards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center justify-between pb-2 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="hover:text-white underline cursor-pointer flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Enable All
            </button>
            <span>•</span>
            <button
              onClick={handleDeselectAll}
              className="hover:text-white underline cursor-pointer flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5 text-rose-400" /> Disable All
            </button>
          </div>
          <button
            onClick={handleRestoreDefaults}
            className="hover:text-amber-300 transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Defaults
          </button>
        </div>

        {/* Scrollable Card List */}
        <div className="flex-1 overflow-y-auto pr-1.5 space-y-2">
          {filteredCards.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching wildcards found.
            </div>
          ) : (
            filteredCards.map((card) => {
              const isEnabled = selectedIds.includes(card.id);
              const isSuper = card.type === 'Super';

              return (
                <div
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer select-none flex items-start justify-between gap-3 ${
                    isEnabled
                      ? isSuper
                        ? 'bg-purple-950/40 border-purple-500/50 shadow-sm'
                        : 'bg-amber-950/30 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900/40 border-slate-800/80 opacity-50'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">
                        {card.name}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                          isSuper
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {card.type}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {card.weight || 1}x in deck
                      </span>
                      <span className="text-[10px] text-slate-400">
                        • {card.duration === 'Permanent' ? 'Passive' : 'One-Time'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  {/* Toggle Checkbox / Indicator */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition ${
                      isEnabled
                        ? isSuper
                          ? 'bg-purple-500 border-purple-400 text-white'
                          : 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'bg-slate-800 border-slate-700 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4 font-black" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {totalSelected === 0 ? (
              <span className="text-rose-400 font-bold">⚠️ Warning: Wildcard deck will be empty</span>
            ) : (
              <span>{totalSelected} cards will be shuffled into the match deck</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-save-wildcard-selection"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg transition cursor-pointer"
            >
              Apply Deck Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WildcardDeckCustomizerModal({
  isOpen,
  onClose,
  enabledWildcardIds,
  onSaveEnabledWildcardIds,
}: WildcardDeckCustomizerModalProps) {
  if (!isOpen) return null;

  return (
    <WildcardDeckCustomizerContent
      key={enabledWildcardIds ? enabledWildcardIds.join(',') : 'all'}
      onClose={onClose}
      enabledWildcardIds={enabledWildcardIds}
      onSaveEnabledWildcardIds={onSaveEnabledWildcardIds}
    />
  );
}
