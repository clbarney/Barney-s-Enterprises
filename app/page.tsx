'use client';

import React, { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  GameRulesOptions,
  GameSettingsOptions,
  DEFAULT_RULES,
  DEFAULT_SETTINGS,
  TokenShape,
  Wildcard,
  GameEventLog,
} from '@/types/monopoly';
import { createInitialEngine } from '@/lib/gameEngine';
import { soundFx } from '@/lib/sound';
import { SpreeTimerHUD } from '@/components/SpreeTimerHUD';
import { GameModalsContainer } from '@/components/GameModalsContainer';
import { useBatterySaver } from '@/hooks/useBatterySaver';
import { useTurnPipeline } from '@/hooks/useTurnPipeline';
import { useCardActions } from '@/hooks/useCardActions';
import { usePropertyActions } from '@/hooks/usePropertyActions';
import { useGameLoop } from '@/hooks/useGameLoop';

const Board3D = dynamic(() => import('@/components/Board3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
      <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4" />
      <span className="text-sm font-medium tracking-wide">Loading 3D Board...</span>
    </div>
  ),
});

export default function MonopolyGame() {
  // Game Configuration & Navigation
  const [rules, setRules] = useState<GameRulesOptions>(DEFAULT_RULES);
  const [settings, setSettings] = useState<GameSettingsOptions>(DEFAULT_SETTINGS);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(true);
  const [selectedTokenShape, setSelectedTokenShape] = useState<TokenShape>('hat');
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [isTimerDisabled, setIsTimerDisabled] = useState(false);
  const [revealStartingWildcard, setRevealStartingWildcard] = useState<Wildcard | null>(null);

  // Core Engine State
  const [engineState, setEngineState] = useState(() =>
    createInitialEngine(
      [
        { name: 'Player 1 (You)', isAi: false },
        { name: 'Barney AI', isAi: true },
        { name: 'Cyber Bot', isAi: true },
        { name: 'Titan Bot', isAi: true },
      ],
      {
        startingCash: DEFAULT_RULES.startingCash,
        startWithDraft: DEFAULT_RULES.openingDraft,
      }
    )
  );

  // Hardware & Battery Optimization
  useBatterySaver(setSettings);

  const { gameState, players, properties, boardSpaces, logs, draftPool } = engineState;
  const activePlayer = players.find((p) => p.id === gameState.activeTurnPlayerId) || players[0];

  // Event Log Emitter
  const addLog = useCallback(
    (message: string, type: GameEventLog['type'] = 'info', playerId?: number) => {
      setEngineState((prev) => ({
        ...prev,
        logs: [
          ...prev.logs,
          {
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            message,
            type,
            playerId,
          },
        ],
      }));
    },
    []
  );

  // Token Selection Handler
  const handleSelectTokenShape = useCallback((shape: TokenShape) => {
    setSelectedTokenShape(shape);
    setEngineState((prev) => {
      if (prev.players[0]?.tokenShape === shape) return prev;
      const oldShape = prev.players[0]?.tokenShape || 'hat';
      return {
        ...prev,
        players: prev.players.map((p, idx) => {
          if (idx === 0) return { ...p, tokenShape: shape };
          if (p.tokenShape === shape) return { ...p, tokenShape: oldShape };
          return p;
        }),
      };
    });
  }, []);

  // Hook Cross-References for Decoupled Communication
  const cardActionsRef = useRef<any>(null);
  const turnPipelineRef = useRef<any>(null);

  // Hook 1: Turn Pipeline
  const turnPipeline = useTurnPipeline({
    engineState,
    setEngineState,
    rules,
    activePlayer,
    addLog,
    onDrawChance: () => cardActionsRef.current?.drawChance(),
    onDrawCommunityChest: () => cardActionsRef.current?.drawCommunityChest(),
  });
  turnPipelineRef.current = turnPipeline;

  // Hook 2: Card Actions
  const cardActions = useCardActions({
    engineState,
    setEngineState,
    activePlayer,
    addLog,
    onSecondChanceReroll: () => turnPipelineRef.current?.setRollTrigger((prev: number) => prev + 1),
    handleFreeParkingLanding: (isDoubles) => turnPipelineRef.current?.handleFreeParkingLanding(isDoubles),
  });
  cardActionsRef.current = cardActions;

  // Hook 3: Property Actions
  const propertyActions = usePropertyActions({
    engineState,
    setEngineState,
    activePlayer,
    rules,
    addLog,
    setRevealStartingWildcard,
  });

  // Hook 4: Game Loop & AI Automation
  const gameLoop = useGameLoop({
    engineState,
    setEngineState,
    activePlayer,
    rules,
    activeChanceCard: cardActions.activeChanceCard,
    activeCommunityChestCard: cardActions.activeCommunityChestCard,
    freeParkingModalOpen: turnPipeline.freeParkingModalOpen,
    railwayTransitModalOpen: turnPipeline.railwayTransitModalOpen,
    landOnGoModalOpen: turnPipeline.landOnGoModalOpen,
    addLog,
    handleBuyProperty: propertyActions.handleBuyProperty,
    handleRollDice: turnPipeline.handleRollDice,
    handleEndTurn: turnPipeline.handleEndTurn,
  });

  // Start New Game & Reset Match Handlers
  const handleStartNewGame = useCallback(
    (newRules?: GameRulesOptions, newSettings?: GameSettingsOptions) => {
      const activeRules = newRules || rules;
      if (newRules) setRules(activeRules);
      if (newSettings) {
        setSettings(newSettings);
        soundFx.setMuted(!newSettings.soundEnabled);
        soundFx.setVolume(newSettings.soundVolume);
      }

      const initialEngine = createInitialEngine(
        [
          { name: 'Player 1 (You)', isAi: false, tokenShape: selectedTokenShape },
          { name: 'Barney AI', isAi: true },
          { name: 'Cyber Bot', isAi: true },
          { name: 'Titan Bot', isAi: true },
        ],
        {
          startingCash: activeRules.startingCash,
          startWithDraft: activeRules.openingDraft,
          coreActionDeck: activeRules.coreActionDeck,
          superWildcardDrop: activeRules.superWildcardDrop,
        }
      );

      setEngineState(initialEngine);
      cardActions.resetDecks();
      gameLoop.setIncomingAiTradeOffer(null);
      gameLoop.setActiveTradeOfferForModal(null);
      gameLoop.setTradeModalOpen(false);
      setHasGameStarted(true);
      setIsMainMenuOpen(false);
      gameLoop.setSpreePhase1ModalOpen(false);
      gameLoop.setSpreePhase1Awards([]);
      gameLoop.setEndgameReason('SOLE_SURVIVOR');
      soundFx.playCash();
      addLog("👑 New game started with Chairman's Custom Expansions & House Rules!", 'success', 0);

      if (!activeRules.openingDraft && initialEngine.players[0]?.wildcardsHand?.[0]) {
        setRevealStartingWildcard(initialEngine.players[0].wildcardsHand[0]);
      }
    },
    [rules, addLog, selectedTokenShape, cardActions, gameLoop]
  );

  const handleResetToMainMenu = useCallback(() => {
    const initialEngine = createInitialEngine(
      [
        { name: 'Player 1 (You)', isAi: false, tokenShape: selectedTokenShape },
        { name: 'Barney AI', isAi: true },
        { name: 'Cyber Bot', isAi: true },
        { name: 'Titan Bot', isAi: true },
      ],
      {
        startingCash: rules.startingCash,
        startWithDraft: rules.openingDraft,
        coreActionDeck: rules.coreActionDeck,
        superWildcardDrop: rules.superWildcardDrop,
      }
    );

    setEngineState(initialEngine);
    cardActions.resetDecks();
    gameLoop.setIncomingAiTradeOffer(null);
    gameLoop.setActiveTradeOfferForModal(null);
    gameLoop.setTradeModalOpen(false);
    setHasGameStarted(false);
    setIsMainMenuOpen(true);
    gameLoop.setSpreePhase1ModalOpen(false);
    gameLoop.setSpreePhase1Awards([]);
    gameLoop.setEndgameReason('SOLE_SURVIVOR');
    soundFx.playCash();
    addLog('🔄 Match reset. Returned to Main Menu.', 'info', 0);
  }, [rules, addLog, selectedTokenShape, cardActions, gameLoop]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 relative font-sans">
      <div className="absolute top-3 left-3 z-30 pointer-events-none">
        <SpreeTimerHUD
          enabled={Boolean(rules.greatMonopolySpree && hasGameStarted && gameState.gamePhase === 'IN_GAME')}
          onPhase1Trigger={gameLoop.handleSpreePhase1Event}
          onEndgameLiquidation={gameLoop.handleSpreeEndgameLiquidation}
        />
      </div>

      <Board3D
        players={players}
        properties={properties}
        boardSpaces={boardSpaces}
        activePlayerId={gameState.activeTurnPlayerId}
        lastDiceRoll={gameState.lastDiceRoll}
        lotteryPool={gameState.lotteryPool}
        gamePhase={gameState.gamePhase}
        turnPhase={gameState.turnPhase}
        draftPool={draftPool}
        logs={logs}
        hasTaxOccurred={gameState.hasTaxOccurred}
        turnCount={gameState.turnCount || 1}
        activeChanceCard={cardActions.activeChanceCard}
        onResolveChanceCard={cardActions.handleResolveChanceCard}
        activeCommunityChestCard={cardActions.activeCommunityChestCard}
        onResolveCommunityChestCard={cardActions.handleResolveCommunityChestCard}
        botSpeed={gameLoop.botSpeed}
        onAnimationStateChange={gameLoop.setIsBoardAnimating}
        onToggleBotSpeed={gameLoop.toggleBotSpeed}
        rollTrigger={turnPipeline.rollTrigger}
        diceCount={turnPipeline.activeDiceCount}
        isTimerDisabled={isTimerDisabled}
        onRollDice={turnPipeline.handleRollDice}
        onRollComplete={turnPipeline.handleRollComplete}
        onEndTurn={turnPipeline.handleEndTurn}
        onPlayWildcard={cardActions.handlePlayCard}
        onInitiateTrade={gameLoop.handleInitiateTrade}
        onBuildHouse={propertyActions.onBuildHouse}
        onSellHouse={propertyActions.onSellHouse}
        targetSelection={cardActions.cardTargetingState}
        onSelectTargetProperty={(propId) => {
          if (!cardActions.cardTargetingState) return;
          cardActions.handlePlayCard(cardActions.cardTargetingState.rawCardId, { targetPropertyId: propId });
        }}
        onSelectTargetPlayer={(playerId) => {
          if (!cardActions.cardTargetingState) return;
          cardActions.handlePlayCard(cardActions.cardTargetingState.rawCardId, { targetPlayerId: playerId });
        }}
        onCancelTargeting={() => cardActions.setCardTargetingState(null)}
        onMortgageProperty={propertyActions.onMortgageProperty}
        onUnmortgageProperty={propertyActions.onUnmortgageProperty}
        onDeclareBankruptcy={gameLoop.handleDeclareBankruptcy}
        onBuyProperty={propertyActions.handleBuyProperty}
        onPassProperty={propertyActions.handlePassProperty}
        onChallenge={cardActions.handleInitiateChallenge}
        onDraftProperty={propertyActions.handleDraftProperty}
        onPayJailFee={turnPipeline.handlePayJailFee}
        onGoOption={(idx) => {
          if (idx === 1) {
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + 200 } : p)),
            }));
            addLog(`✨ Selected $200 Double Cash bonus!`, 'success', activePlayer.id);
          }
        }}
        onRailTransit={(targetIdx, cost) => {
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id ? { ...p, position: targetIdx, cash: Math.max(0, p.cash - cost) } : p
            ),
          }));
          addLog(`🚂 Railway transit to space ${targetIdx} for $${cost}.`, 'info', activePlayer.id);
        }}
        onOpenMenu={() => setIsMainMenuOpen(true)}
        settings={settings}
        rules={rules}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          soundFx.setMuted(!newSettings.soundEnabled);
          soundFx.setVolume(newSettings.soundVolume);
        }}
        bankerLapCounter={gameState.bankerLapCounter || 0}
        isLandOnGoActive={turnPipeline.landOnGoModalOpen}
        onTakeDoubleCash={turnPipeline.handleTakeDoubleCash}
        onWarpToSpace={(spaceIdx, spaceName) =>
          turnPipeline.handleWarpToSpace(spaceIdx, spaceName || boardSpaces[spaceIdx]?.name || `Space #${spaceIdx}`)
        }
        onOpenTaxBreakdown={() => turnPipeline.setIsTaxBreakdownOpen(true)}
        isAnyModalOpen={Boolean(
          isMainMenuOpen ||
            gameLoop.tradeModalOpen ||
            devToolsOpen ||
            turnPipeline.railwayTransitModalOpen ||
            turnPipeline.landOnGoModalOpen ||
            turnPipeline.isTaxBreakdownOpen ||
            turnPipeline.freeParkingModalOpen ||
            gameLoop.spreePhase1ModalOpen ||
            cardActions.activeChanceCard ||
            cardActions.activeCommunityChestCard ||
            revealStartingWildcard ||
            gameLoop.incomingAiTradeOffer ||
            cardActions.cardTargetingState ||
            gameState.winnerId !== null ||
            gameState.gamePhase === 'ENDGAME_EVAL'
        )}
      />

      <GameModalsContainer
        engineState={engineState}
        setEngineState={setEngineState}
        activePlayer={activePlayer}
        rules={rules}
        setRules={setRules}
        settings={settings}
        setSettings={setSettings}
        hasGameStarted={hasGameStarted}
        setHasGameStarted={setHasGameStarted}
        addLog={addLog}
        isMainMenuOpen={isMainMenuOpen}
        setIsMainMenuOpen={setIsMainMenuOpen}
        devToolsOpen={devToolsOpen}
        setDevToolsOpen={setDevToolsOpen}
        selectedTokenShape={selectedTokenShape}
        onSelectTokenShape={handleSelectTokenShape}
        isTimerDisabled={isTimerDisabled}
        setIsTimerDisabled={setIsTimerDisabled}
        revealStartingWildcard={revealStartingWildcard}
        setRevealStartingWildcard={setRevealStartingWildcard}
        turnPipeline={turnPipeline}
        cardActions={cardActions}
        gameLoop={gameLoop}
        handleStartNewGame={handleStartNewGame}
        handleResetToMainMenu={handleResetToMainMenu}
      />
    </main>
  );
}
