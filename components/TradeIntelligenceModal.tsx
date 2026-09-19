import React, { useState, useMemo } from 'react';
import { Player, Property, TradeOffer, AIPersonality, RentConcession, Wildcard } from '@/types/monopoly';
import {
  evaluateTradeProposal,
  evaluatePropertyAsset,
  determineEffectivePersonality,
  calculatePerceivedCashValue,
  validateTradeHouseRules,
  TradeEvaluationResult,
  PropertyValuationReport,
} from '@/lib/tradeEngine';
import {
  ShieldAlert,
  Sparkles,
  ArrowRightLeft,
  X,
  Check,
  Coins,
  Scale,
  Zap,
  Layers,
  KeyRound,
  Building,
} from 'lucide-react';

const COLOR_HEX_STR: Record<string, string> = {
  Brown: '#8B4513',
  LightBlue: '#38BDF8',
  Pink: '#EC4899',
  Orange: '#F97316',
  Red: '#EF4444',
  Yellow: '#EAB308',
  Green: '#22C55E',
  DarkBlue: '#3B82F6',
  Railroad: '#64748B',
  Utility: '#CBD5E1',
};

interface TradeDeedCardProps {
  prop: Property;
  report: PropertyValuationReport;
  isSelected: boolean;
  onToggle: () => void;
  accent: 'emerald' | 'amber';
  allProps: Property[];
  ownerId: number;
}

