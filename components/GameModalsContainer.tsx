'use client';

import React from 'react';
import {
  GameState,
  Player,
  Property,
  BoardSpace,
  TradeOffer,
  RentConcession,
  GameRulesOptions,
  GameSettingsOptions,
  TokenShape,
  Wildcard,
  GameEventLog,
} from '@/types/monopoly';
import { ALL_WILDCARDS } from '@/lib/wildcards';
import { soundFx } from '@/lib/sound';
import { ChanceCard } from '@/lib/chanceCards';
import { CommunityChestCard } from '@/lib/communityChestCards';
import { RailwayTransitModal } from '@/components/RailwayTransitModal';
import { LandOnGoModal } from '@/components/LandOnGoModal';
import { TaxBreakdownModal } from '@/components/TaxBreakdownModal';
import { StartingWildcardReveal } from '@/components/StartingWildcardReveal';
import { FreeParkingJackpotModal } from '@/components/FreeParkingJackpotModal';
import { TradeIntelligenceModal } from '@/components/TradeIntelligenceModal';
import { IncomingTradeOfferModal } from '@/components/IncomingTradeOfferModal';
import { EndgameModal } from '@/components/EndgameModal';
import { SpreePhase1Modal, SpreeAwardItem } from '@/components/SpreePhase1Modal';
import { GameMainMenuModal } from '@/components/GameMainMenuModal';
import { DevToolsModal } from '@/components/DevToolsModal';

export interface GameModalsContainerProps {
  engineState: {
    gameState: GameState;
    players: Player[];
    properties: Property[];
    boardSpaces: BoardSpace[];
    logs: GameEventLog[];
  };
  setEngineState: React.Dispatch<React.SetStateAction<any>>;
  activePlayer: Player;
  rules: GameRulesOptions;
  setRules: React.Dispatch<React.SetStateAction<GameRulesOptions>>;
  settings: GameSettingsOptions;
  setSettings: React.Dispatch<React.SetStateAction<GameSettingsOptions>>;
  hasGameStarted: boolean;
  setHasGameStarted: React.Dispatch<React.SetStateAction<boolean>>;
  addLog: (message: string, type?: GameEventLog['type'], playerId?: number) => void;

  isMainMenuOpen: boolean;
  setIsMainMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  devToolsOpen: boolean;
  setDevToolsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTokenShape: TokenShape;
  onSelectTokenShape: (shape: TokenShape) => void;
  isTimerDisabled: boolean;
  setIsTimerDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  revealStartingWildcard: Wildcard | null;
  setRevealStartingWildcard: React.Dispatch<React.SetStateAction<Wildcard | null>>;

  turnPipeline: {
    railwayTransitModalOpen: boolean;
    setRailwayTransitModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    landOnGoModalOpen: boolean;
    isTaxBreakdownOpen: boolean;
    setIsTaxBreakdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
    freeParkingModalOpen: boolean;
    setFreeParkingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    handleExecuteRailTransit: (targetSpaceIndex: number, cost: number, stationName: string) => void;
    handleTakeDoubleCash: () => void;
    handleWarpToSpace: (targetSpaceIndex: number, spaceName: string) => void;
    handleFreeParkingLanding: (isDoubles: boolean) => void;
  };

  cardActions: {
    setActiveChanceCard: React.Dispatch<React.SetStateAction<ChanceCard | null>>;
    setActiveCommunityChestCard: React.Dispatch<React.SetStateAction<CommunityChestCard | null>>;
  };

