'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Building2,
  Sparkles,
  HelpCircle,
  Coins,
  X,
  Layers,
  Train,
  Zap,
  Info,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { Property, Wildcard, ColorGroup } from '@/types/monopoly';
import { INITIAL_PROPERTIES } from '@/lib/boardData';
import { ALL_WILDCARDS } from '@/lib/wildcards';
import { ALL_CHANCE_CARDS, ChanceCard } from '@/lib/chanceCards';
import { ALL_COMMUNITY_CHEST_CARDS, CommunityChestCard } from '@/lib/communityChestCards';
import { PROPERTY_SET_THEMES, COLOR_HEX_STR } from '@/lib/propertyThemes';
import { soundFx } from '@/lib/sound';

export type CardCategory = 'PROPERTIES' | 'WILDCARDS' | 'CHANCE' | 'COMMUNITY_CHEST';

// Distinct location character lore matching in-game theme engine
const PROPERTY_LORE: Record<string, string> = {
  Brown: 'HISTORIC SEAPORT • OLD QUARTER',
  LightBlue: 'COASTAL HARBOR • NAUTICAL PIER',
  Pink: 'THEATER ROW • ARTS DISTRICT',
  Orange: 'METROPOLITAN • DOWNTOWN',
  Red: 'ENTERTAINMENT • NIGHTLIFE BOULEVARD',
  Yellow: 'GARDEN HEIGHTS • UPTOWN ESTATES',
  Green: 'PROMENADE • FINANCIAL DISTRICT',
  DarkBlue: 'HIGH PRESTIGE • LUXURY WATERFRONT',
  Railroad: 'CONTINENTAL TRANSIT • COMMUTER NETWORK',
  Utility: 'MUNICIPAL POWER & WATER • ESSENTIAL GRIDS',
};

