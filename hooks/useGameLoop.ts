import { useState, useEffect, useCallback } from 'react';
import {
  GameState,
  Player,
  Property,
  BoardSpace,
  GameEventLog,
  TradeOffer,
  RentConcession,
  ColorGroup,
  GameRulesOptions,
} from '@/types/monopoly';
import { soundFx } from '@/lib/sound';
import { checkMonopoly } from '@/lib/gameEngine';
import { generateProactiveTradeOffers, evaluateTradeProposal } from '@/lib/tradeEngine';
import { ChanceCard } from '@/lib/chanceCards';
import { CommunityChestCard } from '@/lib/communityChestCards';
import { SpreeAwardItem } from '@/components/SpreePhase1Modal';

interface EngineStateLike {
  gameState: GameState;
  players: Player[];
  properties: Property[];
  boardSpaces: BoardSpace[];
  logs: GameEventLog[];
  draftPool: Property[];
}

interface UseGameLoopProps<T extends EngineStateLike> {
  engineState: T;
  setEngineState: React.Dispatch<React.SetStateAction<T>>;
  activePlayer: Player;
  rules: GameRulesOptions;
  activeChanceCard: ChanceCard | null;
  activeCommunityChestCard: CommunityChestCard | null;
  addLog: (message: string, type?: GameEventLog['type'], playerId?: number) => void;
  handleBuyProperty: (propertyId: string, withDiscount?: boolean) => void;
  handleRollDice: () => void;
  handleEndTurn: () => void;
}

