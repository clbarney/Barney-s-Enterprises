'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  BookOpen,
  Check,
  Zap,
  Shield,
  Coins,
  Crown,
  Dice5,
  Train,
  X,
  Lock,
  Flame,
  Award,
  Sliders,
  Layers,
  ArrowRight,
  Info,
  BatteryCharging,
  Monitor,
  Gauge,
  Cpu,
  Eye,
  EyeOff,
  Wrench,
  Building2,
  Gavel,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  GameRulesOptions,
  GameSettingsOptions,
  Player,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  GraphicQualityPreset,
  ShadowQualitySetting,
  TargetFpsSetting,
  detectDeviceCapabilities,
  TokenShape,
} from '@/types/monopoly';
import { soundFx } from '@/lib/sound';
import { ALL_WILDCARDS } from '@/lib/wildcards';
import { WildcardDeckCustomizerModal } from './WildcardDeckCustomizerModal';
import { CardGalleryTab } from '@/components/CardGalleryTab';
import { TokenSelectionVault } from '@/components/TokenSelectionVault';
import { getPremiumToken } from '@/lib/tokens';

export interface GameMainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewGame?: () => void;
  onResetToMainMenu?: () => void;
  onStartGame?: () => void;
  onResumeGame?: () => void;
  rules: GameRulesOptions;
  onUpdateRules: (newRules: GameRulesOptions) => void;
  settings: GameSettingsOptions;
  onUpdateSettings: (newSettings: GameSettingsOptions) => void;
  isInitialStartScreen?: boolean;
  isGameActive: boolean;
  activePlayer?: Player;
  turnCount?: number;
  selectedTokenShape?: TokenShape;
  onSelectTokenShape?: (shape: TokenShape) => void;
  players?: Player[];
  onOpenDevTools?: () => void;
}

type StartScreenTab = 'PLAY' | 'TOKENS' | 'EXPANSIONS' | 'CARDS' | 'SETTINGS' | 'RULEBOOK';
type InGameTab = 'MENU' | 'TOKENS' | 'CARDS' | 'SETTINGS' | 'RULEBOOK';