export const CardGalleryTab: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CardCategory>('PROPERTIES');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyColorFilter, setPropertyColorFilter] = useState<'ALL' | ColorGroup>('ALL');
  const [wildcardTypeFilter, setWildcardTypeFilter] = useState<'ALL' | 'Core' | 'Super'>('ALL');
  const [inspectCard, setInspectCard] = useState<
    | { type: 'PROPERTY'; data: Property }
    | { type: 'WILDCARD'; data: Wildcard }
    | { type: 'CHANCE'; data: ChanceCard }
    | { type: 'COMMUNITY_CHEST'; data: CommunityChestCard }
    | null
  >(null);

  // Filtered Properties
  const filteredProperties = useMemo(() => {
    return INITIAL_PROPERTIES.filter((p) => {
      const matchesColor = propertyColorFilter === 'ALL' || p.colorGroup === propertyColorFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.colorGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (PROPERTY_LORE[p.colorGroup] || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesColor && matchesSearch;
    });
  }, [propertyColorFilter, searchQuery]);

  // Filtered Wildcards
  const filteredWildcards = useMemo(() => {
    return ALL_WILDCARDS.filter((w) => {
      const matchesType = wildcardTypeFilter === 'ALL' || w.type === wildcardTypeFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.executionType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [wildcardTypeFilter, searchQuery]);

  // Filtered Chance
  const filteredChance = useMemo(() => {
    return ALL_CHANCE_CARDS.filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(query) ||
        c.subTitle.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.actionType.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  // Filtered Community Chest
  const filteredChest = useMemo(() => {
    return ALL_COMMUNITY_CHEST_CARDS.filter((c) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(query) ||
        c.subTitle.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.actionType.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

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
    <div className="space-y-5">
      {/* Top Controls: Category Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            id="card-tab-properties"
            onClick={() => {
              soundFx.playCardDraw();
              setActiveCategory('PROPERTIES');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeCategory === 'PROPERTIES'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>PROPERTIES ({INITIAL_PROPERTIES.length})</span>
          </button>

          <button
            id="card-tab-wildcards"
            onClick={() => {
              soundFx.playCardDraw();
              setActiveCategory('WILDCARDS');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeCategory === 'WILDCARDS'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>WILDCARDS ({ALL_WILDCARDS.length})</span>
          </button>

          <button
            id="card-tab-chance"
            onClick={() => {
              soundFx.playCardDraw();
              setActiveCategory('CHANCE');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeCategory === 'CHANCE'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>CHANCE ({ALL_CHANCE_CARDS.length})</span>
          </button>

          <button
            id="card-tab-chest"
            onClick={() => {
              soundFx.playCardDraw();
              setActiveCategory('COMMUNITY_CHEST');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeCategory === 'COMMUNITY_CHEST'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>COMMUNITY CHEST ({ALL_COMMUNITY_CHEST_CARDS.length})</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="card-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards by name, effect..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-Filters: Color Group Filter for Properties */}
      {activeCategory === 'PROPERTIES' && (
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" /> District:
          </span>
          <button
            onClick={() => {
              soundFx.playCardDraw();
              setPropertyColorFilter('ALL');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              propertyColorFilter === 'ALL'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All (28)
          </button>
          {colorGroups.map((group) => {
            const count = INITIAL_PROPERTIES.filter((p) => p.colorGroup === group).length;
            const hex = COLOR_HEX_STR[group] || '#475569';
            return (
              <button
                key={group}
                onClick={() => {
                  soundFx.playCardDraw();
                  setPropertyColorFilter(group);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  propertyColorFilter === group
                    ? 'border-white text-white shadow-sm'
                    : 'border-transparent text-slate-300 bg-slate-800 hover:bg-slate-700'
                }`}
                style={{
                  backgroundColor: propertyColorFilter === group ? hex : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <span>
                  {group} ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sub-Filters: Type Filter for Wildcards */}
      {activeCategory === 'WILDCARDS' && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Tier:
          </span>
          {(['ALL', 'Core', 'Super'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => {
                soundFx.playCardDraw();
                setWildcardTypeFilter(tier);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                wildcardTypeFilter === tier
                  ? 'bg-purple-500 text-white shadow-sm shadow-purple-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tier === 'ALL' ? 'All Wildcards (21)' : `${tier} Cards`}
            </button>
          ))}
        </div>
      )}

      {/* GRID DISPLAY OF CARDS */}
      <div className="space-y-4">
        {/* Helper count banner */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Showing{' '}
            <strong className="text-amber-300">
              {activeCategory === 'PROPERTIES' && filteredProperties.length}
              {activeCategory === 'WILDCARDS' && filteredWildcards.length}
              {activeCategory === 'CHANCE' && filteredChance.length}
              {activeCategory === 'COMMUNITY_CHEST' && filteredChest.length}
            </strong>{' '}
            cards rendered in exact in-game presentation.
          </span>
          <span className="text-[11px] text-slate-500 italic hidden sm:inline">
            Click any card to inspect high-resolution details
          </span>
        </div>

        {/* 1. PROPERTIES GRID */}
        {activeCategory === 'PROPERTIES' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProperties.map((prop) => (
              <PropertyCardView
                key={prop.id}
                property={prop}
                onClick={() => {
                  soundFx.playCardDraw();
                  setInspectCard({ type: 'PROPERTY', data: prop });
                }}
              />
            ))}
          </div>
        )}

        {/* 2. WILDCARDS GRID */}
        {activeCategory === 'WILDCARDS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredWildcards.map((wc) => (
              <WildcardCardView
                key={wc.id}
                wildcard={wc}
                onClick={() => {
                  soundFx.playCardDraw();
                  setInspectCard({ type: 'WILDCARD', data: wc });
                }}
              />
            ))}
          </div>
        )}

        {/* 3. CHANCE GRID */}
        {activeCategory === 'CHANCE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {filteredChance.map((card) => (
              <ChanceCardView
                key={card.id}
                card={card}
                onClick={() => {
                  soundFx.playCardDraw();
                  setInspectCard({ type: 'CHANCE', data: card });
                }}
              />
            ))}
          </div>
        )}

        {/* 4. COMMUNITY CHEST GRID */}
        {activeCategory === 'COMMUNITY_CHEST' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {filteredChest.map((card) => (
              <CommunityChestCardView
                key={card.id}
                card={card}
                onClick={() => {
                  soundFx.playCardDraw();
                  setInspectCard({ type: 'COMMUNITY_CHEST', data: card });
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* INSPECT MODAL OVERLAY */}
      {inspectCard && (
        <div
          onClick={() => setInspectCard(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-sm w-full animate-in zoom-in-95 duration-200 cursor-default"
          >
            {inspectCard.type === 'PROPERTY' && (
              <PropertyCardView property={inspectCard.data} isEnlarged />
            )}
            {inspectCard.type === 'WILDCARD' && (
              <WildcardCardView wildcard={inspectCard.data} isEnlarged />
            )}
            {inspectCard.type === 'CHANCE' && (
              <ChanceCardView card={inspectCard.data} isEnlarged />
            )}
            {inspectCard.type === 'COMMUNITY_CHEST' && (
              <CommunityChestCardView card={inspectCard.data} isEnlarged />
            )}

            {/* Bottom Close Bar */}
            <div className="mt-3 text-center">
              <button
                onClick={() => setInspectCard(null)}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition cursor-pointer active:scale-95"
              >
                Close Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 1. PROPERTY TITLE DEED CARD VIEW (Authentic Board Card Replica)
// ============================================================================
interface PropertyCardViewProps {
  property: Property;
  onClick?: () => void;
  isEnlarged?: boolean;
}

export const PropertyCardView: React.FC<PropertyCardViewProps> = ({
  property,
  onClick,
  isEnlarged = false,
}) => {
  const headerBg = COLOR_HEX_STR[property.colorGroup] || '#475569';
  const theme = PROPERTY_SET_THEMES[property.colorGroup];
  const lore = theme?.lore || PROPERTY_LORE[property.colorGroup] || property.colorGroup;
  const motif = theme?.motif || '★ LUXURY DEED ★';
  const isRailroad = property.colorGroup === 'Railroad';
  const isUtility = property.colorGroup === 'Utility';
  const isOwned = property.ownerId !== null;

  // Resolve font family from theme specification
  const getThemeFontFamily = (group: string) => {
    switch (group) {
      case 'Brown':
        return "'Special Elite', 'Rockwell', 'Courier New', serif";
      case 'LightBlue':
        return "'Montserrat', 'Century Gothic', 'Trebuchet MS', sans-serif";
      case 'Pink':
        return "'Playfair Display', 'Didot', 'Baskerville', serif";
      case 'Orange':
        return "'Impact', 'Franklin Gothic Heavy', 'Arial Black', sans-serif";
      case 'Red':
        return "'Rockwell', 'Clarendon', 'Georgia', serif";
      case 'Yellow':
        return "'Cinzel', 'Palatino Linotype', 'Georgia', serif";
      case 'Green':
        return "'Cinzel Decorative', 'Cinzel', 'Times New Roman', serif";
      case 'DarkBlue':
        return "'Playfair Display', 'Didot', 'Cinzel', serif";
      case 'Railroad':
        return "'Impact', 'Trebuchet MS', sans-serif";
      case 'Utility':
        return "'Courier New', monospace";
      default:
        return "'Plus Jakarta Sans', system-ui, sans-serif";
    }
  };

  const fontFamily = getThemeFontFamily(property.colorGroup);

  return (
    <div
      onClick={onClick}
      className={`bg-[#FAF7EE] border-2 border-[#D6CBB8] rounded-2xl shadow-md overflow-hidden flex flex-col justify-between text-slate-800 select-none transition-all duration-200 ${
        isEnlarged
          ? 'w-full shadow-2xl scale-100 ring-4 ring-amber-400/50'
          : 'hover:-translate-y-1.5 hover:shadow-xl hover:border-amber-500 cursor-pointer h-full'
      }`}
    >
      {/* Top Banner (Color bar with property name in set's thematic typography) */}
      <div
        className="px-3 py-3 text-center border-b-2 border-slate-900/40 shadow-inner flex flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: headerBg }}
      >
        {/* Motif Badge */}
        <div className="text-[9px] font-black uppercase tracking-widest text-white/95 px-2 py-0.5 rounded-full bg-black/25 mb-1 backdrop-blur-xs">
          {motif}
        </div>

        <span className="block text-[9px] font-black uppercase tracking-widest text-white/80">
          TITLE DEED
        </span>

        <h3
          className="text-lg sm:text-xl font-black text-white uppercase tracking-tight leading-snug drop-shadow-md text-center break-words px-1 max-w-full"
          style={{ fontFamily }}
        >
          {property.name}
        </h3>
      </div>

      {/* Subheader: Authentic Board District Lore & Set Identification */}
      <div className="bg-[#EFE9DA] px-3 py-1 text-center border-b border-[#D6CBB8] flex items-center justify-center gap-1.5">
        <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
          {lore}
        </span>
      </div>

      {/* Body: Rent Table */}
      <div className="p-3 flex-1 flex flex-col justify-center space-y-1 font-mono text-xs">
        {isRailroad ? (
          <div className="space-y-1.5 py-2 text-slate-700">
            <div className="flex items-center justify-between pb-1 border-b border-[#D6CBB8]">
              <span className="font-sans font-bold text-slate-600">Rent</span>
              <span className="font-black text-slate-900">$25</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-slate-600">If 2 R.R.&apos;s owned</span>
              <span className="font-black text-slate-900">$50</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-slate-600">If 3 R.R.&apos;s owned</span>
              <span className="font-black text-slate-900">$100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-sans text-slate-600">If 4 R.R.&apos;s owned</span>
              <span className="font-black text-slate-900">$200</span>
            </div>
          </div>
        ) : isUtility ? (
          <div className="space-y-2 py-3 text-slate-700 text-center">
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-slate-700 space-y-1 font-sans">
              <p className="font-bold text-sky-900">1 Utility Owned:</p>
              <p className="font-mono font-bold text-slate-900">4 × Amount Shown on Dice</p>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-slate-700 space-y-1 font-sans">
              <p className="font-bold text-sky-900">Both Utilities Owned:</p>
              <p className="font-mono font-bold text-slate-900">10 × Amount Shown on Dice</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-slate-700">
            <div className="flex items-center justify-between pb-1 border-b border-[#D6CBB8] font-bold">
              <span className="font-sans text-slate-600">Base Rent</span>
              <span className="text-slate-950 font-black">${property.rentLevels?.[0] ?? property.baseRent}</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#EAE2D0]">
              <span className="font-sans text-slate-600">With 1 House</span>
              <span className="font-bold text-slate-900">${property.rentLevels?.[1] ?? property.baseRent * 5}</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-0.5">
              <span className="font-sans text-slate-600">With 2 Houses</span>
              <span className="font-bold text-slate-900">${property.rentLevels?.[2] ?? property.baseRent * 15}</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-0.5 rounded bg-[#EAE2D0]">
              <span className="font-sans text-slate-600">With 3 Houses</span>
              <span className="font-bold text-slate-900">${property.rentLevels?.[3] ?? property.baseRent * 45}</span>
            </div>
            <div className="flex items-center justify-between px-1.5 py-0.5">
              <span className="font-sans text-slate-600">With 4 Houses</span>
              <span className="font-bold text-slate-900">${property.rentLevels?.[4] ?? property.baseRent * 80}</span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-rose-100 border border-rose-300 font-bold text-rose-900">
              <span className="font-sans uppercase text-[11px] tracking-wide">With HOTEL</span>
              <span className="font-black text-rose-700 font-mono">${property.rentLevels?.[5] ?? property.baseRent * 125}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Details: House Cost, Mortgage, Price/Cost */}
      <div className="p-3 bg-[#EFE9DA] border-t border-[#D6CBB8] space-y-1.5 text-center">
        {!isRailroad && !isUtility && (
          <div className="text-[11px] font-sans font-bold text-slate-700">
            Houses Cost <strong className="text-slate-950">${property.houseCost}</strong> each
          </div>
        )}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 pt-1 border-t border-[#D6CBB8]">
          <span>Mortgage: ${Math.round(property.basePrice / 2)}</span>

          {/* Owned Cost vs Purchase Price: Red & Negative when owned */}
          {isOwned ? (
            <span className="font-bold text-rose-600 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <span className="uppercase text-[10px]">Cost:</span>
              <span className="font-mono font-black">-${property.basePrice}</span>
            </span>
          ) : (
            <span className="font-bold text-slate-800 bg-slate-200/80 border border-slate-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <span className="text-[10px]">Price:</span>
              <span className="font-mono font-black">${property.basePrice}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. WILDCARD CARD VIEW (In-game rainbow gradient outline & dark slate core)
// ============================================================================
interface WildcardCardViewProps {
  wildcard: Wildcard;
  onClick?: () => void;
  isEnlarged?: boolean;
}

export const WildcardCardView: React.FC<WildcardCardViewProps> = ({
  wildcard,
  onClick,
  isEnlarged = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-[3px] rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 via-blue-500 via-emerald-500 via-amber-500 to-red-500 shadow-lg select-none transition-all duration-200 ${
        isEnlarged
          ? 'w-full shadow-2xl scale-100'
          : 'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-purple-500/20 cursor-pointer h-full'
      }`}
    >
      <div className="bg-slate-900 rounded-[14px] p-3.5 flex flex-col justify-between h-full min-h-[340px] text-white">
        {/* Title Box */}
        <div>
          <div className="bg-white text-slate-950 font-black text-center py-2 px-3 rounded-xl uppercase tracking-wider text-base sm:text-lg shadow-md break-words max-w-full leading-snug">
            {wildcard.name}
          </div>

          {/* Type & Duration Badge */}
          <div className="flex items-center justify-between mt-2.5 px-1 text-[11px] font-bold text-emerald-300">
            <span className="bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-md">
              {wildcard.type.toUpperCase()} CARD
            </span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
              {wildcard.duration}
            </span>
          </div>
        </div>

        {/* Description Box */}
        <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-3 my-3 flex-1 flex flex-col justify-center text-center">
          <p className="text-xs text-slate-100 font-medium leading-relaxed">
            {wildcard.description}
          </p>
        </div>

        {/* Action Specs / Footer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>Phase: {wildcard.executionType}</span>
            <span>Target: {wildcard.targetRequired || 'NONE'}</span>
          </div>

          <div className="bg-slate-950 border border-cyan-500/50 rounded-xl py-1.5 text-center text-xs font-mono font-black text-cyan-400 uppercase tracking-wider shadow-sm">
            PLAY WILDCARD
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. CHANCE CARD VIEW (In-game vibrant orange double border with "?" emblem)
// ============================================================================
interface ChanceCardViewProps {
  card: ChanceCard;
  onClick?: () => void;
  isEnlarged?: boolean;
}

export const ChanceCardView: React.FC<ChanceCardViewProps> = ({
  card,
  onClick,
  isEnlarged = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#FFFDF9] border-4 border-orange-600 rounded-2xl shadow-md ring-2 ring-orange-200/80 p-3.5 flex flex-col justify-between text-stone-900 select-none transition-all duration-200 ${
        isEnlarged
          ? 'w-full shadow-2xl scale-100 ring-4 ring-orange-400'
          : 'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-orange-500/20 cursor-pointer h-full min-h-[320px]'
      }`}
    >
      {/* Header Banner */}
      <div className="bg-orange-600 text-white font-black text-center py-1.5 px-3 rounded-xl uppercase tracking-widest text-xs shadow-sm flex items-center justify-center gap-1.5">
        <span>★ CHANCE ★</span>
      </div>

      {/* Category / Subtitle */}
      {card.subTitle && (
        <div className="text-[11px] font-black text-amber-900 text-center uppercase tracking-wide pt-1">
          {card.subTitle}
        </div>
      )}

      {/* Emblem Badge (?) */}
      <div className="w-12 h-12 rounded-full bg-orange-100 border-2 border-orange-500 mx-auto flex items-center justify-center text-orange-600 font-black text-2xl shadow-inner my-1">
        ?
      </div>

      {/* Main Card Title */}
      <div className="text-center font-black text-stone-900 text-base sm:text-lg uppercase tracking-tight px-2 break-words max-w-full leading-snug">
        {card.title}
      </div>

      {/* Description Box */}
      <div className="bg-orange-50/90 border border-orange-200 rounded-xl p-3 my-2 text-center text-xs text-stone-800 font-medium leading-relaxed flex-1 flex items-center justify-center">
        {card.description}
      </div>

      {/* Action / Target Badge */}
      <div className="bg-orange-100/90 border border-orange-200 rounded-lg py-1 px-2 text-center text-[10px] font-mono font-bold text-orange-950 uppercase tracking-wide">
        Action: {card.actionType.replace(/_/g, ' ')}
        {card.targetSpaceIndex !== undefined && ` • Space #${card.targetSpaceIndex}`}
        {card.amount !== undefined && ` • $${card.amount}`}
      </div>
    </div>
  );
};

// ============================================================================
// 4. COMMUNITY CHEST CARD VIEW (In-game amber/gold double border with chest emblem)
// ============================================================================
interface CommunityChestCardViewProps {
  card: CommunityChestCard;
  onClick?: () => void;
  isEnlarged?: boolean;
}

export const CommunityChestCardView: React.FC<CommunityChestCardViewProps> = ({
  card,
  onClick,
  isEnlarged = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#FFFBEE] border-4 border-amber-600 rounded-2xl shadow-md ring-2 ring-amber-200/80 p-3.5 flex flex-col justify-between text-stone-900 select-none transition-all duration-200 ${
        isEnlarged
          ? 'w-full shadow-2xl scale-100 ring-4 ring-amber-400'
          : 'hover:-translate-y-1.5 hover:shadow-xl hover:shadow-amber-500/20 cursor-pointer h-full min-h-[320px]'
      }`}
    >
      {/* Header Banner */}
      <div className="bg-amber-600 text-white font-black text-center py-1.5 px-3 rounded-xl uppercase tracking-widest text-xs shadow-sm flex items-center justify-center gap-1.5">
        <span>★ COMMUNITY CHEST ★</span>
      </div>

      {/* Category / Subtitle */}
      {card.subTitle && (
        <div className="text-[11px] font-black text-amber-900 text-center uppercase tracking-wide pt-1">
          {card.subTitle}
        </div>
      )}

      {/* Emblem Badge (Chest Icon / Coins) */}
      <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-500 mx-auto flex items-center justify-center text-amber-600 font-black text-xl shadow-inner my-1">
        💼
      </div>

      {/* Main Card Title */}
      <div className="text-center font-black text-stone-900 text-base sm:text-lg uppercase tracking-tight px-2 break-words max-w-full leading-snug">
        {card.title}
      </div>

      {/* Description Box */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 my-2 text-center text-xs text-stone-800 font-medium leading-relaxed flex-1 flex items-center justify-center">
        {card.description}
      </div>

      {/* Action / Amount Badge */}
      <div className="bg-amber-100/90 border border-amber-200 rounded-lg py-1 px-2 text-center text-[10px] font-mono font-bold text-amber-950 uppercase tracking-wide">
        Action: {card.actionType.replace(/_/g, ' ')}
        {card.amount !== undefined && ` • $${card.amount}`}
      </div>
    </div>
  );
};
