import React from 'react';
import { Player, Property, TradeOffer, AIPersonality, RentConcession } from '@/types/monopoly';
import {
  evaluatePropertyAsset,
  determineEffectivePersonality,
  getPropertyTier,
} from '@/lib/tradeEngine';
import { Brain, ArrowRightLeft, ShieldAlert, Check, X, Sparkles, Coins } from 'lucide-react';

interface IncomingTradeOfferModalProps {
  offer: TradeOffer | null;
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  properties: Property[];
  turnCount: number;
  rentConcessions: RentConcession[];
  onAccept: (offer: TradeOffer) => void;
  onCounter: (offer: TradeOffer) => void;
  onReject: (offer: TradeOffer) => void;
}

export const IncomingTradeOfferModal: React.FC<IncomingTradeOfferModalProps> = ({
  offer,
  isOpen,
  onClose,
  players,
  properties,
  turnCount,
  onAccept,
  onCounter,
  onReject,
}) => {
  if (!isOpen || !offer) return null;

  const sender = players.find((p) => p.id === offer.senderId) || players[1];
  const receiver = players.find((p) => p.id === offer.receiverId) || players[0];

  const personality: AIPersonality = determineEffectivePersonality(
    sender,
    sender.name.includes('Barney')
      ? 'SHARK'
      : sender.name.includes('Cyber')
      ? 'PRAGMATIC'
      : 'SHARK',
    players,
    properties
  );

  const offeredProps = properties.filter((p) => offer.senderProperties.includes(p.id));
  const requestedProps = properties.filter((p) => offer.receiverProperties.includes(p.id));

  // Strategic Advisor check for the receiver (Human)
  const humanGivesMonopoly = requestedProps.some((p) => {
    const groupProps = properties.filter((gp) => gp.colorGroup === p.colorGroup);
    const senderOwned = groupProps.filter((gp) => gp.ownerId === sender.id).length;
    return senderOwned === groupProps.length - 1;
  });

  const humanGetsMonopoly = offeredProps.some((p) => {
    const groupProps = properties.filter((gp) => gp.colorGroup === p.colorGroup);
    const receiverOwned = groupProps.filter((gp) => gp.ownerId === receiver.id).length;
    return receiverOwned === groupProps.length - 1;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 max-w-xl w-full shadow-2xl shadow-amber-950/40 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl font-bold">
              <Brain className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-wide">
                  Incoming Trade Proposal
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-red-950/80 text-red-300 border border-red-800">
                  {personality} BOT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                <span className="font-bold text-amber-400">{sender.name}</span> proactively offers a deal on this turn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Pitch */}
        {offer.proposerMessage && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-xs italic text-slate-300">
            &quot;{offer.proposerMessage}&quot;
          </div>
        )}

        {/* Offer vs Request Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* They Give */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3 space-y-2">
            <div className="text-[11px] font-black uppercase text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> {sender.name} Offers:
            </div>
            {offer.senderCash > 0 && (
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>+${offer.senderCash} Cash</span>
              </div>
            )}
            {offeredProps.length === 0 && offer.senderCash === 0 && (
              <div className="text-xs text-slate-500 italic">Nothing offered</div>
            )}
            {offeredProps.map((p) => {
              const tier = getPropertyTier(p.colorGroup);
              return (
                <div key={p.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 text-xs">
                  <div className="font-bold text-slate-200">{p.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                    <span className="text-emerald-400 font-bold">{tier}</span>
                    <span>Face: ${p.basePrice}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* They Request */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3 space-y-2">
            <div className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" /> {sender.name} Requests:
            </div>
            {offer.receiverCash > 0 && (
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>-${offer.receiverCash} Cash</span>
              </div>
            )}
            {requestedProps.length === 0 && offer.receiverCash === 0 && (
              <div className="text-xs text-slate-500 italic">No assets requested</div>
            )}
            {requestedProps.map((p) => {
              const tier = getPropertyTier(p.colorGroup);
              return (
                <div key={p.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 text-xs">
                  <div className="font-bold text-slate-200">{p.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                    <span className="text-amber-400 font-bold">{tier}</span>
                    <span>Face: ${p.basePrice}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strategic Analysis Box for Human */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs space-y-1.5">
          <div className="font-black text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> Strategic Advisor Analysis:
          </div>
          {humanGivesMonopoly && (
            <div className="text-red-400 font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Caution: This trade completes a full monopoly for {sender.name}!
            </div>
          )}
          {humanGetsMonopoly && (
            <div className="text-emerald-400 font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5 shrink-0" />
              Advantage: This trade completes a full monopoly for you!
            </div>
          )}
          {!humanGivesMonopoly && !humanGetsMonopoly && (
            <div className="text-slate-400">
              {sender.name} is seeking an asset exchange based on Markov landing frequencies.
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => onReject(offer)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-xs transition"
          >
            DECLINE
          </button>
          <button
            onClick={() => onCounter(offer)}
            className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold py-3 rounded-xl text-xs transition"
          >
            COUNTER-OFFER
          </button>
          <button
            onClick={() => onAccept(offer)}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
          >
            ACCEPT DEAL
          </button>
        </div>
      </div>
    </div>
  );
};