  gameLoop: {
    tradeModalOpen: boolean;
    setTradeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    tradeTargetPlayerId: number;
    setTradeTargetPlayerId: React.Dispatch<React.SetStateAction<number>>;
    activeTradeOfferForModal: TradeOffer | null;
    setActiveTradeOfferForModal: React.Dispatch<React.SetStateAction<TradeOffer | null>>;
    incomingAiTradeOffer: TradeOffer | null;
    setIncomingAiTradeOffer: React.Dispatch<React.SetStateAction<TradeOffer | null>>;
    spreePhase1ModalOpen: boolean;
    setSpreePhase1ModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    spreePhase1Awards: SpreeAwardItem[];
    endgameReason: 'SOLE_SURVIVOR' | 'MONOPOLY_SPREE_TIMEOUT' | 'BANKRUPTCY';
    handleExecuteTradeProposal: (
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
    handleDeclareBankruptcy: (playerId: number) => void;
  };

  handleStartNewGame: (newRules?: GameRulesOptions, newSettings?: GameSettingsOptions) => void;
  handleResetToMainMenu: () => void;
}

export function GameModalsContainer({
  engineState,
  setEngineState,
  activePlayer,
  rules,
  setRules,
  settings,
  setSettings,
  hasGameStarted,
  setHasGameStarted,
  addLog,
  isMainMenuOpen,
  setIsMainMenuOpen,
  devToolsOpen,
  setDevToolsOpen,
  selectedTokenShape,
  onSelectTokenShape,
  isTimerDisabled,
  setIsTimerDisabled,
  revealStartingWildcard,
  setRevealStartingWildcard,
  turnPipeline,
  cardActions,
  gameLoop,
  handleStartNewGame,
  handleResetToMainMenu,
}: GameModalsContainerProps) {
  const { gameState, players, properties, boardSpaces } = engineState;

  return (
    <>
      {/* Railway Transit Modal */}
      <RailwayTransitModal
        isOpen={turnPipeline.railwayTransitModalOpen}
        onClose={() => turnPipeline.setRailwayTransitModalOpen(false)}
        player={activePlayer}
        currentSpaceIndex={activePlayer.position}
        properties={properties}
        players={players}
        onSelectTransit={turnPipeline.handleExecuteRailTransit}
      />

      {/* Land on GO Modal */}
      <LandOnGoModal
        isOpen={turnPipeline.landOnGoModalOpen}
        player={activePlayer}
        boardSpaces={boardSpaces}
        onTakeDoubleCash={turnPipeline.handleTakeDoubleCash}
        onWarpToSpace={turnPipeline.handleWarpToSpace}
      />

      {/* Tax Day Municipal Breakdown Modal */}
      <TaxBreakdownModal
        isOpen={turnPipeline.isTaxBreakdownOpen}
        onClose={() => turnPipeline.setIsTaxBreakdownOpen(false)}
        player={activePlayer}
        properties={properties}
        bankerLapCounter={gameState.bankerLapCounter || 0}
      />

      {/* Starting Wildcard Dramatic Reveal */}
      <StartingWildcardReveal
        card={revealStartingWildcard}
        onComplete={() => setRevealStartingWildcard(null)}
      />

      {/* Free Parking Vault Jackpot Challenge Modal */}
      <FreeParkingJackpotModal
        isOpen={turnPipeline.freeParkingModalOpen}
        player={activePlayer}
        lotteryPool={gameState.lotteryPool}
        onRollDoublesChallenge={() => {
          const d1 = Math.floor(Math.random() * 6) + 1;
          const d2 = Math.floor(Math.random() * 6) + 1;
          return { d1, d2, isDoubles: d1 === d2 };
        }}
        onResolveChallenge={(won, poolAmount) => {
          turnPipeline.setFreeParkingModalOpen(false);
          if (won) {
            soundFx.playCash();
            setEngineState((prev: any) => ({
              ...prev,
              players: prev.players.map((p: Player) =>
                p.id === activePlayer.id ? { ...p, cash: p.cash + poolAmount } : p
              ),
              gameState: { ...prev.gameState, lotteryPool: 0 },
            }));
            addLog(
              `💰 ${activePlayer.name} cracked the Free Parking Vault and took home the $${poolAmount} Jackpot!`,
              'success',
              activePlayer.id
            );
          } else {
            turnPipeline.handleFreeParkingLanding(false);
          }
        }}
      />

      {/* Strategic Trade Intelligence Engine Modal */}
      <TradeIntelligenceModal
        isOpen={gameLoop.tradeModalOpen}
        onClose={() => {
          gameLoop.setTradeModalOpen(false);
          gameLoop.setActiveTradeOfferForModal(null);
        }}
        activePlayer={activePlayer}
        players={players}
        properties={properties}
        turnCount={gameState.turnCount || 1}
        rentConcessions={gameState.rentConcessions || []}
        onExecuteTrade={gameLoop.handleExecuteTradeProposal}
        onAddLog={addLog}
        initialTargetPlayerId={gameLoop.tradeTargetPlayerId}
        initialTradeOffer={gameLoop.activeTradeOfferForModal}
      />

      {/* Proactive Incoming AI Trade Proposal Modal */}
      <IncomingTradeOfferModal
        isOpen={Boolean(gameLoop.incomingAiTradeOffer)}
        offer={gameLoop.incomingAiTradeOffer}
        onClose={() => gameLoop.setIncomingAiTradeOffer(null)}
        players={players}
        properties={properties}
        turnCount={gameState.turnCount || 1}
        rentConcessions={gameState.rentConcessions || []}
        onAccept={(offer) => {
          gameLoop.handleExecuteTradeProposal(
            offer.senderId,
            offer.receiverId,
            offer.senderCash,
            offer.receiverCash,
            offer.senderProperties,
            offer.receiverProperties,
            [...(gameState.rentConcessions || []), ...(offer.rentConcessions || [])]
          );
        }}
        onCounter={(offer) => {
          gameLoop.setActiveTradeOfferForModal(offer);
          gameLoop.setTradeTargetPlayerId(offer.senderId);
          gameLoop.setIncomingAiTradeOffer(null);
          gameLoop.setTradeModalOpen(true);
        }}
        onReject={(offer) => {
          const sender = players.find((p) => p.id === offer.senderId);
          addLog(`❌ You declined ${sender?.name || 'AI'}'s trade proposal.`, 'warning', 0);
          gameLoop.setIncomingAiTradeOffer(null);
        }}
      />

      {/* Game Over / Victory Evaluation & Net Worth Modal */}
      <EndgameModal
        isOpen={gameState.gamePhase === 'ENDGAME_EVAL'}
        winner={players.find((p) => p.id === gameState.winnerId)}
        players={players}
        properties={properties}
        turnCount={gameState.turnCount || 1}
        endReason={gameLoop.endgameReason}
        onNewGame={() => handleStartNewGame(rules, settings)}
        onReturnToMainMenu={handleResetToMainMenu}
      />

      {/* Great Monopoly Spree Phase 1 Event Award Modal */}
      <SpreePhase1Modal
        isOpen={gameLoop.spreePhase1ModalOpen}
        onClose={() => gameLoop.setSpreePhase1ModalOpen(false)}
        awards={gameLoop.spreePhase1Awards}
      />

      {/* Chairman's Full Game Main Menu & Cutthroat Tycoon DLCs Modal */}
      <GameMainMenuModal
        isOpen={isMainMenuOpen}
        onClose={() => setIsMainMenuOpen(false)}
        onResetToMainMenu={handleResetToMainMenu}
        onNewGame={handleResetToMainMenu}
        onStartGame={() => {
          setHasGameStarted(true);
          handleStartNewGame(rules, settings);
        }}
        onResumeGame={() => setIsMainMenuOpen(false)}
        rules={rules}
        onUpdateRules={(newRules) => setRules(newRules)}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          soundFx.setMuted(!newSettings.soundEnabled);
          soundFx.setVolume(newSettings.soundVolume);
        }}
        isInitialStartScreen={!hasGameStarted}
        isGameActive={hasGameStarted && (gameState.gamePhase === 'IN_GAME' || gameState.gamePhase === 'DRAFT')}
        activePlayer={activePlayer}
        turnCount={gameState.turnCount || 1}
        selectedTokenShape={selectedTokenShape}
        onSelectTokenShape={onSelectTokenShape}
        players={players}
        onOpenDevTools={() => setDevToolsOpen(true)}
      />