export const GameMainMenuModal: React.FC<GameMainMenuModalProps> = ({
  isOpen,
  onClose,
  onNewGame,
  onResetToMainMenu,
  onStartGame,
  onResumeGame,
  rules,
  onUpdateRules,
  settings,
  onUpdateSettings,
  isInitialStartScreen = false,
  isGameActive,
  activePlayer,
  turnCount = 1,
  selectedTokenShape = 'hat',
  onSelectTokenShape,
  players,
  onOpenDevTools,
}) => {
  const [startTab, setStartTab] = useState<StartScreenTab>('PLAY');
  const [inGameTab, setInGameTab] = useState<InGameTab>('MENU');
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isWildcardCustomizerOpen, setIsWildcardCustomizerOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isInitialStartScreen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isInitialStartScreen]);

  if (!isOpen) return null;

  const handleToggleRule = (key: keyof GameRulesOptions) => {
    // Only permitted on Start Screen before game starts
    if (!isInitialStartScreen) return;
    soundFx.playCardDraw();
    if (typeof rules[key] === 'boolean') {
      onUpdateRules({
        ...rules,
        [key]: !rules[key],
      });
    }
  };

  const handleSetStartingCash = (amount: number) => {
    if (!isInitialStartScreen) return;
    soundFx.playCash();
    onUpdateRules({
      ...rules,
      startingCash: amount,
    });
  };

  const handleVolumeChange = (vol: number) => {
    soundFx.setVolume(vol);
    onUpdateSettings({
      ...settings,
      soundVolume: vol,
    });
  };

  const handleToggleMute = () => {
    const nextMuted = !settings.soundEnabled;
    soundFx.setMuted(!nextMuted);
    onUpdateSettings({
      ...settings,
      soundEnabled: nextMuted,
    });
    if (nextMuted) {
      soundFx.playTestChime();
    }
  };

  const handleApplyGraphicPreset = (preset: GraphicQualityPreset) => {
    soundFx.playCardDraw();
    let updated: Partial<GameSettingsOptions> = { graphicPreset: preset };
    if (preset === 'BATTERY_SAVER') {
      updated = {
        graphicPreset: 'BATTERY_SAVER',
        isBatterySaver: true,
        targetFps: '30',
        smartIdleThrottle: true,
        shadowQuality: 'OFF',
        bloomEnabled: false,
        ambientAnimations: false,
        resolutionScale: '0.85',
      };
    } else if (preset === 'LOW') {
      updated = {
        graphicPreset: 'LOW',
        isBatterySaver: false,
        targetFps: '60',
        smartIdleThrottle: true,
        shadowQuality: 'OFF',
        bloomEnabled: false,
        ambientAnimations: false,
        resolutionScale: '0.85',
      };
    } else if (preset === 'MEDIUM') {
      updated = {
        graphicPreset: 'MEDIUM',
        isBatterySaver: false,
        targetFps: '60',
        smartIdleThrottle: true,
        shadowQuality: 'LOW',
        bloomEnabled: false,
        ambientAnimations: true,
        resolutionScale: '1.0',
      };
    } else if (preset === 'HIGH') {
      updated = {
        graphicPreset: 'HIGH',
        isBatterySaver: false,
        targetFps: '60',
        smartIdleThrottle: true,
        shadowQuality: 'HIGH',
        bloomEnabled: true,
        ambientAnimations: true,
        resolutionScale: '1.25',
      };
    } else if (preset === 'ULTRA') {
      updated = {
        graphicPreset: 'ULTRA',
        isBatterySaver: false,
        targetFps: 'UNCAPPED',
        smartIdleThrottle: false,
        shadowQuality: 'HIGH',
        bloomEnabled: true,
        ambientAnimations: true,
        resolutionScale: 'DEVICE_MAX',
      };
    }
    onUpdateSettings({
      ...settings,
      ...updated,
    });
  };

  const handleAutoTuneDevice = () => {
    soundFx.playCash();
    const detected = detectDeviceCapabilities();
    let recommended: GraphicQualityPreset = 'MEDIUM';
    if (detected.deviceTier === 'low' || detected.isMobile) {
      recommended = 'BATTERY_SAVER';
    } else if (detected.deviceTier === 'medium') {
      recommended = 'MEDIUM';
    } else if (detected.deviceTier === 'high') {
      recommended = 'HIGH';
    }
    handleApplyGraphicPreset(recommended);
  };

  const handleApplyPreset = (preset: 'TYCOON' | 'BALANCED' | 'CLASSIC') => {
    if (!isInitialStartScreen) return;
    soundFx.playCash();
    if (preset === 'TYCOON') {
      onUpdateRules({
        ...DEFAULT_RULES,
        startingCash: 2000,
        openingDraft: true,
        railwayTransit: true,
        doubleCashOnGo: true,
        snakeEyesBonus: true,
        monopolyChallenge: true,
        jailFrozenAssets: true,
        taxDayPortfolioTax: true,
        freeParkingLottery: true,
        coreActionDeck: true,
        superWildcardDrop: true,
        greatMonopolySpree: true,
      });
    } else if (preset === 'BALANCED') {
      onUpdateRules({
        ...DEFAULT_RULES,
        startingCash: 1500,
        openingDraft: true,
        railwayTransit: true,
        doubleCashOnGo: true,
        snakeEyesBonus: true,
        monopolyChallenge: true,
        jailFrozenAssets: true,
        taxDayPortfolioTax: false,
        freeParkingLottery: true,
        coreActionDeck: true,
        superWildcardDrop: false,
        greatMonopolySpree: false,
      });
    } else {
      onUpdateRules({
        ...DEFAULT_RULES,
        startingCash: 1500,
        openingDraft: false,
        railwayTransit: false,
        doubleCashOnGo: false,
        snakeEyesBonus: false,
        monopolyChallenge: false,
        jailFrozenAssets: false,
        taxDayPortfolioTax: false,
        freeParkingLottery: false,
        coreActionDeck: false,
        superWildcardDrop: false,
        greatMonopolySpree: false,
        speedDie: false,
        skyscrapersAndDepots: false,
        busTicketsDeck: false,
        stockExchange: false,
        tripleTrackBoard: false,
        tradeRentImmunity: false,
        taxDayWildcardDuel: false,
      });
    }
  };

  // -------------------------------------------------------------
  // 1. START SCREEN MAIN MENU (When game first runs)
  // -------------------------------------------------------------
  if (isInitialStartScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-slate-900/95 border border-amber-500/30 rounded-3xl w-full max-w-4xl shadow-2xl shadow-black/80 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shadow-md shadow-amber-500/10">
                <Crown className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase">
                    Barney&apos;s Monopoly
                  </h1>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    3D EDITION
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Custom Expansions • Sunset Porch Atmosphere • Exchange Center
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>4 PLAYERS READY</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <button
              onClick={() => setStartTab('PLAY')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition ${
                startTab === 'PLAY'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>START MATCH</span>
            </button>
            <button
              id="start-tab-tokens"
              onClick={() => {
                soundFx.playCash();
                setStartTab('TOKENS');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                startTab === 'TOKENS'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>PREMIUM TOKENS (8)</span>
            </button>
            <button
              onClick={() => setStartTab('EXPANSIONS')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                startTab === 'EXPANSIONS'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>CUSTOMIZE RULES</span>
            </button>
            <button
              id="start-tab-cards"
              onClick={() => {
                soundFx.playCardDraw();
                setStartTab('CARDS');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                startTab === 'CARDS'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400" />
              <span>CARD COMPENDIUM</span>
            </button>
            <button
              onClick={() => setStartTab('SETTINGS')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                startTab === 'SETTINGS'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>AUDIO & PREFERENCES</span>
            </button>
            <button
              onClick={() => setStartTab('RULEBOOK')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                startTab === 'RULEBOOK'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>RULEBOOK</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* TAB: PLAY */}
            {startTab === 'PLAY' && (
              <div className="space-y-6">
                {/* Hero Start Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Table Set & Ready
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      Step up to the board!
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                      Compete against Barney AI, Cyber Bot, and Titan Bot in high-stakes property trading, wildcards, and railroad shortcuts.
                    </p>
                  </div>

                  <button
                    id="btn-start-game-main-menu"
                    onClick={() => {
                      soundFx.playCash();
                      if (onStartGame) onStartGame();
                      else if (onResumeGame) onResumeGame();
                      else onClose();
                    }}
                    className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.4)] border-2 border-amber-300 active:scale-95 transition-all duration-200 cursor-pointer shrink-0"
                  >
                    <Play className="w-6 h-6 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
                    <span>START GAME</span>
                    <ArrowRight className="w-5 h-5 text-slate-950" />
                  </button>
                </div>

                {/* Player Roster */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Game Participants & Signature Pieces
                    </h3>
                    <button
                      onClick={() => {
                        soundFx.playCash();
                        setStartTab('TOKENS');
                      }}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      Browse 8 Premium Tokens
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Player 1 */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-emerald-500/40 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                        <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1 border border-amber-500/30">
                          <span>{getPremiumToken(selectedTokenShape).symbol}</span>
                          <span className="text-[10px]">{getPremiumToken(selectedTokenShape).shortName}</span>
                        </span>
                      </div>
                      <div className="font-black text-sm text-white">Player 1 (You)</div>
                      <div className="text-[11px] text-emerald-300 font-bold">Human Player</div>
                      <div className="text-[11px] text-slate-400 mt-1">${rules.startingCash} Starting Bank</div>
                      <button
                        onClick={() => {
                          soundFx.playCash();
                          setStartTab('TOKENS');
                        }}
                        className="mt-2.5 w-full py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-slate-700/80 hover:bg-amber-500 hover:text-slate-950 text-amber-300 transition flex items-center justify-center gap-1 cursor-pointer border border-amber-500/30"
                      >
                        <Sparkles className="w-3 h-3" />
                        Change Token
                      </button>
                    </div>

                    {/* Barney AI */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-amber-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        {players && players[1] && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 font-bold flex items-center gap-1 border border-slate-700">
                            <span>{getPremiumToken(players[1].tokenShape).symbol}</span>
                            <span className="text-[10px]">{getPremiumToken(players[1].tokenShape).shortName}</span>
                          </span>
                        )}
                      </div>
                      <div className="font-black text-sm text-white">Barney AI</div>
                      <div className="text-[11px] text-amber-300 font-bold">Competitive Tycoon</div>
                      <div className="text-[11px] text-slate-400 mt-1">${rules.startingCash} Starting Bank</div>
                    </div>

                    {/* Cyber Bot */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-cyan-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400" />
                        {players && players[2] && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 font-bold flex items-center gap-1 border border-slate-700">
                            <span>{getPremiumToken(players[2].tokenShape).symbol}</span>
                            <span className="text-[10px]">{getPremiumToken(players[2].tokenShape).shortName}</span>
                          </span>
                        )}
                      </div>
                      <div className="font-black text-sm text-white">Cyber Bot</div>
                      <div className="text-[11px] text-cyan-300 font-bold">Pragmatic Strategist</div>
                      <div className="text-[11px] text-slate-400 mt-1">${rules.startingCash} Starting Bank</div>
                    </div>

                    {/* Titan Bot */}
                    <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-purple-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-3 h-3 rounded-full bg-purple-400" />
                        {players && players[3] && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 font-bold flex items-center gap-1 border border-slate-700">
                            <span>{getPremiumToken(players[3].tokenShape).symbol}</span>
                            <span className="text-[10px]">{getPremiumToken(players[3].tokenShape).shortName}</span>
                          </span>
                        )}
                      </div>
                      <div className="font-black text-sm text-white">Titan Bot</div>
                      <div className="text-[11px] text-purple-300 font-bold">Aggressive Builder</div>
                      <div className="text-[11px] text-slate-400 mt-1">${rules.startingCash} Starting Bank</div>
                    </div>
                  </div>
                </div>

                {/* Quick Rules Presets */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
                    Quick Rule Configurations
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleApplyPreset('TYCOON')}
                      className="p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-amber-500/40 text-left transition group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-sm text-amber-300 group-hover:text-amber-200">
                          👑 Barney&apos;s Cutthroat
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-black bg-amber-500/20 text-amber-300">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        $2,000 Cash, Opening Draft, Wildcards, Rail Transit, Double GO, and Snake Eyes.
                      </p>
                    </button>

                    <button
                      onClick={() => handleApplyPreset('BALANCED')}
                      className="p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-left transition group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-sm text-slate-200 group-hover:text-white">
                          ⚖️ Fast Tycoon
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-black bg-blue-500/20 text-blue-300">
                          BALANCED
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        $1,500 Cash with Opening Draft, Wildcards, and Rail Transit active.
                      </p>
                    </button>

                    <button
                      onClick={() => handleApplyPreset('CLASSIC')}
                      className="p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-left transition group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-black text-sm text-slate-200 group-hover:text-white">
                          📜 Standard Classic
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-black bg-slate-700 text-slate-300">
                          VANILLA
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Traditional $1,500 cash rules with all expansions disabled.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TOKEN VAULT (8 PREMIUM PIECES) */}
            {startTab === 'TOKENS' && (
              <TokenSelectionVault
                selectedTokenShape={selectedTokenShape}
                onSelectTokenShape={(shape) => {
                  if (onSelectTokenShape) onSelectTokenShape(shape);
                }}
                players={players}
                isGameActive={false}
              />
            )}

            {/* TAB: EXPANSIONS & RULES (EDITABLE BEFORE GAME STARTS) */}
            {startTab === 'EXPANSIONS' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-400" /> Starting Bankroll
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1000, 1500, 2000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => handleSetStartingCash(amount)}
                        className={`p-3 rounded-xl border text-center font-black transition ${
                          rules.startingCash === amount
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-lg">${amount}</div>
                        <div className="text-[10px] font-medium text-slate-400">
                          {amount === 1000 ? 'Hardcore' : amount === 1500 ? 'Standard' : 'Fast Tycoon'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wildcard Deck Customizer Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black uppercase tracking-wider text-purple-300">
                        Custom Wildcard & Super Wildcard Deck
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                        {rules.enabledWildcardIds !== undefined ? `${rules.enabledWildcardIds.length} / ${ALL_WILDCARDS.length} Active` : `All ${ALL_WILDCARDS.length} Active`}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Customize which specific regular and super wildcards are shuffled into the game deck.
                    </p>
                  </div>
                  <button
                    id="btn-open-wildcard-customizer"
                    onClick={() => {
                      soundFx.playCardDraw();
                      setIsWildcardCustomizerOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer shrink-0 flex items-center gap-2"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Customize Wildcards</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" /> Expansion Rules & House Perks
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        key: 'openingDraft' as keyof GameRulesOptions,
                        title: 'Property Draft Opening',
                        desc: 'Guarantees every player 1 unmortgaged property at turn zero. Last player draws first.',
                        icon: Layers,
                      },
                      {
                        key: 'railwayTransit' as keyof GameRulesOptions,
                        title: 'Railway Transportation',
                        desc: 'Train owners can transit between stations ($50 next / $100 across). Multi-train owners ride for FREE (forward or backwards).',
                        icon: Train,
                      },
                      {
                        key: 'doubleCashOnGo' as keyof GameRulesOptions,
                        title: 'Land on GO Option',
                        desc: 'Landing directly on GO lets you choose between double payday ($400) or warping to any space on the board.',
                        icon: Crown,
                      },
                      {
                        key: 'coreActionDeck' as keyof GameRulesOptions,
                        title: 'Regular Wildcards (Core Deck)',
                        desc: 'Movement (+1..+5, -1), Extra/One Die, Discount, Free Rent, Crooked, and Tax Exempt. Turn OFF to remove regular wildcards.',
                        icon: Sparkles,
                      },
                      {
                        key: 'superWildcardDrop' as keyof GameRulesOptions,
                        title: 'Super Wildcards',
                        desc: 'High-stakes strategic cards: Mergers, Heists, Swindles, UFO Teleports, Depreciation, and Sudden Bankruptcies.',
                        icon: Flame,
                      },
                      {
                        key: 'snakeEyesBonus' as keyof GameRulesOptions,
                        title: 'Snake Eyes $400 Bounty',
                        desc: 'Rolling 1 & 1 instantly rewards the roller with $400 cash and an extra roll.',
                        icon: Dice5,
                      },
                      {
                        key: 'freeParkingLottery' as keyof GameRulesOptions,
                        title: 'Free Parking Expansion & Golden Deal',
                        desc: 'Doubles wins central lottery. 2nd doubles activates Golden Deal (rent immunity & free properties). 3rd doubles sends to Jail.',
                        icon: Coins,
                      },
                      {
                        key: 'taxDayPortfolioTax' as keyof GameRulesOptions,
                        title: 'Tax Day & Foreclosure Auctions',
                        desc: 'Every 5 banker laps, players pay taxes based on board sides and houses. Bank auctions mortgaged properties.',
                        icon: Gavel,
                      },
                      {
                        key: 'jailFrozenAssets' as keyof GameRulesOptions,
                        title: 'Jail Frozen Assets',
                        desc: 'Incarcerated players cannot upgrade properties, collect rent, make trades, or participate in auctions until released.',
                        icon: Lock,
                      },
                      {
                        key: 'greatMonopolySpree' as keyof GameRulesOptions,
                        title: 'The Great Monopoly Spree',
                        desc: 'At 90 minutes, 2+ property sets auto-complete for free with 1 free house. At 120 minutes, winner is declared by net worth.',
                        icon: Clock,
                      },
                      {
                        key: 'monopolyChallenge' as keyof GameRulesOptions,
                        title: 'Monopoly Challenge',
                        desc: 'Players can initiate friendly high-stakes roll challenges for the final piece of a set.',
                        icon: Award,
                      },
                    ].map((item) => {
                      const isActive = Boolean(rules[item.key]);
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.key}
                          onClick={() => handleToggleRule(item.key)}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer select-none flex items-start gap-3 ${
                            isActive
                              ? 'bg-amber-950/30 border-amber-500/50 shadow-sm'
                              : 'bg-slate-800/40 border-slate-700/60 opacity-60'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-xl mt-0.5 ${
                              isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-white">{item.title}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-black ${
                                  isActive
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-500'
                                }`}
                              >
                                {isActive ? 'ENABLED' : 'DISABLED'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CARD COMPENDIUM */}
            {startTab === 'CARDS' && (
              <CardGalleryTab />
            )}

            {/* TAB: SETTINGS & AUDIO */}
            {startTab === 'SETTINGS' && (
              <GraphicsAndAudioSettingsPanel
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                onApplyGraphicPreset={handleApplyGraphicPreset}
                onAutoTuneDevice={handleAutoTuneDevice}
                handleVolumeChange={handleVolumeChange}
                handleToggleMute={handleToggleMute}
              />
            )}

            {/* TAB: RULEBOOK */}
            {startTab === 'RULEBOOK' && (
              <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
                  <h4 className="font-black text-amber-400 uppercase tracking-wide">Core Objective</h4>
                  <p>
                    Accumulate properties, construct houses, collect rent, and trade strategically in the Exchange Center. The last solvent player wins the game.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
                  <h4 className="font-black text-amber-400 uppercase tracking-wide">The Exchange Center</h4>
                  <p>
                    Trade properties, wildcards, or get-out-of-jail cards with other players. The Exchange Center computes live valuations and predicts whether AI partners will accept, counter, or reject your proposals.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wildcard Deck Customizer Modal */}
        <WildcardDeckCustomizerModal
          isOpen={isWildcardCustomizerOpen}
          onClose={() => setIsWildcardCustomizerOpen(false)}
          enabledWildcardIds={rules.enabledWildcardIds}
          onSaveEnabledWildcardIds={(ids) => {
            onUpdateRules({
              ...rules,
              enabledWildcardIds: ids,
            });
          }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. IN-GAME MENU (During active match: AAA Cinematic Chassis)
  // -------------------------------------------------------------
  const activePiece = getPremiumToken(selectedTokenShape);
  const activeTurnPlayer = activePlayer || (players && players[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="bg-[#0B0F19]/95 border border-amber-500/25 ring-1 ring-white/10 rounded-3xl w-full max-w-4xl h-[88vh] max-h-[820px] shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        {/* AAA Header */}
        <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0D1525] to-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/35 flex items-center justify-center text-amber-400 font-black shadow-inner shadow-amber-500/20">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-sans">
                  Barney&apos;s Monopoly 3D
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 tracking-wider">
                  PAUSED
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-300 font-bold">Turn #{turnCount}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 flex items-center gap-1">
                  Active:
                  <span
                    className="inline-block w-2 h-2 rounded-full ml-0.5"
                    style={{ backgroundColor: activeTurnPlayer?.color || '#3b82f6' }}
                  />
                  <span className="font-semibold text-white">
                    {activeTurnPlayer?.name || 'Player 1'}
                  </span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDevTools && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDevTools();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 shadow-md shadow-purple-950/40"
              >
                <Wrench className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Dev Tools</span>
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Resume match"
              className="group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 hover:text-white transition active:scale-95 cursor-pointer shadow-md"
            >
              <span className="text-xs font-bold tracking-wider hidden sm:inline">RESUME</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 group-hover:text-slate-200">
                ESC
              </kbd>
              <X className="w-4 h-4 text-slate-400 group-hover:text-white" />
            </button>
          </div>
        </div>

        {/* AAA Segmented Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'MENU', label: 'OVERVIEW', icon: Play },
            { id: 'TOKENS', label: 'TOKEN VAULT', icon: Sparkles },
            { id: 'CARDS', label: 'COMPENDIUM', icon: Layers },
            { id: 'SETTINGS', label: 'AUDIO & GRAPHICS', icon: Sliders },
            { id: 'RULEBOOK', label: 'RULEBOOK', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = inGameTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`ingame-tab-${tab.id.toLowerCase()}`}
                onClick={() => {
                  soundFx.playCardDraw();
                  setShowQuitConfirm(false);
                  setInGameTab(tab.id as InGameTab);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-500/15 border border-amber-400/40 text-amber-300 shadow-sm shadow-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {inGameTab === 'MENU' && (
            <div className="space-y-4">
              {/* 1. Hero Resume Match Action Banner */}
              <button
                id="btn-ingame-resume"
                onClick={() => {
                  soundFx.playCardDraw();
                  if (onResumeGame) onResumeGame();
                  else onClose();
                }}
                className="group relative w-full overflow-hidden rounded-2xl p-[2px] cursor-pointer active:scale-[0.99] transition-all duration-200 shadow-[0_4px_25px_rgba(245,158,11,0.25)] hover:shadow-[0_6px_35px_rgba(245,158,11,0.4)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center justify-between px-5 sm:px-7 py-3.5 sm:py-4 rounded-[14px] bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-950/15 flex items-center justify-center text-slate-950 group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-slate-950" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm sm:text-base font-black tracking-wider uppercase leading-none">
                        RESUME MATCH
                      </div>
                      <div className="text-xs text-slate-900/80 font-bold mt-1">
                        Turn #{turnCount} • Active: {activeTurnPlayer?.name || 'Player 1'}
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs font-black tracking-wider uppercase bg-slate-950/20 px-3.5 py-1.5 rounded-xl">
                    <span>BACK TO TABLE</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>

              {/* 2. Live Match Standings / Telemetry Strip */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Match Standings & Net Worth
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono tracking-wider">
                    {players?.length || 4} PLAYERS IN RUNNING
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {(players || []).map((p) => {
                    const isCurrent = activePlayer?.id === p.id;
                    const pPiece = getPremiumToken(p.tokenShape || 'hat');
                    return (
                      <div
                        key={p.id}
                        className={`p-3 rounded-xl border transition-all ${
                          p.isBankrupt
                            ? 'bg-slate-950/40 border-slate-800/40 opacity-50'
                            : isCurrent
                            ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10 ring-1 ring-amber-400/20'
                            : 'bg-slate-800/40 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color || '#3b82f6' }}
                            />
                            <span className="text-xs font-black text-white truncate">
                              {p.name}
                            </span>
                            {!p.isAi ? (
                              <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.2 rounded shrink-0">
                                YOU
                              </span>
                            ) : (
                              <span className="text-[9px] font-black bg-slate-700/50 text-slate-400 px-1 py-0.2 rounded shrink-0">
                                AI
                              </span>
                            )}
                          </div>
                          <span className="text-sm shrink-0">{pPiece.symbol}</span>
                        </div>

                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-xs text-slate-400 font-medium">Cash</span>
                          <span
                            className={`font-mono text-sm font-black ${
                              p.isBankrupt ? 'text-slate-500 line-through' : 'text-emerald-400'
                            }`}
                          >
                            ${p.cash.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-700/40">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            {p.lapsCompleted} Laps
                          </span>
                          <span className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            {p.wildcardsHand.length} Cards
                          </span>
                        </div>

                        {isCurrent && !p.isBankrupt && (
                          <div className="mt-2 text-center text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 py-0.5 rounded border border-amber-500/30">
                            Current Turn
                          </div>
                        )}
                        {p.inJail && !p.isBankrupt && (
                          <div className="mt-2 text-center text-[10px] font-black uppercase tracking-wider text-rose-300 bg-rose-500/20 py-0.5 rounded border border-rose-500/30">
                            In Jail ({p.jailTurns || 0}/3)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Bento Section: Active Token Showcase & Quick Atmosphere / Audio Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Active Signature Piece Card */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-md border shrink-0"
                        style={{
                          backgroundColor: `${activePiece.accentColor}20`,
                          borderColor: `${activePiece.accentColor}50`,
                        }}
                      >
                        <span>{activePiece.symbol}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                            Active 3D Token
                          </span>
                          <span className="text-[10px] text-slate-500">•</span>
                          <span className="text-[10px] text-slate-400">{activePiece.metalFinish}</span>
                        </div>
                        <h4 className="text-sm font-black text-white">{activePiece.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{activePiece.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundFx.playCash();
                      setInGameTab('TOKENS');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Token in Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Audio & Atmosphere Control */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      Quick Audio & Volume
                    </span>
                    <button
                      onClick={handleToggleMute}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition border cursor-pointer ${
                        settings.soundEnabled
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50'
                          : 'bg-rose-950/50 text-rose-300 border-rose-500/30 hover:bg-rose-900/50'
                      }`}
                    >
                      {settings.soundEnabled ? 'SOUND ON' : 'MUTED'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Master Volume</span>
                      <span className="font-mono text-white font-bold">{Math.round(settings.soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.soundVolume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
                    <span>Performance Mode</span>
                    <div className="flex items-center gap-1.5">
                      {(['BATTERY_SAVER', 'MEDIUM', 'ULTRA'] as GraphicQualityPreset[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => handleApplyGraphicPreset(p)}
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition cursor-pointer border ${
                            settings.graphicPreset === p
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          {p === 'BATTERY_SAVER' ? '30 FPS' : p === 'MEDIUM' ? '60 FPS' : 'ULTRA'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Match Quit / Restart with Safe Two-Step Confirmation */}
              <div className="pt-2">
                {showQuitConfirm ? (
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-rose-300 font-black text-sm">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>ABANDON CURRENT MATCH?</span>
                    </div>
                    <p className="text-xs text-rose-200/80">
                      All board progress, property deeds, and player balances for Turn #{turnCount} will be reset.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => {
                          soundFx.playCash();
                          setShowQuitConfirm(false);
                          setStartTab('PLAY');
                          setInGameTab('MENU');
                          if (onResetToMainMenu) {
                            onResetToMainMenu();
                          } else if (onNewGame) {
                            onNewGame();
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-rose-950/50"
                      >
                        Yes, Abandon Match
                      </button>
                      <button
                        onClick={() => setShowQuitConfirm(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                      >
                        Cancel & Keep Playing
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    id="btn-restart-return-main-menu"
                    onClick={() => setShowQuitConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900/60 hover:bg-rose-950/30 text-slate-400 hover:text-rose-300 font-bold text-xs uppercase tracking-wider border border-slate-800 hover:border-rose-500/40 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Abandon Match & Return to Main Menu</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB: TOKEN VAULT */}
          {inGameTab === 'TOKENS' && (
            <TokenSelectionVault
              selectedTokenShape={selectedTokenShape}
              onSelectTokenShape={(shape) => {
                if (onSelectTokenShape) onSelectTokenShape(shape);
              }}
              players={players}
              isGameActive={true}
            />
          )}

          {/* TAB: CARD COMPENDIUM */}
          {inGameTab === 'CARDS' && (
            <CardGalleryTab />
          )}

          {/* TAB: SETTINGS & ACTIVE HOUSE RULES */}
          {inGameTab === 'SETTINGS' && (
            <div className="space-y-6">
              <GraphicsAndAudioSettingsPanel
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                onApplyGraphicPreset={handleApplyGraphicPreset}
                onAutoTuneDevice={handleAutoTuneDevice}
                handleVolumeChange={handleVolumeChange}
                handleToggleMute={handleToggleMute}
              />

              {/* Active Match House Rules (Locked mid-match) */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    Active Match Rules & Expansions
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Locked during active game</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Starting Capital</span>
                      <span className="text-[10px] text-slate-400">Cash granted at match start</span>
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded border border-emerald-500/30">
                      ${rules.startingCash}
                    </span>
                  </div>

                  {[
                    { label: 'Property Draft Opening', desc: 'Players draft deed cards before turn 1', active: rules.openingDraft },
                    { label: 'Railway Transportation', desc: 'Warp between owned stations for $50', active: rules.railwayTransit },
                    { label: 'Land on GO Privilege', desc: '$400 double bonus for landing exactly on GO', active: rules.doubleCashOnGo },
                    { label: 'Regular Wildcards (Core)', desc: 'Tactical action cards dealt each lap', active: rules.coreActionDeck },
                    { label: 'Super Wildcards', desc: 'Rare game-flipping tactical cards', active: rules.superWildcardDrop },
                    { label: 'Snake Eyes $400 Bounty', desc: 'Rolling 1-1 awards $400 treasury bonus', active: rules.snakeEyesBonus },
                    { label: 'Free Parking & Golden Deal', desc: 'Collected fines & fees jackpot in center', active: rules.freeParkingLottery },
                    { label: 'Tax Day & Auctions', desc: 'Portfolio taxes & unowned auctions', active: rules.taxDayPortfolioTax },
                    { label: 'Jail Frozen Assets', desc: 'Cannot collect rent while serving jail time', active: rules.jailFrozenAssets },
                    { label: 'The Great Monopoly Spree', desc: 'Special high-stakes buyout event', active: rules.greatMonopolySpree },
                    { label: 'Monopoly Challenge', desc: 'Extra victory challenges & goals', active: rules.monopolyChallenge },
                  ].map((ruleItem, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="pr-2">
                        <span className="text-xs font-bold text-slate-200 block">{ruleItem.label}</span>
                        <span className="text-[10px] text-slate-400 block">{ruleItem.desc}</span>
                      </div>
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded border shrink-0 tracking-wider ${
                          ruleItem.active
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {ruleItem.active ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: RULEBOOK */}
          {inGameTab === 'RULEBOOK' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs">
                    <Dice5 className="w-4 h-4" />
                    <span>1. Turn Flow & Doubles</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Roll the pair of dice to move around the board. Rolling doubles gives you an immediate extra turn. However, rolling three consecutive doubles sends your token straight to Jail!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs">
                    <Building2 className="w-4 h-4" />
                    <span>2. Properties & Monopolies</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Land on unowned properties to purchase them from the bank. Collecting all deeds in a color group grants a monopoly, which automatically doubles base rent and unlocks house and hotel development.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs">
                    <Coins className="w-4 h-4" />
                    <span>3. The Exchange Center (Trading)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Negotiate trades with any player at any point during your turn. Offer combinations of cash, property deeds, and wildcards. AI opponents evaluate fair market value based on monopoly potential.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs">
                    <Train className="w-4 h-4" />
                    <span>4. Railroad Transit Network</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    When landing on any railroad station you own, you can pay a $50 transit fee to immediately warp to any other railroad station across the entire board, opening up strategic leaps.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs">
                    <Sparkles className="w-4 h-4" />
                    <span>5. Wildcards & Tactics</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Play wildcards from your hand to force trades, shield rents, demand emergency taxes, or teleport to lucrative deeds. Cards refresh when completing laps around the board.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-xs">
                    <Lock className="w-4 h-4" />
                    <span>6. Jail & Escapes</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    While in Jail, escape by rolling doubles, paying the $50 fine, or playing a Get Out of Jail Free card. Depending on active house rules, assets in jail may not collect rent.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// REUSABLE GRAPHICS, BATTERY SAVER & AUDIO SETTINGS PANEL
// -------------------------------------------------------------
interface GraphicsAndAudioSettingsPanelProps {
  settings: GameSettingsOptions;
  onUpdateSettings: (newSettings: GameSettingsOptions) => void;
  onApplyGraphicPreset: (preset: GraphicQualityPreset) => void;
  onAutoTuneDevice: () => void;
  handleVolumeChange: (vol: number) => void;
  handleToggleMute: () => void;
}

const GraphicsAndAudioSettingsPanel: React.FC<GraphicsAndAudioSettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onApplyGraphicPreset,
  onAutoTuneDevice,
  handleVolumeChange,
  handleToggleMute,
}) => {
  const [deviceCaps] = useState(() => detectDeviceCapabilities());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presets: {
    id: GraphicQualityPreset;
    name: string;
    badge: string;
    desc: string;
    icon: typeof Zap;
    colorClass: string;
  }[] = [
    {
      id: 'BATTERY_SAVER',
      name: 'Battery Saver',
      badge: '30 FPS ECO',
      desc: 'Capped at 30 FPS with shadows & bloom disabled. Drastically cuts battery drain and keeps mobile devices cool.',
      icon: BatteryCharging,
      colorClass: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30',
    },
    {
      id: 'LOW',
      name: 'Low Quality',
      badge: '60 FPS FAST',
      desc: 'Disables shadows and bloom post-processing while keeping smooth 60 FPS on budget graphics chips.',
      icon: Gauge,
      colorClass: 'text-teal-400 border-teal-500/50 bg-teal-950/30',
    },
    {
      id: 'MEDIUM',
      name: 'Balanced',
      badge: 'RECOMMENDED',
      desc: 'Native resolution, 60 FPS, and lightweight 1024px shadows. Excellent performance on all modern devices.',
      icon: Monitor,
      colorClass: 'text-blue-400 border-blue-500/50 bg-blue-950/30',
    },
    {
      id: 'HIGH',
      name: 'High Quality',
      badge: 'VIBRANT',
      desc: 'Crisp 2048px soft shadows, atmospheric bloom lighting, and ambient porch fairy lights at 60 FPS.',
      icon: Sparkles,
      colorClass: 'text-amber-400 border-amber-500/50 bg-amber-950/30',
    },
    {
      id: 'ULTRA',
      name: 'Ultra Fidelity',
      badge: 'MAX VISUALS',
      desc: 'Uncapped framerate, full retina resolution scaling, ultra soft PCF shadows, and uncompressed textures.',
      icon: Zap,
      colorClass: 'text-purple-400 border-purple-500/50 bg-purple-950/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. DEVICE HARDWARE AUTO-DETECTION & QUICK TUNE */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mt-0.5 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">Hardware Detection</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                {deviceCaps.deviceTier.toUpperCase()} TIER
              </span>
              {deviceCaps.isMobile && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  MOBILE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {deviceCaps.hardwareConcurrency} Logical CPU Cores • {deviceCaps.deviceMemory}GB Memory • Pixel Ratio: {deviceCaps.pixelRatio.toFixed(1)}x
            </p>
          </div>
        </div>

        <button
          onClick={onAutoTuneDevice}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow cursor-pointer whitespace-nowrap"
        >
          Auto-Tune for Device
        </button>
      </div>

      {/* 2. GRAPHIC & BATTERY PRESETS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Performance & Battery Presets
          </label>
          <span className="text-[10px] text-slate-400">
            Current:{' '}
            <strong className="text-amber-300">{settings.graphicPreset || 'BALANCED'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {presets.map((preset) => {
            const isSelected = settings.graphicPreset === preset.id;
            const Icon = preset.icon;

            return (
              <div
                key={preset.id}
                onClick={() => onApplyGraphicPreset(preset.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer select-none flex flex-col justify-between gap-2 ${
                  isSelected
                    ? `${preset.colorClass} shadow-lg ring-1 ring-amber-400/40`
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/70 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-bold text-sm text-white">{preset.name}</span>
                  </div>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{preset.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SIMPLE CUSTOMIZATION & FINE-TUNING */}
      <div className="space-y-4 bg-slate-800/40 border border-slate-700/70 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Fine-Grained Performance Controls
          </label>
          <button
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
          >
            {showAdvanced ? 'Hide Advanced' : 'Customize Options'}
          </button>
        </div>

        {/* Essential Quick Controls Always Visible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Target Framerate */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Target Framerate</span>
              <span className="text-[10px] font-mono font-bold text-amber-300">
                {settings.targetFps === '30' ? '30 FPS' : settings.targetFps === 'UNCAPPED' ? 'Uncapped' : '60 FPS'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: '30', label: '30 FPS (Eco)' },
                { id: '60', label: '60 FPS' },
                { id: 'UNCAPPED', label: 'Max' },
              ].map((fpsItem) => (
                <button
                  key={fpsItem.id}
                  onClick={() => {
                    soundFx.playCardDraw();
                    onUpdateSettings({
                      ...settings,
                      targetFps: fpsItem.id as TargetFpsSetting,
                      graphicPreset: 'CUSTOM',
                    });
                  }}
                  className={`py-1.5 px-2 text-[10px] font-black rounded-lg border transition cursor-pointer ${
                    settings.targetFps === fpsItem.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {fpsItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Idle Power Throttle */}
          <div
            onClick={() => {
              soundFx.playCardDraw();
              onUpdateSettings({
                ...settings,
                smartIdleThrottle: !settings.smartIdleThrottle,
                graphicPreset: 'CUSTOM',
              });
            }}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70 flex items-center justify-between cursor-pointer hover:border-slate-600 select-none"
          >
            <div className="pr-3">
              <span className="text-xs font-bold text-slate-300 block">Smart Idle Power Saver</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Throttles GPU to 20 FPS after 1 minute of input inactivity to save battery
              </span>
            </div>
            <span
              className={`text-[10px] font-black px-2 py-1 rounded border shrink-0 ${
                settings.smartIdleThrottle
                  ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {settings.smartIdleThrottle ? 'ENABLED' : 'DISABLED'}
            </span>
          </div>
        </div>

        {/* Detailed Advanced Options (Toggled or Expanded) */}
        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-slate-700/60 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Shadow Quality */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Shadow Depth Map</span>
                  <span className="text-[10px] font-mono font-bold text-amber-300">
                    {settings.shadowQuality}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: 'OFF', label: 'Off' },
                    { id: 'LOW', label: '1024px' },
                    { id: 'MEDIUM', label: 'Med' },
                    { id: 'HIGH', label: 'High' },
                  ].map((shItem) => (
                    <button
                      key={shItem.id}
                      onClick={() => {
                        soundFx.playCardDraw();
                        onUpdateSettings({
                          ...settings,
                          shadowQuality: shItem.id as ShadowQualitySetting,
                          graphicPreset: 'CUSTOM',
                        });
                      }}
                      className={`py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                        settings.shadowQuality === shItem.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {shItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Scaling */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Render Resolution</span>
                  <span className="text-[10px] font-mono font-bold text-amber-300">
                    {settings.resolutionScale || '1.0'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { id: '0.85', label: '0.85x' },
                    { id: '1.0', label: '1.0x' },
                    { id: '1.25', label: '1.25x' },
                    { id: 'DEVICE_MAX', label: 'Retina' },
                  ].map((resItem) => (
                    <button
                      key={resItem.id}
                      onClick={() => {
                        soundFx.playCardDraw();
                        onUpdateSettings({
                          ...settings,
                          resolutionScale: resItem.id as any,
                          graphicPreset: 'CUSTOM',
                        });
                      }}
                      className={`py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                        settings.resolutionScale === resItem.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {resItem.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Atmospheric Bloom Glow Toggle */}
              <div
                onClick={() => {
                  soundFx.playCardDraw();
                  onUpdateSettings({
                    ...settings,
                    bloomEnabled: !settings.bloomEnabled,
                    graphicPreset: 'CUSTOM',
                  });
                }}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70 flex items-center justify-between cursor-pointer hover:border-slate-600 select-none"
              >
                <div className="pr-2">
                  <span className="text-xs font-bold text-slate-300 block">Post-Processing Bloom</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Off: single direct draw pass (up to 2x faster on mobile)
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded border shrink-0 ${
                    settings.bloomEnabled
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {settings.bloomEnabled ? 'ON' : 'OFF'}
                </span>
              </div>

              {/* Porch Ambient Animations Toggle */}
              <div
                onClick={() => {
                  soundFx.playCardDraw();
                  onUpdateSettings({
                    ...settings,
                    ambientAnimations: !settings.ambientAnimations,
                    graphicPreset: 'CUSTOM',
                  });
                }}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/70 flex items-center justify-between cursor-pointer hover:border-slate-600 select-none"
              >
                <div className="pr-2">
                  <span className="text-xs font-bold text-slate-300 block">Porch Fireflies & Ambient FX</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Animates floating fireflies and candle flames
                  </span>
                </div>
                <span
                  className={`text-[10px] font-black px-2 py-1 rounded border shrink-0 ${
                    settings.ambientAnimations
                      ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {settings.ambientAnimations ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. SOUND EFFECTS & AUDIO VOLUME */}
      <div className="bg-slate-800/40 border border-slate-700/70 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-amber-400" />
            Audio & Sound Effects
          </label>
          <button
            onClick={handleToggleMute}
            className={`text-xs px-3 py-1 rounded-lg font-bold border transition cursor-pointer ${
              settings.soundEnabled
                ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950 border-red-500/40 text-red-300'
            }`}
          >
            {settings.soundEnabled ? 'SOUND ON' : 'MUTED'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.soundVolume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            disabled={!settings.soundEnabled}
            className="flex-1 accent-amber-500 cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-slate-300 w-10 text-right">
            {Math.round(settings.soundVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
