'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Player, Property } from '@/types/monopoly';
import { Trophy, Crown, DollarSign, Building, Home, RotateCcw, Home as HomeIcon, Award, Sparkles, AlertCircle } from 'lucide-react';
import { soundFx } from '@/lib/sound';

export interface PlayerNetWorthBreakdown {
  player: Player;
  rank: number;
  cash: number;
  propertyValue: number;
  buildingsValue: number;
  totalNetWorth: number;
  unmortgagedCount: number;
  mortgagedCount: number;
  housesCount: number;
  hotelsCount: number;
}

export interface EndgameModalProps {
  isOpen: boolean;
  winner: Player | undefined;
  players: Player[];
  properties: Property[];
  turnCount: number;
  endReason?: 'SOLE_SURVIVOR' | 'MONOPOLY_SPREE_TIMEOUT' | 'BANKRUPTCY' | 'SURRENDER';
  onNewGame: () => void;
  onReturnToMainMenu: () => void;
}

export const EndgameModal: React.FC<EndgameModalProps> = ({
  isOpen,
  winner,
  players,
  properties,
  turnCount,
  endReason = 'SOLE_SURVIVOR',
  onNewGame,
  onReturnToMainMenu,
}) => {
  const [activeTab, setActiveTab] = useState<'podium' | 'breakdown'>('podium');

  useEffect(() => {
    if (isOpen) {
      soundFx.playFanfare();
    }
  }, [isOpen]);

  // Compute detailed net worth and ranking for every player
  const leaderboard: PlayerNetWorthBreakdown[] = useMemo(() => {
    const list = players.map((p) => {
      const ownedProps = properties.filter((prop) => prop.ownerId === p.id);
      const unmortgaged = ownedProps.filter((prop) => !prop.isMortgaged);
      const mortgaged = ownedProps.filter((prop) => prop.isMortgaged);

      const unmortgagedVal = unmortgaged.reduce((sum, prop) => sum + prop.basePrice, 0);
      const mortgagedVal = mortgaged.reduce((sum, prop) => sum + Math.floor(prop.basePrice / 2), 0);
      const propertyValue = unmortgagedVal + mortgagedVal;

      let housesCount = 0;
      let hotelsCount = 0;
      let buildingsValue = 0;

      ownedProps.forEach((prop) => {
        if (prop.hotel) {
          hotelsCount += 1;
          buildingsValue += 5 * (prop.houseCost || 50);
        } else {
          housesCount += prop.houses || 0;
          buildingsValue += (prop.houses || 0) * (prop.houseCost || 50);
        }
      });

      const cash = p.isBankrupt ? 0 : Math.max(0, p.cash);
      const totalNetWorth = p.isBankrupt ? 0 : cash + propertyValue + buildingsValue;

      return {
        player: p,
        rank: 1,
        cash,
        propertyValue,
        buildingsValue,
        totalNetWorth,
        unmortgagedCount: unmortgaged.length,
        mortgagedCount: mortgaged.length,
        housesCount,
        hotelsCount,
      };
    });

    // Sort: Non-bankrupt players first by net worth descending; bankrupt players at the end
    list.sort((a, b) => {
      if (a.player.isBankrupt && !b.player.isBankrupt) return 1;
      if (!a.player.isBankrupt && b.player.isBankrupt) return -1;
      return b.totalNetWorth - a.totalNetWorth;
    });

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [players, properties]);

  if (!isOpen) return null;

  const resolvedWinner = winner || leaderboard[0]?.player || players[0];
  const winnerStats = leaderboard.find((item) => item.player.id === resolvedWinner.id) || leaderboard[0];

  const getEndReasonTitle = () => {
    switch (endReason) {
      case 'SOLE_SURVIVOR':
        return 'Sole Survivor — All Rivals Eliminated!';
      case 'MONOPOLY_SPREE_TIMEOUT':
        return 'Monopoly Spree (120m) Final Liquidation!';
      default:
        return 'Match Concluded — Champion Crowned!';
    }
  };

  const getEndReasonDesc = () => {
    switch (endReason) {
      case 'SOLE_SURVIVOR':
        return 'Every other tycoon on the board has fallen to bankruptcy and insolvency. Only one empire remains!';
      case 'MONOPOLY_SPREE_TIMEOUT':
        return 'The 120-minute Great Monopoly Spree timer has expired! All portfolios have been liquidated and the wealthiest tycoon takes the crown.';
      default:
        return 'The contest of titans has concluded. High finance has crowned its rightful Chairman of the Board.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-center shadow-[0_0_80px_rgba(245,158,11,0.25)] flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Subtle Top Golden Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 rounded-t-3xl" />

        {/* Victory Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 p-0.5 shadow-2xl shadow-amber-500/40 flex items-center justify-center animate-bounce duration-1000">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-amber-400">
                <Trophy className="w-10 h-10 drop-shadow-md" />
              </div>
            </div>
            <span className="absolute -top-2 -right-2 text-2xl animate-pulse">👑</span>
          </div>

          <div className="space-y-1 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{getEndReasonTitle()}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {resolvedWinner.name} Triumphs!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {getEndReasonDesc()}
            </p>
          </div>
        </div>

        {/* Winner Spotlight Card */}
        <div className="bg-gradient-to-br from-slate-950/80 to-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-left">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg border-2 shrink-0"
              style={{
                backgroundColor: resolvedWinner.avatarColor || resolvedWinner.color,
                borderColor: resolvedWinner.color,
              }}
            >
              {resolvedWinner.name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white">{resolvedWinner.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  Champion
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Turn Count: <strong className="text-slate-200">{turnCount}</strong> &bull; Token:{' '}
                <strong className="text-amber-300">{resolvedWinner.avatarShape || 'Classic'}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-center sm:text-right bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Total Net Worth
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400">
              ${winnerStats?.totalNetWorth.toLocaleString() ?? 0}
            </span>
          </div>
        </div>

        {/* Tab Toggle: Leaderboard vs Detailed Portfolio Breakdown */}
        <div className="flex items-center justify-center gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('podium')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'podium'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Final Standings & Net Worth</span>
          </button>
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'breakdown'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Portfolio & Assets Breakdown</span>
          </button>
        </div>

        {/* Tab 1: Final Standings Podium List */}
        {activeTab === 'podium' && (
          <div className="space-y-2 text-left">
            {leaderboard.map((item) => {
              const isWin = item.player.id === resolvedWinner.id;
              const isBankrupt = item.player.isBankrupt;

              return (
                <div
                  key={item.player.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isWin
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : isBankrupt
                      ? 'bg-rose-950/20 border-rose-900/40 opacity-60'
                      : 'bg-slate-950/50 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 bg-slate-800 border border-slate-700">
                      {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 border"
                      style={{
                        backgroundColor: item.player.avatarColor || item.player.color,
                        borderColor: item.player.color,
                      }}
                    >
                      {item.player.name.slice(0, 1)}
                    </div>

                    {/* Name & Status */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white">{item.player.name}</span>
                        {item.player.isAi && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            BOT
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {isBankrupt ? (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 inline" /> Bankrupt
                          </span>
                        ) : (
                          `${item.unmortgagedCount + item.mortgagedCount} properties &bull; ${item.housesCount}H ${item.hotelsCount}M`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Net Worth Value */}
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Net Worth</span>
                    <span
                      className={`font-mono font-black text-sm ${
                        isWin
                          ? 'text-emerald-400 text-base'
                          : isBankrupt
                          ? 'text-slate-500 line-through'
                          : 'text-slate-200'
                      }`}
                    >
                      ${item.totalNetWorth.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Detailed Asset Breakdown Table */}
        {activeTab === 'breakdown' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-2.5">Player</th>
                  <th className="py-2 px-2.5 text-right">Cash</th>
                  <th className="py-2 px-2.5 text-right">Deeds</th>
                  <th className="py-2 px-2.5 text-right">Houses/Hotels</th>
                  <th className="py-2 px-2.5 text-right text-emerald-400">Net Worth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.map((item) => (
                  <tr key={item.player.id} className={item.player.id === resolvedWinner.id ? 'bg-amber-500/5' : ''}>
                    <td className="py-2.5 px-2.5 font-sans font-bold text-white flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.player.color }}
                      />
                      <span className="truncate max-w-[110px]">{item.player.name}</span>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono">${item.cash.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono">${item.propertyValue.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono">${item.buildingsValue.toLocaleString()}</td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-400">
                      ${item.totalNetWorth.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            id="btn-victory-new-game"
            onClick={onNewGame}
            className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again (Rematch)</span>
          </button>

          <button
            id="btn-victory-main-menu"
            onClick={onReturnToMainMenu}
            className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm uppercase tracking-wider shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Return to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndgameModal;