      {/* Developer / Testing Tools Modal */}
      <DevToolsModal
        isOpen={devToolsOpen}
        onClose={() => setDevToolsOpen(false)}
        players={players}
        activePlayerId={gameState.activeTurnPlayerId}
        properties={properties}
        boardSpaces={boardSpaces}
        onTeleportPlayer={(spaceIdx) => {
          setEngineState((prev: any) => ({
            ...prev,
            players: prev.players.map((p: Player) =>
              p.id === prev.gameState.activeTurnPlayerId ? { ...p, position: spaceIdx } : p
            ),
          }));
          addLog(`🛸 Dev Teleported player to space #${spaceIdx}.`, 'rule', gameState.activeTurnPlayerId);
        }}
        onAcquireProperty={(propId, targetPlayerId) => {
          setEngineState((prev: any) => ({
            ...prev,
            properties: prev.properties.map((p: Property) =>
              p.id === propId ? { ...p, ownerId: targetPlayerId } : p
            ),
          }));
          addLog(`🛠️ Dev assigned property ${propId} to Player #${targetPlayerId}.`, 'rule');
        }}
        onAcquireColorSet={(colorGroup, targetPlayerId) => {
          setEngineState((prev: any) => ({
            ...prev,
            properties: prev.properties.map((p: Property) =>
              p.colorGroup === colorGroup ? { ...p, ownerId: targetPlayerId } : p
            ),
          }));
          addLog(`👑 Dev assigned color set ${colorGroup} to Player #${targetPlayerId}.`, 'rule');
        }}
        onAcquireAllProperties={(targetPlayerId) => {
          setEngineState((prev: any) => ({
            ...prev,
            properties: prev.properties.map((p: Property) => ({ ...p, ownerId: targetPlayerId })),
          }));
          addLog(`👑 Dev assigned ALL properties to Player #${targetPlayerId}.`, 'rule');
        }}
        onUpdatePlayerCash={(playerId, amountDelta) => {
          setEngineState((prev: any) => ({
            ...prev,
            players: prev.players.map((p: Player) =>
              p.id === playerId ? { ...p, cash: Math.max(0, p.cash + amountDelta) } : p
            ),
          }));
          addLog(`💰 Dev adjusted cash for Player #${playerId} by $${amountDelta}.`, 'rule');
        }}
        onSetPlayerCash={(playerId, exactAmount) => {
          setEngineState((prev: any) => ({
            ...prev,
            players: prev.players.map((p: Player) =>
              p.id === playerId ? { ...p, cash: Math.max(0, exactAmount) } : p
            ),
          }));
          addLog(`💰 Dev set cash for Player #${playerId} to $${exactAmount}.`, 'rule');
        }}
        onSetPropertyBuildings={(propId, houses, hotel) => {
          setEngineState((prev: any) => ({
            ...prev,
            properties: prev.properties.map((p: Property) =>
              p.id === propId ? { ...p, houses, hotel } : p
            ),
          }));
          addLog(`🏠 Dev set buildings for property ${propId}: ${houses} houses, hotel: ${hotel}.`, 'rule');
        }}
        onToggleMortgage={(propId) => {
          setEngineState((prev: any) => ({
            ...prev,
            properties: prev.properties.map((p: Property) =>
              p.id === propId ? { ...p, isMortgaged: !p.isMortgaged } : p
            ),
          }));
          addLog(`🏦 Dev toggled mortgage for property ${propId}.`, 'rule');
        }}
        onTransferProperty={(propId, newOwnerId) => {
          setEngineState((prev: any) => ({
            ...prev,
            properties: prev.properties.map((p: Property) =>
              p.id === propId ? { ...p, ownerId: newOwnerId } : p
            ),
          }));
          addLog(`🔀 Dev transferred property ${propId} to owner #${newOwnerId}.`, 'rule');
        }}
        onAddWildcard={(wildcardId, targetPlayerId) => {
          const card = ALL_WILDCARDS.find((w) => w.id === wildcardId);
          if (!card) return;
          setEngineState((prev: any) => ({
            ...prev,
            players: prev.players.map((p: Player) =>
              p.id === targetPlayerId ? { ...p, wildcardsHand: [...p.wildcardsHand, card] } : p
            ),
          }));
          addLog(`🃏 Dev added wildcard ${card.name} to Player #${targetPlayerId}.`, 'rule');
        }}
        onTriggerChanceCard={(card) => {
          cardActions.setActiveChanceCard(card);
          addLog(`🎲 Dev triggered Chance card: ${card.title}.`, 'rule');
        }}
        onTriggerCommunityChestCard={(card) => {
          cardActions.setActiveCommunityChestCard(card);
          addLog(`🎁 Dev triggered Community Chest card: ${card.title}.`, 'rule');
        }}
        onSkipStraightToMyTurn={() => {
          setEngineState((prev: any) => {
            let nextId = prev.gameState.activeTurnPlayerId;
            let safety = 0;
            while (safety < 10) {
              nextId = (nextId + 1) % prev.players.length;
              if (prev.players[nextId].id === 0 || !prev.players[nextId].isBankrupt) {
                break;
              }
              safety++;
            }
            return {
              ...prev,
              gameState: {
                ...prev.gameState,
                activeTurnPlayerId: 0,
                turnPhase: 'PRE_ROLL',
                lastDiceRoll: null,
                isSnakeEyes: false,
                consecutiveDoubles: 0,
                turnCount: (prev.gameState.turnCount || 1) + 1,
              },
            };
          });
          addLog(`⚡ Dev skipped all AI turns straight back to Player 1!`, 'success', 0);
          soundFx.playFanfare();
        }}
        onToggleJailStatus={(playerId) => {
          setEngineState((prev: any) => ({
            ...prev,
            players: prev.players.map((p: Player) =>
              p.id === playerId ? { ...p, inJail: !p.inJail, jailTurns: 0 } : p
            ),
          }));
          addLog(`⛓️ Dev toggled jail status for Player #${playerId}.`, 'rule');
        }}
        isTimerDisabled={isTimerDisabled}
        onToggleTimerDisabled={() => setIsTimerDisabled((prev) => !prev)}
        onBankruptPlayer={gameLoop.handleDeclareBankruptcy}
        onSetSpreeTimer={(seconds, phase) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('monopoly:set-spree-timer', {
                detail: { seconds, phase },
              })
            );
          }
        }}
      />
    </>
  );
}
