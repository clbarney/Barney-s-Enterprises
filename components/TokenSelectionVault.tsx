import React from 'react';
import {
  Crown,
  Car,
  Ship,
  Sparkles,
  Dog,
  Footprints,
  Train,
  Award,
  Check,
  Shield,
  Zap,
} from 'lucide-react';
import { TokenShape, Player } from '@/types/monopoly';
import { ALL_PREMIUM_TOKENS, PremiumTokenOption, getPremiumToken } from '@/lib/tokens';
import { soundFx } from '@/lib/sound';

interface TokenSelectionVaultProps {
  selectedTokenShape: TokenShape;
  onSelectTokenShape: (shape: TokenShape) => void;
  players?: Player[];
  isGameActive?: boolean;
}

export const TokenSelectionVault: React.FC<TokenSelectionVaultProps> = ({
  selectedTokenShape,
  onSelectTokenShape,
  players,
  isGameActive = false,
}) => {
  const currentToken = getPremiumToken(selectedTokenShape);

  // Map each token shape to the corresponding Lucide icon component
  const getIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Crown':
        return <Crown className={className} />;
      case 'Car':
        return <Car className={className} />;
      case 'Ship':
        return <Ship className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Dog':
        return <Dog className={className} />;
      case 'Footprints':
        return <Footprints className={className} />;
      case 'Train':
        return <Train className={className} />;
      case 'Award':
      default:
        return <Award className={className} />;
    }
  };

  // Find if an AI player holds this token
  const getHolderInfo = (token: PremiumTokenOption) => {
    if (!players || players.length === 0) return null;
    const holder = players.find((p) => p.tokenShape === token.id);
    if (!holder) return null;
    return holder;
  };

  const handleEquip = (token: PremiumTokenOption) => {
    soundFx.playCash();
    onSelectTokenShape(token.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Featured Header Showcase */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/40 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg border shrink-0 transition-transform duration-300 transform hover:scale-105"
              style={{
                backgroundColor: `${currentToken.accentColor}20`,
                borderColor: `${currentToken.accentColor}60`,
                boxShadow: `0 0 20px ${currentToken.accentColor}30`,
              }}
            >
              <span>{currentToken.symbol}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Active Signature Piece
                </span>
                <span className="text-xs text-slate-400 font-bold hidden sm:inline">
                  {currentToken.metalFinish}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {currentToken.name}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                {currentToken.historicalNote}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-950/50 px-4 py-2 rounded-2xl border border-amber-500/40 shrink-0">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>8 COLLECTOR TOKENS</span>
          </div>
        </div>
      </div>

      {/* Grid of 8 Premium Tokens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {ALL_PREMIUM_TOKENS.map((token) => {
          const isSelected = token.id === selectedTokenShape;
          const holder = getHolderInfo(token);
          const isHeldByAi = holder && holder.isAi;

          return (
            <div
              key={token.id}
              id={`token-card-${token.id}`}
              onClick={() => handleEquip(token)}
              className={`relative group rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
                isSelected
                  ? 'bg-slate-800/90 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40 transform -translate-y-0.5'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
              }`}
            >
              <div>
                {/* Top Bar: Icon + Symbol + Equipped Pill */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border"
                      style={{
                        backgroundColor: `${token.accentColor}18`,
                        borderColor: `${token.accentColor}40`,
                      }}
                    >
                      <span>{token.symbol}</span>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {token.shortName}
                      </div>
                      <div
                        className="text-[11px] font-bold"
                        style={{ color: token.accentColor }}
                      >
                        {token.subtitle}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Check className="w-3 h-3 text-amber-400 stroke-[3]" />
                      Equipped
                    </span>
                  )}
                </div>

                {/* Token Title */}
                <h3 className="text-sm font-black text-white group-hover:text-amber-200 transition-colors">
                  {token.name}
                </h3>

                {/* Material Finish Tag */}
                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>{token.metalFinish}</span>
                </div>

                {/* Description */}
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400 line-clamp-3">
                  {token.description}
                </p>
              </div>

              {/* Bottom Card Action */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {isHeldByAi && !isSelected ? (
                  <span className="text-[10px] font-semibold text-slate-400 italic">
                    Assigned to {holder.name}
                  </span>
                ) : isSelected ? (
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Ready For Next Roll
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-200">
                    Click to Equip
                  </span>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEquip(token);
                  }}
                  className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isSelected ? 'Equipped' : 'Equip'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Craftsmanship Note */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Tokens are rendered in real-time 3D with multi-part die-cast geometry, weighted pedestal bases, and high-metalness PBR specular reflections.
          </span>
        </div>
        {isGameActive && (
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 shrink-0 hidden sm:inline">
            Live Swapping Active
          </span>
        )}
      </div>
    </div>
  );
};