const TradeDeedCard: React.FC<TradeDeedCardProps> = ({
  prop,
  report,
  isSelected,
  onToggle,
  accent,
  allProps,
  ownerId,
}) => {
  const colorHex = COLOR_HEX_STR[prop.colorGroup] || '#475569';
  const tierBadge = TIER_BADGES[report.tier] || TIER_BADGES.TIER_B;

  const groupProps = allProps.filter((p) => p.colorGroup === prop.colorGroup && p.ownerId === ownerId);
  const groupHasHouses = groupProps.some((p) => (p.houses && p.houses > 0) || p.hotel);

  const isEmerald = accent === 'emerald';
  const borderClass = isSelected
    ? isEmerald
      ? 'border-emerald-400 bg-emerald-950/40 shadow-md shadow-emerald-950/70 ring-2 ring-emerald-500/60'
      : 'border-amber-400 bg-amber-950/40 shadow-md shadow-amber-950/70 ring-2 ring-amber-500/60'
    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900/95';

  return (
    <div
      onClick={onToggle}
      className={`rounded-xl border transition-all duration-150 cursor-pointer select-none overflow-hidden flex flex-col justify-between ${borderClass} group`}
    >
      {/* Top Title Deed Colored Band */}
      <div
        className="px-2 py-1 flex items-center justify-between shrink-0 shadow-sm"
        style={{ backgroundColor: colorHex }}
      >
        <span className="text-[8.5px] font-black uppercase text-white tracking-wider drop-shadow-sm truncate">
          {prop.colorGroup}
        </span>
        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded ${tierBadge.bg} border border-white/20`}>
          {tierBadge.label}
        </span>
      </div>

      {/* Deed Body */}
      <div className="p-2 flex-1 flex flex-col justify-between gap-1 bg-slate-950/50">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-[11px] sm:text-xs font-black text-white leading-tight uppercase line-clamp-1">
              {prop.name}
            </h4>
            {isSelected && (
              <span
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                  isEmerald ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                }`}
              >
                ✓
              </span>
            )}
          </div>
          <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">{report.lore}</p>
        </div>

        {/* Houses & Hotel Equity Tag */}
        {report.hasHotel ? (
          <div className="flex items-center justify-between text-[9px] font-black bg-red-950/80 text-red-300 border border-red-800/80 px-1.5 py-0.5 rounded-md">
            <span className="flex items-center gap-1">
              <span>🏨</span>
              <span>HOTEL</span>
            </span>
            <span className="font-mono text-emerald-400">+${report.housesValue}</span>
          </div>
        ) : report.housesCount > 0 ? (
          <div className="flex items-center justify-between text-[9px] font-black bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded-md">
            <span className="flex items-center gap-1">
              <span>🏠</span>
              <span>
                {report.housesCount} {report.housesCount === 1 ? 'House' : 'Houses'}
              </span>
            </span>
            <span className="font-mono text-emerald-400">+${report.housesValue}</span>
          </div>
        ) : prop.isMortgaged ? (
          <div className="text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded-md text-center">
            MORTGAGED
          </div>
        ) : null}

        {/* Monopoly or Blocker Indicators */}
        <div className="flex items-center gap-1 flex-wrap">
          {report.completesMonopoly && (
            <span className="text-[8px] px-1 py-0.2 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
              👑 SET
            </span>
          )}
          {report.isBlocker && (
            <span className="text-[8px] px-1 py-0.2 rounded font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
              🛡️ BLOCK
            </span>
          )}
          {groupHasHouses && (
            <span className="text-[8px] px-1 py-0.2 rounded font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 truncate">
              🏘️ Set of {groupProps.length}
            </span>
          )}
        </div>

        {/* Valuation vs Face Price Footer */}
        <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80 mt-auto">
          <span className="text-[9px] text-slate-500 font-medium">Face: ${prop.basePrice}</span>
          <span
            className={`text-xs font-black font-mono ${
              isEmerald ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            ${report.finalPerceivedValue}
          </span>
        </div>
      </div>
    </div>
  );
};

interface TradeIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlayer: Player;
  players: Player[];
  properties: Property[];
  turnCount: number;
  rentConcessions: RentConcession[];
  onExecuteTrade: (
    senderId: number,
    receiverId: number,
    senderCash: number,
    receiverCash: number,
    senderProperties: string[],
    receiverProperties: string[],
    newConcessions: RentConcession[],
    senderWildcards?: string[],
    receiverWildcards?: string[],
    senderJailCard?: boolean,
    receiverJailCard?: boolean
  ) => void;
  onAddLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'danger') => void;
  initialTargetPlayerId?: number;
  initialTradeOffer?: TradeOffer | null;
}

const TIER_BADGES = {
  TIER_S: {
    label: 'PRIORITY SET',
    bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  TIER_A: {
    label: 'HIGH VALUE',
    bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  TIER_B: {
    label: 'STANDARD',
    bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  TIER_C: {
    label: 'ENTRY',
    bg: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  },
};

const PERSONALITY_INFO: Record<
  AIPersonality,
  { title: string; badge: string; color: string; desc: string; icon: string }
> = {
  SHARK: {
    title: 'Competitive Negotiator',
    badge: 'SHARK',
    color: 'border-red-500/50 bg-red-950/40 text-red-300',
    desc: 'Prefers favorable trades. Demands high surplus when parting with valuable monopoly pieces.',
    icon: '🦈',
  },
  PRAGMATIC: {
    title: 'Balanced Partner',
    badge: 'PRAGMATIC',
    color: 'border-blue-500/50 bg-blue-950/40 text-blue-300',
    desc: 'Accepts fair and mutually beneficial exchanges to build toward color sets.',
    icon: '🤝',
  },
  DESPERATE: {
    title: 'Flexible Trader',
    badge: 'SURVIVOR',
    color: 'border-amber-500/50 bg-amber-950/40 text-amber-300',
    desc: 'Willing to accept flexible terms or cash injections to stay financially solvent.',
    icon: '🆘',
  },
};

export function getWildcardValuation(card: Wildcard): { value: number; tierLabel: string; tierColor: string } {
  if (card.type === 'Super') {
    return { value: 250, tierLabel: 'SUPER CARD', tierColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
  }
  if (card.id.includes('free_rent') || card.id.includes('discount')) {
    return { value: 160, tierLabel: 'HIGH VALUE', tierColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
  }
  if (card.id.includes('crooked') || card.id.includes('lottery') || card.id.includes('extra_die')) {
    return { value: 130, tierLabel: 'MEDIUM VALUE', tierColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
  }
  return { value: 100, tierLabel: 'TACTICAL', tierColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
}

export const TradeIntelligenceModal: React.FC<TradeIntelligenceModalProps> = ({
  isOpen,
  onClose,
  activePlayer,
  players,
  properties,
  turnCount,
  rentConcessions,
  onExecuteTrade,
  onAddLog,
  initialTargetPlayerId,
  initialTradeOffer,
}) => {
  const eligibleTargets = useMemo(
    () => players.filter((p) => p.id !== activePlayer.id && !p.isBankrupt),
    [players, activePlayer.id]
  );

  const [targetPlayerId, setTargetPlayerId] = useState<number>(() => {
    if (initialTradeOffer) {
      return initialTradeOffer.senderId === activePlayer.id
        ? initialTradeOffer.receiverId
        : initialTradeOffer.senderId;
    }
    if (initialTargetPlayerId && eligibleTargets.some((p) => p.id === initialTargetPlayerId)) {
      return initialTargetPlayerId;
    }
    return eligibleTargets[0]?.id || 1;
  });

  const [offerCash, setOfferCash] = useState<number>(() => {
    if (initialTradeOffer && initialTradeOffer.senderId === activePlayer.id) {
      return initialTradeOffer.senderCash;
    }
    if (initialTradeOffer && initialTradeOffer.receiverId === activePlayer.id) {
      return initialTradeOffer.receiverCash;
    }
    return 0;
  });

  const [requestCash, setRequestCash] = useState<number>(() => {
    if (initialTradeOffer && initialTradeOffer.senderId === activePlayer.id) {
      return initialTradeOffer.receiverCash;
    }
    if (initialTradeOffer && initialTradeOffer.receiverId === activePlayer.id) {
      return initialTradeOffer.senderCash;
    }
    return 0;
  });

  const [selectedOfferProps, setSelectedOfferProps] = useState<string[]>(() => {
    if (initialTradeOffer && initialTradeOffer.senderId === activePlayer.id) {
      return initialTradeOffer.senderProperties;
    }
    if (initialTradeOffer && initialTradeOffer.receiverId === activePlayer.id) {
      return initialTradeOffer.receiverProperties;
    }
    return [];
  });

  const [selectedRequestProps, setSelectedRequestProps] = useState<string[]>(() => {
    if (initialTradeOffer && initialTradeOffer.senderId === activePlayer.id) {
      return initialTradeOffer.receiverProperties;
    }
    if (initialTradeOffer && initialTradeOffer.receiverId === activePlayer.id) {
      return initialTradeOffer.senderProperties;
    }
    return [];
  });

  // Hand cards: Wildcards & Jail cards
  const [selectedOfferWildcards, setSelectedOfferWildcards] = useState<string[]>(() => {
    return initialTradeOffer?.senderWildcardIds || [];
  });
  const [selectedRequestWildcards, setSelectedRequestWildcards] = useState<string[]>(() => {
    return initialTradeOffer?.receiverWildcardIds || [];
  });
  const [offerJailCard, setOfferJailCard] = useState<boolean>(() => {
    return Boolean(initialTradeOffer?.senderGetOutOfJailCard);
  });
  const [requestJailCard, setRequestJailCard] = useState<boolean>(() => {
    return Boolean(initialTradeOffer?.receiverGetOutOfJailCard);
  });

  // Filter tabs for Hand View
  const [offerCardTab, setOfferCardTab] = useState<'ALL' | 'PROPERTIES' | 'WILDCARDS' | 'SPECIAL'>('ALL');
  const [requestCardTab, setRequestCardTab] = useState<'ALL' | 'PROPERTIES' | 'WILDCARDS' | 'SPECIAL'>('ALL');

  const [offerRentImmunity, setOfferRentImmunity] = useState<boolean>(
    Boolean(initialTradeOffer?.rentConcessions && initialTradeOffer.rentConcessions.length > 0)
  );

  const [evaluationResult, setEvaluationResult] = useState<TradeEvaluationResult | null>(null);
  const [showVerdictModal, setShowVerdictModal] = useState<boolean>(false);

  const targetPlayer = useMemo(
    () => players.find((p) => p.id === targetPlayerId) || eligibleTargets[0] || players[1],
    [players, targetPlayerId, eligibleTargets]
  );

  const effectivePersonality = useMemo(() => {
    return determineEffectivePersonality(
      targetPlayer,
      targetPlayer.name.includes('Barney')
        ? 'SHARK'
        : targetPlayer.name.includes('Cyber')
        ? 'PRAGMATIC'
        : 'SHARK',
      players,
      properties
    );
  }, [targetPlayer, players, properties]);

  const activePlayerProps = useMemo(
    () => properties.filter((p) => p.ownerId === activePlayer.id),
    [properties, activePlayer.id]
  );

  const targetPlayerProps = useMemo(
    () => properties.filter((p) => p.ownerId === targetPlayer.id),
    [properties, targetPlayer.id]
  );

  // Compile active proposal object
  const currentOffer: TradeOffer = useMemo(() => {
    const concessions: RentConcession[] = [];
    if (offerRentImmunity && selectedOfferProps.length > 0) {
      concessions.push({
        id: `concession_${activePlayer.id}_${targetPlayer.id}_${selectedOfferProps[0]}`,
        grantorId: activePlayer.id,
        beneficiaryId: targetPlayer.id,
        propertyId: selectedOfferProps[0],
        remainingLandings: 2,
      });
    }
    return {
      id: `trade_${activePlayer.id}_${targetPlayer.id}_${selectedOfferProps.join('_')}_${selectedRequestProps.join('_')}`,
      senderId: activePlayer.id,
      receiverId: targetPlayer.id,
      senderCash: offerCash,
      receiverCash: requestCash,
      senderProperties: selectedOfferProps,
      receiverProperties: selectedRequestProps,
      senderWildcardIds: selectedOfferWildcards,
      receiverWildcardIds: selectedRequestWildcards,
      senderGetOutOfJailCard: offerJailCard,
      receiverGetOutOfJailCard: requestJailCard,
      rentConcessions: concessions,
    };
  }, [
    activePlayer.id,
    targetPlayer.id,
    offerCash,
    requestCash,
    selectedOfferProps,
    selectedRequestProps,
    selectedOfferWildcards,
    selectedRequestWildcards,
    offerJailCard,
    requestJailCard,
    offerRentImmunity,
  ]);

  // Real-time live evaluation
  const liveEvaluation = useMemo(() => {
    const baseEval = evaluateTradeProposal(
      currentOffer,
      players,
      properties,
      turnCount,
      effectivePersonality
    );

    // Factor in hand wildcards and jail cards into the evaluation totals
    let extraReceivedValue = 0;
    selectedOfferWildcards.forEach((wId) => {
      const card = activePlayer.wildcardsHand.find((c) => c.id === wId);
      if (card) extraReceivedValue += getWildcardValuation(card).value;
    });
    if (offerJailCard) {
      extraReceivedValue += 75;
    }

    let extraGivenValue = 0;
    selectedRequestWildcards.forEach((wId) => {
      const card = targetPlayer.wildcardsHand.find((c) => c.id === wId);
      if (card) extraGivenValue += getWildcardValuation(card).value;
    });
    if (requestJailCard) {
      extraGivenValue += 75;
    }

    const totalReceived = baseEval.perceivedReceivedValue + extraReceivedValue;
    const totalGiven = baseEval.perceivedGivenValue + extraGivenValue;
    const deltaV = totalReceived - totalGiven;
    const ratio = totalGiven > 0 ? totalReceived / totalGiven : totalReceived > 0 ? 2 : 1;

    let verdict: 'ACCEPT' | 'COUNTER' | 'REJECT' = baseEval.verdict;
    if (deltaV >= 0 && ratio >= baseEval.requiredLeewayRatio) {
      verdict = 'ACCEPT';
    } else if (ratio >= baseEval.requiredLeewayRatio * 0.75) {
      verdict = 'COUNTER';
    } else {
      verdict = 'REJECT';
    }

    return {
      ...baseEval,
      perceivedReceivedValue: totalReceived,
      perceivedGivenValue: totalGiven,
      deltaV,
      ratio,
      verdict,
    };
  }, [
    currentOffer,
    players,
    properties,
    turnCount,
    effectivePersonality,
    selectedOfferWildcards,
    selectedRequestWildcards,
    offerJailCard,
    requestJailCard,
    activePlayer.wildcardsHand,
    targetPlayer.wildcardsHand,
  ]);

  const houseValidation = useMemo(() => {
    return validateTradeHouseRules(selectedOfferProps, selectedRequestProps, properties);
  }, [selectedOfferProps, selectedRequestProps, properties]);

  if (!isOpen) return null;

  const toggleOfferProperty = (propId: string) => {
    const prop = properties.find((p) => p.id === propId);
    if (!prop) return;

    // Check if property belongs to a color group with houses owned by activePlayer
    const groupProps = properties.filter(
      (p) => p.colorGroup === prop.colorGroup && p.ownerId === activePlayer.id
    );
    const groupHasHouses = groupProps.some((p) => (p.houses && p.houses > 0) || p.hotel);

    if (groupHasHouses && groupProps.length > 1) {
      // User rule: allow trading properties with houses as long as all three are traded
      const allSelected = groupProps.every((p) => selectedOfferProps.includes(p.id));
      if (allSelected) {
        const groupIds = groupProps.map((p) => p.id);
        setSelectedOfferProps((prev) => prev.filter((id) => !groupIds.includes(id)));
      } else {
        const groupIds = groupProps.map((p) => p.id);
        setSelectedOfferProps((prev) => Array.from(new Set([...prev, ...groupIds])));
        onAddLog(
          `🏘️ Set with houses: All ${groupProps.length} properties in ${prop.colorGroup} included in trade.`,
          'info'
        );
      }
      return;
    }

    setSelectedOfferProps((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const toggleRequestProperty = (propId: string) => {
    const prop = properties.find((p) => p.id === propId);
    if (!prop) return;

    const groupProps = properties.filter(
      (p) => p.colorGroup === prop.colorGroup && p.ownerId === targetPlayer.id
    );
    const groupHasHouses = groupProps.some((p) => (p.houses && p.houses > 0) || p.hotel);

    if (groupHasHouses && groupProps.length > 1) {
      const allSelected = groupProps.every((p) => selectedRequestProps.includes(p.id));
      if (allSelected) {
        const groupIds = groupProps.map((p) => p.id);
        setSelectedRequestProps((prev) => prev.filter((id) => !groupIds.includes(id)));
      } else {
        const groupIds = groupProps.map((p) => p.id);
        setSelectedRequestProps((prev) => Array.from(new Set([...prev, ...groupIds])));
        onAddLog(
          `🏘️ Set with houses: Requesting all ${groupProps.length} properties in ${prop.colorGroup}.`,
          'info'
        );
      }
      return;
    }

    setSelectedRequestProps((prev) =>
      prev.includes(propId) ? prev.filter((id) => id !== propId) : [...prev, propId]
    );
  };

  const toggleOfferWildcard = (cardId: string) => {
    setSelectedOfferWildcards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const toggleRequestWildcard = (cardId: string) => {
    setSelectedRequestWildcards((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  const handleAutoBalanceCash = () => {
    const requiredRatio = liveEvaluation.requiredLeewayRatio;
    const targetValue = Math.round(liveEvaluation.perceivedGivenValue * requiredRatio);
    const needed = Math.max(0, targetValue - liveEvaluation.perceivedReceivedValue);

    if (needed > 0) {
      const affordable = Math.min(activePlayer.cash, offerCash + needed);
      setOfferCash(affordable);
      onAddLog(
        `⚖️ Exchange Center calculated balancing cash: +$${affordable - offerCash} suggested for acceptance.`,
        'info'
      );
    } else {
      const surplus = Math.abs(liveEvaluation.deltaV);
      const reduced = Math.max(0, offerCash - surplus);
      setOfferCash(reduced);
      onAddLog(`⚖️ Exchange Center optimized cash: reduced by $${offerCash - reduced}.`, 'info');
    }
  };

  const handleSendProposal = () => {
    setEvaluationResult(liveEvaluation);
    setShowVerdictModal(true);
  };

  const handleAcceptFinalDeal = (tradeToExecute: TradeOffer) => {
    const newConcessions = tradeToExecute.rentConcessions || [];
    onExecuteTrade(
      tradeToExecute.senderId,
      tradeToExecute.receiverId,
      tradeToExecute.senderCash,
      tradeToExecute.receiverCash,
      tradeToExecute.senderProperties,
      tradeToExecute.receiverProperties,
      [...rentConcessions, ...newConcessions],
      tradeToExecute.senderWildcardIds,
      tradeToExecute.receiverWildcardIds,
      tradeToExecute.senderGetOutOfJailCard,
      tradeToExecute.receiverGetOutOfJailCard
    );
    setShowVerdictModal(false);
    onClose();
  };

  const pInfo = PERSONALITY_INFO[effectivePersonality];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900/95 border border-slate-700/70 rounded-3xl w-full max-w-6xl shadow-2xl shadow-black/80 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <ArrowRightLeft className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white uppercase">
                  Exchange Center
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PLAYER TRADING & VALUATIONS
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Review your hand cards, calculate exchange values, and negotiate trades.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Exchange Center"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Opponent & Personality Bar */}
        <div className="px-6 py-3 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs sm:text-sm font-bold uppercase text-slate-300">Trading Partner:</label>
            <select
              value={targetPlayerId}
              onChange={(e) => {
                setTargetPlayerId(Number(e.target.value));
                setSelectedRequestProps([]);
                setSelectedRequestWildcards([]);
                setRequestJailCard(false);
                setRequestCash(0);
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
            >
              {eligibleTargets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.cash} cash)
                </option>
              ))}
            </select>
          </div>

          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs sm:text-sm font-medium ${pInfo.color}`}
          >
            <span className="text-lg">{pInfo.icon}</span>
            <div>
              <span className="font-black uppercase mr-1">{pInfo.badge}:</span>
              <span className="opacity-95">{pInfo.desc}</span>
            </div>
          </div>
        </div>

        {/* Main Body - 2 Columns (Your Hand / Offer vs Target Assets / Request) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 overflow-y-auto flex-1 min-h-0 bg-slate-950/40">
          {/* LEFT: Your Hand & Offer */}
          <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wider">
                  Your Hand & Offer ({activePlayer.name})
                </h3>
              </div>
              <span className="text-xs sm:text-sm text-emerald-400 font-black">
                Available Cash: ${activePlayer.cash}
              </span>
            </div>

            {/* Cash Stepper */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-bold uppercase text-slate-200 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" /> Offer Cash ($)
                </label>
                <div className="flex items-center gap-1">
                  {[25, 50, 100].map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setOfferCash((prev) => Math.min(activePlayer.cash, prev + inc))}
                      className="text-xs bg-slate-700/80 hover:bg-slate-700 px-2.5 py-1 rounded text-slate-200 font-bold transition"
                    >
                      +{inc}
                    </button>
                  ))}
                  <button
                    onClick={() => setOfferCash(activePlayer.cash)}
                    className="text-xs bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded font-bold transition"
                  >
                    MAX
                  </button>
                  <button
                    onClick={() => setOfferCash(0)}
                    className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded font-bold transition"
                  >
                    CLR
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={activePlayer.cash}
                  step={10}
                  value={offerCash}
                  onChange={(e) => setOfferCash(Number(e.target.value))}
                  className="flex-1 accent-emerald-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={activePlayer.cash}
                  value={offerCash}
                  onChange={(e) => setOfferCash(Math.min(activePlayer.cash, Math.max(0, Number(e.target.value))))}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-emerald-400 font-black text-right text-base"
                />
              </div>
              <div className="mt-1.5 text-xs text-slate-400 flex justify-between">
                <span>Perceived Cash Value:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ${calculatePerceivedCashValue(offerCash, targetPlayer.cash, true)}
                </span>
              </div>
            </div>

            {/* Hand Cards Category Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setOfferCardTab('ALL')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                  offerCardTab === 'ALL'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Cards ({activePlayerProps.length + activePlayer.wildcardsHand.length + (activePlayer.hasGetOutOfJailFreeCard ? 1 : 0)})
              </button>
              <button
                onClick={() => setOfferCardTab('PROPERTIES')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                  offerCardTab === 'PROPERTIES'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Properties ({activePlayerProps.length})
              </button>
              <button
                onClick={() => setOfferCardTab('WILDCARDS')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                  offerCardTab === 'WILDCARDS'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Wildcards ({activePlayer.wildcardsHand.length})
              </button>
              {activePlayer.hasGetOutOfJailFreeCard && (
                <button
                  onClick={() => setOfferCardTab('SPECIAL')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                    offerCardTab === 'SPECIAL'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Special (1)
                </button>
              )}
            </div>

            {/* Cards List in Your Hand */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                {/* 1. Get Out of Jail Free Card */}
                {activePlayer.hasGetOutOfJailFreeCard && (offerCardTab === 'ALL' || offerCardTab === 'SPECIAL') && (
                  <div
                    onClick={() => setOfferJailCard((prev) => !prev)}
                    className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                      offerJailCard
                        ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-950'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-100">Get Out of Jail Free</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              SPECIAL
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">Immediate jail release • Official bail waiver</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-emerald-400">$75</div>
                        <span className="text-[10px] text-slate-500">Valuation</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Wildcards in Hand */}
                {(offerCardTab === 'ALL' || offerCardTab === 'WILDCARDS') &&
                  activePlayer.wildcardsHand.map((wCard) => {
                    const isSelected = selectedOfferWildcards.includes(wCard.id);
                    const val = getWildcardValuation(wCard);

                    return (
                      <div
                        key={wCard.id}
                        onClick={() => toggleOfferWildcard(wCard.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-950'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/40">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-100">{wCard.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${val.tierColor}`}>
                                  {val.tierLabel}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 line-clamp-1">{wCard.description}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-emerald-400">${val.value}</div>
                            <span className="text-[10px] text-slate-500">Valuation</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* 3. Properties in Hand (Title Deed Cards in Grid) */}
                {(offerCardTab === 'ALL' || offerCardTab === 'PROPERTIES') && activePlayerProps.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {activePlayerProps.map((prop) => {
                      const isSelected = selectedOfferProps.includes(prop.id);
                      const report = evaluatePropertyAsset(
                        prop,
                        activePlayer,
                        targetPlayer,
                        false,
                        properties,
                        turnCount
                      );
                      return (
                        <TradeDeedCard
                          key={prop.id}
                          prop={prop}
                          report={report}
                          isSelected={isSelected}
                          onToggle={() => toggleOfferProperty(prop.id)}
                          accent="emerald"
                          allProps={properties}
                          ownerId={activePlayer.id}
                        />
                      );
                    })}
                  </div>
                )}

                {activePlayerProps.length === 0 &&
                  activePlayer.wildcardsHand.length === 0 &&
                  !activePlayer.hasGetOutOfJailFreeCard && (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No cards currently in hand.
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* RIGHT: Partner Assets & Request */}
          <div className="flex flex-col gap-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wider">
                  You Request ({targetPlayer.name})
                </h3>
              </div>
              <span className="text-xs sm:text-sm text-amber-400 font-black">
                Available Cash: ${targetPlayer.cash}
              </span>
            </div>

            {/* Cash Stepper */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-bold uppercase text-slate-200 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" /> Request Cash ($)
                </label>
                <div className="flex items-center gap-1">
                  {[25, 50, 100].map((inc) => (
                    <button
                      key={inc}
                      onClick={() => setRequestCash((prev) => Math.min(targetPlayer.cash, prev + inc))}
                      className="text-xs bg-slate-700/80 hover:bg-slate-700 px-2.5 py-1 rounded text-slate-200 font-bold transition"
                    >
                      +{inc}
                    </button>
                  ))}
                  <button
                    onClick={() => setRequestCash(targetPlayer.cash)}
                    className="text-xs bg-amber-950 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded font-bold transition"
                  >
                    MAX
                  </button>
                  <button
                    onClick={() => setRequestCash(0)}
                    className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded font-bold transition"
                  >
                    CLR
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={targetPlayer.cash}
                  step={10}
                  value={requestCash}
                  onChange={(e) => setRequestCash(Number(e.target.value))}
                  className="flex-1 accent-amber-500 cursor-pointer"
                />
                <input
                  type="number"
                  min={0}
                  max={targetPlayer.cash}
                  value={requestCash}
                  onChange={(e) => setRequestCash(Math.min(targetPlayer.cash, Math.max(0, Number(e.target.value))))}
                  className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-amber-400 font-black text-right text-base"
                />
              </div>
              <div className="mt-1.5 text-xs text-slate-400 flex justify-between">
                <span>Perceived Value to Partner:</span>
                <span className="font-bold text-amber-400 text-sm">
                  ${calculatePerceivedCashValue(requestCash, targetPlayer.cash, false)}
                </span>
              </div>
            </div>

            {/* Partner Cards Category Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setRequestCardTab('ALL')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                  requestCardTab === 'ALL'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Cards ({targetPlayerProps.length + targetPlayer.wildcardsHand.length + (targetPlayer.hasGetOutOfJailFreeCard ? 1 : 0)})
              </button>
              <button
                onClick={() => setRequestCardTab('PROPERTIES')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                  requestCardTab === 'PROPERTIES'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Properties ({targetPlayerProps.length})
              </button>
              <button
                onClick={() => setRequestCardTab('WILDCARDS')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                  requestCardTab === 'WILDCARDS'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Wildcards ({targetPlayer.wildcardsHand.length})
              </button>
              {targetPlayer.hasGetOutOfJailFreeCard && (
                <button
                  onClick={() => setRequestCardTab('SPECIAL')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition ${
                    requestCardTab === 'SPECIAL'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Special (1)
                </button>
              )}
            </div>

            {/* Target Player Cards List */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                {/* 1. Target Get Out of Jail Free Card */}
                {targetPlayer.hasGetOutOfJailFreeCard && (requestCardTab === 'ALL' || requestCardTab === 'SPECIAL') && (
                  <div
                    onClick={() => setRequestJailCard((prev) => !prev)}
                    className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                      requestJailCard
                        ? 'bg-amber-950/50 border-amber-500 shadow-md shadow-amber-950'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-100">Get Out of Jail Free</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              SPECIAL
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">Immediate jail release • Official bail waiver</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-black text-amber-400">$75</div>
                        <span className="text-[10px] text-slate-500">Valuation</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Target Wildcards */}
                {(requestCardTab === 'ALL' || requestCardTab === 'WILDCARDS') &&
                  targetPlayer.wildcardsHand.map((wCard) => {
                    const isSelected = selectedRequestWildcards.includes(wCard.id);
                    const val = getWildcardValuation(wCard);

                    return (
                      <div
                        key={wCard.id}
                        onClick={() => toggleRequestWildcard(wCard.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                          isSelected
                            ? 'bg-amber-950/50 border-amber-500 shadow-md shadow-amber-950'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/40">
                              <Zap className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-100">{wCard.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black border ${val.tierColor}`}>
                                  {val.tierLabel}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 line-clamp-1">{wCard.description}</div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-amber-400">${val.value}</div>
                            <span className="text-[10px] text-slate-500">Valuation</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* 3. Target Properties (Title Deed Cards in Grid) */}
                {(requestCardTab === 'ALL' || requestCardTab === 'PROPERTIES') && targetPlayerProps.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {targetPlayerProps.map((prop) => {
                      const isSelected = selectedRequestProps.includes(prop.id);
                      const report = evaluatePropertyAsset(
                        prop,
                        targetPlayer,
                        activePlayer,
                        true,
                        properties,
                        turnCount
                      );
                      return (
                        <TradeDeedCard
                          key={prop.id}
                          prop={prop}
                          report={report}
                          isSelected={isSelected}
                          onToggle={() => toggleRequestProperty(prop.id)}
                          accent="amber"
                          allProps={properties}
                          ownerId={targetPlayer.id}
                        />
                      );
                    })}
                  </div>
                )}

                {targetPlayerProps.length === 0 &&
                  targetPlayer.wildcardsHand.length === 0 &&
                  !targetPlayer.hasGetOutOfJailFreeCard && (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      Partner owns no properties or cards yet.
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* House Rule Validation Warning Banner */}
        {!houseValidation.valid && (
          <div className="mx-6 my-1.5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-center gap-2.5 shrink-0 shadow-md animate-in fade-in duration-200">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span className="text-rose-300 font-black uppercase tracking-wider mr-1.5">Housing Rule:</span>
              <span>{houseValidation.error}</span>
            </div>
          </div>
        )}

        {/* Concessions Bar */}
        <div className="px-6 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm shrink-0">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300 select-none">
            <input
              type="checkbox"
              checked={offerRentImmunity}
              onChange={(e) => setOfferRentImmunity(e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded"
            />
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              Concession: Grant 2 Free Landings (Rent Immunity) on Offered Property
            </span>
          </label>

          <button
            onClick={handleAutoBalanceCash}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-1.5 rounded-xl font-bold border border-slate-700 transition text-xs sm:text-sm"
          >
            <Scale className="w-4 h-4 text-amber-400" />
            Auto-Balance Cash Offer
          </button>
        </div>

        {/* Real-time Exchange Stats HUD with Crisp, Big, Readable Typography */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800/90 shrink-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Value comparison metrics */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              <div>
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Partner Receives
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
                  ${liveEvaluation.perceivedReceivedValue}
                </div>
              </div>

              <div className="text-slate-600 font-black text-xl">vs</div>

              <div>
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Partner Gives
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-0.5">
                  ${liveEvaluation.perceivedGivenValue}
                </div>
              </div>

              <div className="border-l border-slate-800 pl-6 sm:pl-8">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Net Balance
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black font-mono mt-0.5 ${
                    liveEvaluation.deltaV >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {liveEvaluation.deltaV >= 0 ? '+' : ''}${liveEvaluation.deltaV}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Exchange Ratio
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-200 font-mono mt-0.5">
                  {(liveEvaluation.ratio * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Predicted Response & Action */}
            <div className="flex items-center gap-4 self-stretch md:self-auto justify-between md:justify-end">
              <div className="text-right">
                <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  Predicted Response
                </div>
                <div
                  className={`text-sm sm:text-base font-black flex items-center justify-end gap-1.5 mt-0.5 ${
                    liveEvaluation.verdict === 'ACCEPT'
                      ? 'text-emerald-400'
                      : liveEvaluation.verdict === 'COUNTER'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {liveEvaluation.verdict === 'ACCEPT' && <Check className="w-5 h-5" />}
                  {liveEvaluation.verdict === 'COUNTER' && <Sparkles className="w-5 h-5" />}
                  {liveEvaluation.verdict === 'REJECT' && <ShieldAlert className="w-5 h-5" />}
                  <span>
                    {liveEvaluation.verdict === 'ACCEPT'
                      ? 'LIKELY ACCEPT'
                      : liveEvaluation.verdict === 'COUNTER'
                      ? 'COUNTER-OFFER LIKELY'
                      : 'WILL REJECT'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSendProposal}
                disabled={
                  !houseValidation.valid ||
                  (selectedOfferProps.length === 0 && selectedOfferWildcards.length === 0 && !offerJailCard && offerCash === 0) ||
                  (selectedRequestProps.length === 0 && selectedRequestWildcards.length === 0 && !requestJailCard && requestCash === 0)
                }
                className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black px-6 py-3 rounded-2xl text-sm sm:text-base shadow-lg shadow-amber-500/20 flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowRightLeft className="w-5 h-5" />
                <span>PROPOSE TRADE</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VERDICT & COUNTER-OFFER DIALOG MODAL */}
      {showVerdictModal && evaluationResult && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${
                  evaluationResult.verdict === 'ACCEPT'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : evaluationResult.verdict === 'COUNTER'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}
              >
                {evaluationResult.verdict === 'ACCEPT' ? '🤝' : evaluationResult.verdict === 'COUNTER' ? '⚖️' : '🛑'}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">
                  {evaluationResult.verdict === 'ACCEPT'
                    ? 'TRADE ACCEPTED!'
                    : evaluationResult.verdict === 'COUNTER'
                    ? 'COUNTER-OFFER RECEIVED'
                    : 'TRADE DECLINED'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {targetPlayer.name} has reviewed your proposed trade terms.
                </p>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm space-y-2">
              <p className="font-bold text-slate-200">
                {evaluationResult.summaryReason}
              </p>
              {evaluationResult.detailedAnalysis.length > 0 && (
                <div className="space-y-1 text-slate-400 pt-1 border-t border-slate-800">
                  {evaluationResult.detailedAnalysis.slice(0, 3).map((line, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0">•</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Counter offer terms if counter */}
            {evaluationResult.verdict === 'COUNTER' && evaluationResult.counterOffer && (
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" /> Suggested Adjustments
                </span>
                <p className="text-xs text-amber-200">
                  Adjust cash or properties to reach a balanced deal that both players can accept.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              {evaluationResult.verdict === 'ACCEPT' && (
                <button
                  onClick={() => handleAcceptFinalDeal(currentOffer)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl text-sm transition"
                >
                  EXECUTE DEAL
                </button>
              )}
              {evaluationResult.verdict === 'COUNTER' && evaluationResult.counterOffer && (
                <button
                  onClick={() => {
                    handleAcceptFinalDeal(evaluationResult.counterOffer!);
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-sm transition"
                >
                  ACCEPT COUNTER-OFFER
                </button>
              )}
              <button
                onClick={() => setShowVerdictModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-2xl text-sm transition"
              >
                {evaluationResult.verdict === 'ACCEPT' ? 'CANCEL' : 'BACK TO EXCHANGE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