export function useGameLoop<T extends EngineStateLike>({
  engineState,
  setEngineState,
  activePlayer,
  rules,
  activeChanceCard,
  activeCommunityChestCard,
  addLog,
  handleBuyProperty,
  handleRollDice,
  handleEndTurn,
}: UseGameLoopProps<T>) {
  const { gameState, players, properties, boardSpaces } = engineState;

  // Bot speed & board animation gating
  const [botSpeed, setBotSpeed] = useState<1 | 3>(1); // 1x or 3x speed multiplier
  const [isBoardAnimating, setIsBoardAnimating] = useState(false);

  // Trading state
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeTargetPlayerId, setTradeTargetPlayerId] = useState<number>(1);
  const [activeTradeOfferForModal, setActiveTradeOfferForModal] = useState<TradeOffer | null>(null);
  const [incomingAiTradeOffer, setIncomingAiTradeOffer] = useState<TradeOffer | null>(null);

  // Spree & Endgame state
  const [spreePhase1ModalOpen, setSpreePhase1ModalOpen] = useState(false);
  const [spreePhase1Awards, setSpreePhase1Awards] = useState<SpreeAwardItem[]>([]);
  const [endgameReason, setEndgameReason] = useState<
    'SOLE_SURVIVOR' | 'MONOPOLY_SPREE_TIMEOUT' | 'BANKRUPTCY'
  >('SOLE_SURVIVOR');

  const toggleBotSpeed = useCallback(() => {
    setBotSpeed((prev) => (prev === 1 ? 3 : 1));
  }, []);

  // --- DECLARE BANKRUPTCY HANDLER ---
  const handleDeclareBankruptcy = useCallback((playerId: number) => {
    soundFx.playJail();
    setEngineState((prev) => {
      const updatedPlayers = prev.players.map((p) =>
        p.id === playerId ? { ...p, isBankrupt: true, cash: 0, consecutiveDoubles: 0 } : p
      );

      const updatedProperties = prev.properties.map((p) =>
        p.ownerId === playerId ? { ...p, ownerId: null, isMortgaged: false, houses: 0, hotel: false } : p
      );

      const activeSurvivors = updatedPlayers.filter((p) => !p.isBankrupt);
      let nextGS = { ...prev.gameState };

      if (activeSurvivors.length <= 1) {
        soundFx.playFanfare();
        setEndgameReason('SOLE_SURVIVOR');
        nextGS.gamePhase = 'ENDGAME_EVAL';
        nextGS.winnerId = activeSurvivors[0]?.id ?? 0;
      } else {
        let nextId = (prev.gameState.activeTurnPlayerId + 1) % prev.players.length;
        let attempts = 0;
        while (updatedPlayers[nextId].isBankrupt && attempts < updatedPlayers.length) {
          nextId = (nextId + 1) % updatedPlayers.length;
          attempts++;
        }
        nextGS.activeTurnPlayerId = nextId;
        nextGS.turnPhase = 'PRE_ROLL';
        nextGS.lastDiceRoll = null;
        nextGS.isSnakeEyes = false;
        nextGS.consecutiveDoubles = 0;
        nextGS.turnCount = (prev.gameState.turnCount || 1) + 1;
      }

      const bankruptedPlayer = prev.players.find((p) => p.id === playerId);

      return {
        ...prev,
        players: updatedPlayers,
        properties: updatedProperties,
        gameState: nextGS,
        logs: [
          ...prev.logs,
          {
            id: `log_bankrupt_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            message: `💀 ${bankruptedPlayer?.name || 'Player'} declared bankruptcy and accepted defeat!`,
            type: 'danger',
            playerId,
          },
        ],
      };
    });
  }, [setEngineState]);

  // --- INITIATE TRADE ACTION ---
  const handleInitiateTrade = useCallback(
    (targetPlayerId?: number) => {
      if (rules.jailFrozenAssets && activePlayer.inJail) {
        addLog(`🔒 Assets Frozen! Incarcerated players cannot initiate trades while in Jail.`, 'warning', activePlayer.id);
        return;
      }
      if (typeof targetPlayerId === 'number') {
        const target = players.find((p) => p.id === targetPlayerId);
        if (rules.jailFrozenAssets && target?.inJail) {
          addLog(`🔒 ${target.name}'s assets are frozen in Jail! Cannot conduct trades with incarcerated players.`, 'warning', activePlayer.id);
          return;
        }
        setTradeTargetPlayerId(targetPlayerId);
      }
      setActiveTradeOfferForModal(null);
      setTradeModalOpen(true);
    },
    [rules.jailFrozenAssets, activePlayer, players, addLog]
  );

  // --- EXECUTE TRADE PROPOSAL ---
  const handleExecuteTradeProposal = useCallback(
    (
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
    ) => {
      const sender = players.find((p) => p.id === senderId);
      const receiver = players.find((p) => p.id === receiverId);
      if (!sender || !receiver) return;

      const sWildcards = senderWildcards || [];
      const rWildcards = receiverWildcards || [];

      soundFx.playCash();
      setEngineState((prev) => {
        const senderPlayer = prev.players.find((p) => p.id === senderId);
        const receiverPlayer = prev.players.find((p) => p.id === receiverId);

        const senderGivenCards = senderPlayer?.wildcardsHand.filter((c) => sWildcards.includes(c.id)) || [];
        const receiverGivenCards = receiverPlayer?.wildcardsHand.filter((c) => rWildcards.includes(c.id)) || [];

        const updatedPlayers = prev.players.map((p) => {
          if (p.id === senderId) {
            let nextHand = p.wildcardsHand.filter((c) => !sWildcards.includes(c.id));
            nextHand = [...nextHand, ...receiverGivenCards];
            let nextJail = p.hasGetOutOfJailFreeCard;
            if (senderJailCard) nextJail = false;
            if (receiverJailCard) nextJail = true;
            return {
              ...p,
              cash: Math.max(0, p.cash - senderCash + receiverCash),
              wildcardsHand: nextHand,
              hasGetOutOfJailFreeCard: nextJail,
            };
          }
          if (p.id === receiverId) {
            let nextHand = p.wildcardsHand.filter((c) => !rWildcards.includes(c.id));
            nextHand = [...nextHand, ...senderGivenCards];
            let nextJail = p.hasGetOutOfJailFreeCard;
            if (receiverJailCard) nextJail = false;
            if (senderJailCard) nextJail = true;
            return {
              ...p,
              cash: Math.max(0, p.cash + senderCash - receiverCash),
              wildcardsHand: nextHand,
              hasGetOutOfJailFreeCard: nextJail,
            };
          }
          return p;
        });

        const updatedProps = prev.properties.map((p) => {
          if (senderProperties.includes(p.id)) return { ...p, ownerId: receiverId };
          if (receiverProperties.includes(p.id)) return { ...p, ownerId: senderId };
          return p;
        });

        return {
          ...prev,
          players: updatedPlayers,
          properties: updatedProps,
          gameState: {
            ...prev.gameState,
            rentConcessions: newConcessions,
          },
        };
      });

      const senderPropsNames = properties
        .filter((p) => senderProperties.includes(p.id))
        .map((p) => p.name)
        .join(', ');
      const receiverPropsNames = properties
        .filter((p) => receiverProperties.includes(p.id))
        .map((p) => p.name)
        .join(', ');

      addLog(
        `🤝 TRADE COMPLETED: ${sender.name} [${senderPropsNames ? senderPropsNames + ' + ' : ''}$${senderCash}] ⇄ ${receiver.name} [${receiverPropsNames ? receiverPropsNames + ' + ' : ''}$${receiverCash}]!`,
        'success',
        senderId
      );

      const colorGroups: ColorGroup[] = ['Brown', 'LightBlue', 'Pink', 'Orange', 'Red', 'Yellow', 'Green', 'DarkBlue'];
      colorGroups.forEach((group) => {
        const senderNowHas = checkMonopoly(senderId, group, properties);
        const receiverNowHas = checkMonopoly(receiverId, group, properties);
        if (senderNowHas && !checkMonopoly(senderId, group, engineState.properties)) {
          addLog(`👑 MONOPOLY ACHIEVED! ${sender.name} completed the ${group} set via strategic trade!`, 'success', senderId);
        }
        if (receiverNowHas && !checkMonopoly(receiverId, group, engineState.properties)) {
          addLog(`👑 MONOPOLY ACHIEVED! ${receiver.name} completed the ${group} set via strategic trade!`, 'success', receiverId);
        }
      });

      setTradeModalOpen(false);
      setActiveTradeOfferForModal(null);
      setIncomingAiTradeOffer(null);
    },
    [players, properties, engineState.properties, addLog, setEngineState]
  );

  // --- SPREE PHASE 1 EVENT ---
  const handleSpreePhase1Event = useCallback(() => {
    soundFx.playFanfare();
    const awards: SpreeAwardItem[] = [];

    setEngineState((prev) => {
      let updatedProperties = [...prev.properties];
      const newLogs = [...prev.logs];
      const COLOR_GROUPS: ColorGroup[] = [
        'Brown',
        'LightBlue',
        'Pink',
        'Orange',
        'Red',
        'Yellow',
        'Green',
        'DarkBlue',
      ];

      prev.players.forEach((player) => {
        if (player.isBankrupt) return;
        const autoCompletedSets: string[] = [];
        const freePropertiesGranted: string[] = [];
        let housesGrantedCount = 0;

        COLOR_GROUPS.forEach((cg) => {
          const groupProps = updatedProperties.filter((p) => p.colorGroup === cg);
          const ownedProps = groupProps.filter((p) => p.ownerId === player.id);
          const threshold = groupProps.length === 2 ? 1 : 2;

          if (ownedProps.length >= threshold && ownedProps.length < groupProps.length) {
            const unownedProps = groupProps.filter((p) => p.ownerId === null);
            if (unownedProps.length > 0) {
              unownedProps.forEach((unowned) => {
                updatedProperties = updatedProperties.map((p) =>
                  p.id === unowned.id ? { ...p, ownerId: player.id } : p
                );
                freePropertiesGranted.push(unowned.name);
              });
            }
          }

          const finalOwned = updatedProperties.filter(
            (p) => p.colorGroup === cg && p.ownerId === player.id
          );
          if (finalOwned.length === groupProps.length && groupProps.length > 0) {
            autoCompletedSets.push(cg);
            updatedProperties = updatedProperties.map((p) => {
              if (p.colorGroup === cg && p.ownerId === player.id) {
                if (p.hotel) {
                  return p;
                } else if (p.houses >= 4) {
                  housesGrantedCount += 1;
                  return { ...p, hotel: true, houses: 4 };
                } else {
                  housesGrantedCount += 1;
                  return { ...p, houses: p.houses + 1 };
                }
              }
              return p;
            });
          }
        });

        if (freePropertiesGranted.length > 0 || autoCompletedSets.length > 0 || housesGrantedCount > 0) {
          awards.push({
            playerName: player.name,
            playerColor: player.avatarColor || player.color,
            autoCompletedSets,
            freePropertiesGranted,
            housesGrantedCount,
          });
          newLogs.push({
            id: `log_spree_${Date.now()}_${player.id}`,
            timestamp: new Date().toLocaleTimeString(),
            message: `⚡ SPREE 90M BONUS: ${player.name} received ${freePropertiesGranted.length} deeds and +${housesGrantedCount} free houses!`,
            type: 'card',
            playerId: player.id,
          });
        }
      });

      return {
        ...prev,
        properties: updatedProperties,
        logs: newLogs,
      };
    });

    setSpreePhase1Awards(awards);
    setSpreePhase1ModalOpen(true);
    addLog(
      '⏰ Great Monopoly Spree Phase 1 complete! Final 30-minute Sudden Death timer activated!',
      'warning'
    );
  }, [addLog, setEngineState]);

  // --- SPREE ENDGAME LIQUIDATION ---
  const handleSpreeEndgameLiquidation = useCallback(() => {
    soundFx.playFanfare();
    setEngineState((prev) => {
      let highestNetWorth = -1;
      let winnerPlayerId = 0;

      prev.players.forEach((p) => {
        if (p.isBankrupt) return;
        const ownedProps = prev.properties.filter((prop) => prop.ownerId === p.id);
        const unmortgagedVal = ownedProps
          .filter((prop) => !prop.isMortgaged)
          .reduce((sum, prop) => sum + prop.basePrice, 0);
        const mortgagedVal = ownedProps
          .filter((prop) => prop.isMortgaged)
          .reduce((sum, prop) => sum + Math.floor(prop.basePrice / 2), 0);

        let buildingsVal = 0;
        ownedProps.forEach((prop) => {
          if (prop.hotel) {
            buildingsVal += 5 * (prop.houseCost || 50);
          } else {
            buildingsVal += (prop.houses || 0) * (prop.houseCost || 50);
          }
        });

        const netWorth = Math.max(0, p.cash) + unmortgagedVal + mortgagedVal + buildingsVal;
        if (netWorth > highestNetWorth) {
          highestNetWorth = netWorth;
          winnerPlayerId = p.id;
        }
      });

      const winnerPlayer = prev.players.find((p) => p.id === winnerPlayerId) || prev.players[0];

      return {
        ...prev,
        gameState: {
          ...prev.gameState,
          gamePhase: 'ENDGAME_EVAL',
          winnerId: winnerPlayerId,
        },
        logs: [
          ...prev.logs,
          {
            id: `log_spree_win_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            message: `👑 120M SPREE LIQUIDATION: ${winnerPlayer.name} wins with highest net worth ($${highestNetWorth.toLocaleString()})!`,
            type: 'success',
            playerId: winnerPlayerId,
          },
        ],
      };
    });

    setEndgameReason('MONOPOLY_SPREE_TIMEOUT');
  }, [setEngineState]);

  // Check for Sole Survivor Victory Condition
  useEffect(() => {
    if (gameState.gamePhase === 'IN_GAME' && players.length > 1) {
      const activeSurvivors = players.filter((p) => !p.isBankrupt);
      if (activeSurvivors.length === 1) {
        const winner = activeSurvivors[0];
        const timer = setTimeout(() => {
          soundFx.playFanfare();
          setEndgameReason('SOLE_SURVIVOR');
          setEngineState((prev) => {
            if (prev.gameState.gamePhase === 'ENDGAME_EVAL') return prev;
            return {
              ...prev,
              gameState: {
                ...prev.gameState,
                gamePhase: 'ENDGAME_EVAL',
                winnerId: winner.id,
              },
              logs: [
                ...prev.logs,
                {
                  id: `log_sole_survivor_${Date.now()}`,
                  timestamp: new Date().toLocaleTimeString(),
                  message: `🏆 SOLE SURVIVOR: All rivals have succumbed to insolvency! ${winner.name} wins the match!`,
                  type: 'success',
                  playerId: winner.id,
                },
              ],
            };
          });
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [players, gameState.gamePhase, setEngineState]);

  // Automatic transition from RESOLVING_SPACE after movement/modal finishes
  useEffect(() => {
    if (
      gameState.gamePhase === 'IN_GAME' &&
      gameState.turnPhase === 'RESOLVING_SPACE' &&
      !isBoardAnimating &&
      !activeChanceCard &&
      !activeCommunityChestCard
    ) {
      const currentSpace = boardSpaces[activePlayer.position];
      const isUnownedProperty =
        currentSpace?.type === 'PROPERTY' &&
        currentSpace.propertyId &&
        properties.find((p) => p.id === currentSpace.propertyId)?.ownerId === null;

      if (isUnownedProperty && !activePlayer.isAi) {
        // Human player: Await direct decision on 3D card (BUY / PASS buttons)
        return;
      }

      // Bot player landed on unowned property: execute purchase only AFTER physically landing on the tile
      if (activePlayer.isAi && isUnownedProperty && currentSpace?.propertyId) {
        const propToBuy = properties.find((p) => p.id === currentSpace.propertyId);
        if (propToBuy && activePlayer.cash >= propToBuy.basePrice) {
          const timer = setTimeout(() => {
            handleBuyProperty(propToBuy.id);
          }, 350 / botSpeed);
          return () => clearTimeout(timer);
        }
      }

      const lastRoll = gameState.lastDiceRoll;
      const isDoubles = lastRoll && lastRoll[0] === lastRoll[1];
      const isInJail = activePlayer.inJail;
      const consecutiveDoubles = gameState.consecutiveDoubles || activePlayer.consecutiveDoubles || 0;

      if (isDoubles && !isInJail && consecutiveDoubles > 0 && consecutiveDoubles < 3) {
        const timer = setTimeout(() => {
          setEngineState((prev) => ({
            ...prev,
            gameState: {
              ...prev.gameState,
              turnPhase: 'PRE_ROLL',
            },
          }));
        }, 500);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          setEngineState((prev) => ({
            ...prev,
            gameState: {
              ...prev.gameState,
              turnPhase: 'POST_ROLL',
            },
          }));
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [
    gameState.gamePhase,
    gameState.turnPhase,
    gameState.lastDiceRoll,
    gameState.consecutiveDoubles,
    isBoardAnimating,
    activeChanceCard,
    activeCommunityChestCard,
    boardSpaces,
    properties,
    activePlayer.position,
    activePlayer.isAi,
    activePlayer.cash,
    activePlayer.inJail,
    activePlayer.consecutiveDoubles,
    handleBuyProperty,
    botSpeed,
    setEngineState,
  ]);

  // --- AI BOT AUTOMATED TURNS & DEBT CRISIS ---
  useEffect(() => {
    if (gameState.gamePhase === 'IN_GAME' && activePlayer.isAi && !activePlayer.isBankrupt) {
      if (activePlayer.cash <= 0) {
        const timer = setTimeout(() => {
          const unmortgaged = properties.filter((p) => p.ownerId === activePlayer.id && !p.isMortgaged);
          if (unmortgaged.length > 0) {
            const targetProp = unmortgaged[0];
            soundFx.playCash();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === activePlayer.id ? { ...p, cash: p.cash + targetProp.basePrice / 2 } : p
              ),
              properties: prev.properties.map((p) => (p.id === targetProp.id ? { ...p, isMortgaged: true } : p)),
            }));
            addLog(`🏦 AI ${activePlayer.name} mortgaged ${targetProp.name} for +$${targetProp.basePrice / 2}.`, 'warning', activePlayer.id);
          } else {
            handleDeclareBankruptcy(activePlayer.id);
          }
        }, 800 / botSpeed);
        return () => clearTimeout(timer);
      }

      if (gameState.turnPhase === 'PRE_ROLL' && !isBoardAnimating) {
        const delay = 650 / botSpeed;
        const timer = setTimeout(() => {
          handleRollDice();
        }, delay);
        return () => clearTimeout(timer);
      } else if (
        gameState.turnPhase === 'POST_ROLL' &&
        !isBoardAnimating &&
        !activeChanceCard &&
        !activeCommunityChestCard
      ) {
        const delay = 650 / botSpeed;
        const timer = setTimeout(() => {
          if (!incomingAiTradeOffer && Math.random() < 0.35) {
            const offers = generateProactiveTradeOffers(activePlayer, players, properties, gameState.turnCount || 1);
            if (offers.length > 0) {
              const chosenOffer = offers[0];
              const receiver = players.find((p) => p.id === chosenOffer.receiverId);
              if (receiver && !receiver.isAi) {
                setIncomingAiTradeOffer(chosenOffer);
                addLog(`📢 ${activePlayer.name} has proposed a strategic trade to you!`, 'info', activePlayer.id);
                return;
              } else if (receiver && receiver.isAi) {
                const evalRes = evaluateTradeProposal(chosenOffer, players, properties, gameState.turnCount || 1);
                if (evalRes.verdict === 'ACCEPT') {
                  handleExecuteTradeProposal(
                    chosenOffer.senderId,
                    chosenOffer.receiverId,
                    chosenOffer.senderCash,
                    chosenOffer.receiverCash,
                    chosenOffer.senderProperties,
                    chosenOffer.receiverProperties,
                    [...(gameState.rentConcessions || []), ...(chosenOffer.rentConcessions || [])]
                  );
                  return;
                }
              }
            }
          }

          handleEndTurn();
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [
    gameState.gamePhase,
    gameState.turnPhase,
    gameState.turnCount,
    gameState.rentConcessions,
    activePlayer,
    players,
    properties,
    handleRollDice,
    handleEndTurn,
    handleDeclareBankruptcy,
    handleExecuteTradeProposal,
    incomingAiTradeOffer,
    botSpeed,
    isBoardAnimating,
    activeChanceCard,
    activeCommunityChestCard,
    addLog,
    setEngineState,
  ]);

  return {
    isBoardAnimating,
    setIsBoardAnimating,
    botSpeed,
    setBotSpeed,
    toggleBotSpeed,
    tradeModalOpen,
    setTradeModalOpen,
    tradeTargetPlayerId,
    setTradeTargetPlayerId,
    activeTradeOfferForModal,
    setActiveTradeOfferForModal,
    incomingAiTradeOffer,
    setIncomingAiTradeOffer,
    spreePhase1ModalOpen,
    setSpreePhase1ModalOpen,
    spreePhase1Awards,
    setSpreePhase1Awards,
    endgameReason,
    setEndgameReason,
    handleDeclareBankruptcy,
    handleInitiateTrade,
    handleExecuteTradeProposal,
    handleSpreePhase1Event,
    handleSpreeEndgameLiquidation,
  };
}
