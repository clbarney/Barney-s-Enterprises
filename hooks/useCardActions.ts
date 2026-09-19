import { useState, useCallback } from 'react';
import {
  Player,
  Property,
  BoardSpace,
  GameEventLog,
  CardTargetingState,
} from '@/types/monopoly';
import { calculateRent } from '@/lib/gameEngine';
import { soundFx } from '@/lib/sound';
import { ChanceCard, createChanceDeck, drawChanceCard } from '@/lib/chanceCards';
import { CommunityChestCard, createCommunityChestDeck, drawCommunityChestCard } from '@/lib/communityChestCards';
import { normalizeWildcardId } from '@/lib/wildcards';

type ChanceDeck = ReturnType<typeof createChanceDeck>;
type CommunityChestDeck = ReturnType<typeof createCommunityChestDeck>;

interface EngineStateLike {
  gameState: any;
  players: Player[];
  properties: Property[];
  boardSpaces: BoardSpace[];
  logs: GameEventLog[];
}

interface UseCardActionsProps<T extends EngineStateLike> {
  engineState: T;
  setEngineState: React.Dispatch<React.SetStateAction<T>>;
  activePlayer: Player;
  addLog: (message: string, type?: GameEventLog['type'], playerId?: number) => void;
  onSecondChanceReroll?: () => void;
  handleFreeParkingLanding: (isDoubles: boolean) => void;
}

export function useCardActions<T extends EngineStateLike>({
  engineState,
  setEngineState,
  activePlayer,
  addLog,
  onSecondChanceReroll,
  handleFreeParkingLanding,
}: UseCardActionsProps<T>) {
  const { gameState, players, properties, boardSpaces } = engineState;

  // Deck & Card state
  const [chanceDeck, setChanceDeck] = useState<ChanceDeck>(() => createChanceDeck());
  const [activeChanceCard, setActiveChanceCard] = useState<ChanceCard | null>(null);
  const [communityChestDeck, setCommunityChestDeck] = useState<CommunityChestDeck>(() => createCommunityChestDeck());
  const [activeCommunityChestCard, setActiveCommunityChestCard] = useState<CommunityChestCard | null>(null);
  const [cardTargetingState, setCardTargetingState] = useState<CardTargetingState | null>(null);

  const resetDecks = useCallback(() => {
    setChanceDeck(createChanceDeck());
    setActiveChanceCard(null);
    setCommunityChestDeck(createCommunityChestDeck());
    setActiveCommunityChestCard(null);
    setCardTargetingState(null);
  }, []);

  const drawChance = useCallback(() => {
    const { card, newDeck } = drawChanceCard(chanceDeck);
    setChanceDeck(newDeck);
    setActiveChanceCard(card);
    return card;
  }, [chanceDeck]);

  const drawCommunityChest = useCallback(() => {
    const { card, newDeck } = drawCommunityChestCard(communityChestDeck);
    setCommunityChestDeck(newDeck);
    setActiveCommunityChestCard(card);
    return card;
  }, [communityChestDeck]);

  // --- RESOLVE CHANCE CARD ACTION ---
  const handleResolveChanceCard = useCallback(
    (card: ChanceCard) => {
      setActiveChanceCard(null);
      if (!card) return;

      const player = activePlayer;
      let newCash = player.cash;

      switch (card.actionType) {
        case 'ADVANCE_TO_GO': {
          soundFx.playCash();
          newCash += 200;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: newCash, position: 0 } : p
            ),
          }));
          addLog(`✨ ${player.name} advanced to GO and collected $200!`, 'success', player.id);
          break;
        }
        case 'ADVANCE_TO_SPACE': {
          const targetIdx = card.targetSpaceIndex ?? 0;
          const passedGo = targetIdx < player.position && targetIdx !== 0;
          if (passedGo) {
            soundFx.playCash();
            newCash += 200;
            addLog(`🏃 ${player.name} passed GO and collected $200!`, 'success', player.id);
          }
          const space = boardSpaces[targetIdx];
          const prop = space?.propertyId ? properties.find((p) => p.id === space.propertyId) : null;

          if (prop && prop.ownerId !== null && prop.ownerId !== player.id) {
            const owner = players.find((p) => p.id === prop.ownerId);
            const rent = calculateRent(prop, properties, owner || null, 7);
            if (rent > 0) {
              soundFx.playCash();
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) => {
                  if (p.id === player.id) return { ...p, cash: Math.max(0, newCash - rent), position: targetIdx };
                  if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                  return p;
                }),
              }));
              addLog(`🏠 ${player.name} paid $${rent} rent to ${owner?.name} for ${prop.name}.`, 'warning', player.id);
            } else {
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) =>
                  p.id === player.id ? { ...p, cash: newCash, position: targetIdx } : p
                ),
              }));
            }
          } else if (prop && prop.ownerId === null && player.isAi && newCash >= prop.basePrice) {
            soundFx.playBuyProperty();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, cash: newCash - prop.basePrice, position: targetIdx } : p
              ),
              properties: prev.properties.map((pr) =>
                pr.id === prop.id ? { ...pr, ownerId: player.id } : pr
              ),
            }));
            addLog(`🏠 AI ${player.name} advanced to and purchased ${prop.name} for $${prop.basePrice}!`, 'success', player.id);
          } else {
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, cash: newCash, position: targetIdx } : p
              ),
            }));
          }
          addLog(`🎯 ${player.name} advanced to ${space?.name || 'target space'}.`, 'info', player.id);
          break;
        }
        case 'ADVANCE_TO_NEAREST_UTILITY': {
          let targetIdx = 12; // Electric Company
          if (player.position >= 12 && player.position < 28) targetIdx = 28; // Water Works

          const passedGo = targetIdx < player.position;
          if (passedGo) {
            soundFx.playCash();
            newCash += 200;
            addLog(`🏃 ${player.name} passed GO and collected $200!`, 'success', player.id);
          }

          const space = boardSpaces[targetIdx];
          const prop = space?.propertyId ? properties.find((p) => p.id === space.propertyId) : null;

          if (prop && prop.ownerId !== null && prop.ownerId !== player.id) {
            const owner = players.find((p) => p.id === prop.ownerId);
            const virtualRoll = Math.floor(Math.random() * 6) + 1 + (Math.floor(Math.random() * 6) + 1);
            const rent = virtualRoll * 10;
            soundFx.playCash();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) => {
                if (p.id === player.id) return { ...p, cash: Math.max(0, newCash - rent), position: targetIdx };
                if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                return p;
              }),
            }));
            addLog(`⚡ ${player.name} advanced to ${prop.name}, rolled ${virtualRoll}, and paid $${rent} (10x dice) rent to ${owner?.name}.`, 'warning', player.id);
          } else if (prop && prop.ownerId === null && player.isAi && newCash >= prop.basePrice) {
            soundFx.playBuyProperty();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, cash: newCash - prop.basePrice, position: targetIdx } : p
              ),
              properties: prev.properties.map((pr) =>
                pr.id === prop.id ? { ...pr, ownerId: player.id } : pr
              ),
            }));
            addLog(`💡 AI ${player.name} advanced to and bought ${prop.name} for $${prop.basePrice}!`, 'success', player.id);
          } else {
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, cash: newCash, position: targetIdx } : p
              ),
            }));
            addLog(`⚡ ${player.name} advanced to nearest Utility: ${space?.name}.`, 'info', player.id);
          }
          break;
        }
        case 'ADVANCE_TO_NEAREST_RAILROAD': {
          const railroads = [5, 15, 25, 35];
          let targetIdx = 5;
          for (const r of railroads) {
            if (r > player.position) {
              targetIdx = r;
              break;
            }
          }
          const passedGo = targetIdx < player.position;
          if (passedGo) {
            soundFx.playCash();
            newCash += 200;
            addLog(`🏃 ${player.name} passed GO and collected $200!`, 'success', player.id);
          }

          const space = boardSpaces[targetIdx];
          const prop = space?.propertyId ? properties.find((p) => p.id === space.propertyId) : null;

          if (prop && prop.ownerId !== null && prop.ownerId !== player.id) {
            const owner = players.find((p) => p.id === prop.ownerId);
            const ownerRailroads = properties.filter((p) => p.colorGroup === 'Railroad' && p.ownerId === prop.ownerId).length;
            const standardRent = ownerRailroads === 1 ? 25 : ownerRailroads === 2 ? 50 : ownerRailroads === 3 ? 100 : 200;
            const rent = standardRent * 2;
            soundFx.playCash();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) => {
                if (p.id === player.id) return { ...p, cash: Math.max(0, newCash - rent), position: targetIdx };
                if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                return p;
              }),
            }));
            addLog(`🚂 ${player.name} advanced to ${prop.name} and paid 2x rent ($${rent}) to ${owner?.name}.`, 'warning', player.id);
          } else if (prop && prop.ownerId === null && player.isAi && newCash >= prop.basePrice) {
            soundFx.playBuyProperty();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, cash: newCash - prop.basePrice, position: targetIdx } : p
              ),
              properties: prev.properties.map((pr) =>
                pr.id === prop.id ? { ...pr, ownerId: player.id } : pr
              ),
            }));
            addLog(`🚂 AI ${player.name} advanced to and bought ${prop.name} for $${prop.basePrice}!`, 'success', player.id);
          } else {
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, cash: newCash, position: targetIdx } : p
              ),
            }));
            addLog(`🚂 ${player.name} advanced to nearest Railroad: ${space?.name}.`, 'info', player.id);
          }
          break;
        }
        case 'BANK_DIVIDEND': {
          soundFx.playCash();
          const reward = card.amount || 50;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: p.cash + reward } : p
            ),
          }));
          addLog(`💰 ${player.name} collected $${reward} bank dividend!`, 'success', player.id);
          break;
        }
        case 'GET_OUT_OF_JAIL_FREE': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, hasGetOutOfJailFreeCard: true } : p
            ),
          }));
          addLog(`🎉 ${player.name} received a Get Out of Jail Free card!`, 'success', player.id);
          break;
        }
        case 'GO_BACK_3_SPACES': {
          const newPos = (player.position - 3 + 40) % 40;
          const space = boardSpaces[newPos];
          addLog(`↩️ ${player.name} moved back 3 spaces to ${space?.name}.`, 'info', player.id);

          if (space?.type === 'PROPERTY' && space.propertyId) {
            const prop = properties.find((p) => p.id === space.propertyId);
            if (prop && prop.ownerId !== null && prop.ownerId !== player.id) {
              const owner = players.find((p) => p.id === prop.ownerId);
              const rent = calculateRent(prop, properties, owner || null, 7);
              if (rent > 0) {
                soundFx.playCash();
                setEngineState((prev) => ({
                  ...prev,
                  players: prev.players.map((p) => {
                    if (p.id === player.id) return { ...p, cash: Math.max(0, p.cash - rent), position: newPos };
                    if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                    return p;
                  }),
                }));
                addLog(`🏠 ${player.name} paid $${rent} rent to ${owner?.name} for ${prop.name}.`, 'warning', player.id);
                break;
              }
            } else if (prop && prop.ownerId === null && player.isAi && player.cash >= prop.basePrice) {
              soundFx.playBuyProperty();
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) =>
                  p.id === player.id ? { ...p, cash: p.cash - prop.basePrice, position: newPos } : p
                ),
                properties: prev.properties.map((pr) =>
                  pr.id === prop.id ? { ...pr, ownerId: player.id } : pr
                ),
              }));
              addLog(`🏠 AI ${player.name} retreated and purchased ${prop.name} for $${prop.basePrice}!`, 'success', player.id);
              break;
            }
          } else if (space?.type === 'TAX') {
            const tax = space.taxAmount || 100;
            soundFx.playOwnedLanding();
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === player.id ? { ...p, cash: Math.max(0, p.cash - tax), position: newPos } : p
              ),
              gameState: {
                ...prev.gameState,
                lotteryPool: Math.min(2000, prev.gameState.lotteryPool + tax),
              },
            }));
            addLog(`💸 ${player.name} retreated to Tax space and paid $${tax} into Vault.`, 'warning', player.id);
            break;
          }

          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, position: newPos } : p
            ),
          }));
          break;
        }
        case 'GO_TO_JAIL': {
          soundFx.playJail();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p
            ),
          }));
          addLog(`🚨 ${player.name} was sent directly to Jail!`, 'danger', player.id);
          break;
        }
        case 'GENERAL_REPAIRS': {
          const playerProps = properties.filter((p) => p.ownerId === player.id);
          let houseCount = 0;
          let hotelCount = 0;
          playerProps.forEach((p) => {
            if (p.hotel) hotelCount++;
            else houseCount += p.houses;
          });
          const cost = houseCount * 25 + hotelCount * 100;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: Math.max(0, p.cash - cost) } : p
            ),
            gameState: {
              ...prev.gameState,
              lotteryPool: Math.min(2000, prev.gameState.lotteryPool + cost),
            },
          }));
          addLog(`🛠️ ${player.name} paid $${cost} for general repairs (${houseCount} houses, ${hotelCount} hotels).`, 'warning', player.id);
          break;
        }
        case 'POOR_TAX': {
          const tax = card.amount || 15;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: Math.max(0, p.cash - tax) } : p
            ),
            gameState: {
              ...prev.gameState,
              lotteryPool: Math.min(2000, prev.gameState.lotteryPool + tax),
            },
          }));
          addLog(`💸 ${player.name} paid $${tax} speeding fine into Vault.`, 'warning', player.id);
          break;
        }
        case 'CHAIRMAN_OF_THE_BOARD': {
          const otherPlayers = players.filter((p) => p.id !== player.id && !p.isBankrupt);
          const totalDues = otherPlayers.length * 50;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === player.id) return { ...p, cash: Math.max(0, p.cash - totalDues) };
              if (!p.isBankrupt) return { ...p, cash: p.cash + 50 };
              return p;
            }),
          }));
          addLog(`👔 ${player.name} elected Chairman of the Board and paid $50 to each player ($${totalDues} total).`, 'info', player.id);
          break;
        }
        case 'BUILDING_LOAN_MATURES': {
          soundFx.playCash();
          const reward = card.amount || 150;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: p.cash + reward } : p
            ),
          }));
          addLog(`🏦 ${player.name}'s building loan matured! Collected +$${reward}.`, 'success', player.id);
          break;
        }
      }
    },
    [activePlayer, boardSpaces, properties, players, addLog, setEngineState]
  );

  // --- COMMUNITY CHEST CARD ACTION RESOLUTION ---
  const handleResolveCommunityChestCard = useCallback(
    (card: CommunityChestCard) => {
      setActiveCommunityChestCard(null);
      const player = activePlayer;
      let newCash = player.cash;

      switch (card.actionType) {
        case 'ADVANCE_TO_GO': {
          soundFx.playCash();
          newCash += 200;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: newCash, position: 0 } : p
            ),
          }));
          addLog(`✨ ${player.name} advanced to GO and collected $200!`, 'success', player.id);
          break;
        }
        case 'BANK_ERROR':
        case 'SALE_OF_STOCK':
        case 'HOLIDAY_FUND':
        case 'INCOME_TAX_REFUND':
        case 'LIFE_INSURANCE':
        case 'CONSULTANCY_FEE':
        case 'BEAUTY_CONTEST':
        case 'INHERITANCE': {
          soundFx.playCash();
          const reward = card.amount || 100;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: p.cash + reward } : p
            ),
          }));
          addLog(`💰 ${player.name} received +$${reward} from Community Chest (${card.title})!`, 'success', player.id);
          break;
        }
        case 'DOCTOR_FEE':
        case 'HOSPITAL_FEES':
        case 'SCHOOL_FEES': {
          const fee = card.amount || 50;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: Math.max(0, p.cash - fee) } : p
            ),
            gameState: {
              ...prev.gameState,
              lotteryPool: Math.min(2000, prev.gameState.lotteryPool + fee),
            },
          }));
          addLog(`💸 ${player.name} paid $${fee} from Community Chest into Vault (${card.title}).`, 'warning', player.id);
          break;
        }
        case 'BIRTHDAY': {
          soundFx.playFanfare();
          const otherPlayers = players.filter((p) => p.id !== player.id && !p.isBankrupt);
          const giftPerPlayer = card.amount || 10;
          const totalGifts = otherPlayers.length * giftPerPlayer;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === player.id) return { ...p, cash: p.cash + totalGifts };
              if (!p.isBankrupt) return { ...p, cash: Math.max(0, p.cash - giftPerPlayer) };
              return p;
            }),
          }));
          addLog(`🎂 It's ${player.name}'s birthday! Collected $${giftPerPlayer} from each player (+$${totalGifts} total).`, 'success', player.id);
          break;
        }
        case 'GET_OUT_OF_JAIL_FREE': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, hasGetOutOfJailFreeCard: true } : p
            ),
          }));
          addLog(`🎉 ${player.name} received a Get Out of Jail Free card!`, 'success', player.id);
          break;
        }
        case 'GO_TO_JAIL': {
          soundFx.playJail();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p
            ),
          }));
          addLog(`🚨 ${player.name} sent directly to Jail!`, 'danger', player.id);
          break;
        }
        case 'STREET_REPAIRS': {
          const playerProps = properties.filter((p) => p.ownerId === player.id);
          let houseCount = 0;
          let hotelCount = 0;
          playerProps.forEach((p) => {
            if (p.hotel) hotelCount++;
            else houseCount += p.houses;
          });
          const cost = houseCount * 40 + hotelCount * 115;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === player.id ? { ...p, cash: Math.max(0, p.cash - cost) } : p
            ),
            gameState: {
              ...prev.gameState,
              lotteryPool: Math.min(2000, prev.gameState.lotteryPool + cost),
            },
          }));
          addLog(`🛠️ ${player.name} paid $${cost} for street repairs (${houseCount} houses, ${hotelCount} hotels).`, 'warning', player.id);
          break;
        }
      }
    },
    [activePlayer, properties, players, addLog, setEngineState]
  );

  // --- MONOPOLY CHALLENGE DUEL ---
  const handleInitiateChallenge = useCallback(() => {
    if (!gameState.hasTaxOccurred) {
      addLog(`🔒 Monopoly Duel card is locked until the first tax event occurs on the board!`, 'warning', activePlayer.id);
      return;
    }

    const unownedProps = properties.filter((p) => p.ownerId !== null && p.ownerId !== activePlayer.id);
    if (unownedProps.length === 0) return;

    const prop = unownedProps[0];
    const seller = players.find((p) => p.id === prop.ownerId);
    if (!seller) return;

    const buyerRoll = Math.floor(Math.random() * 6) + 1 + (Math.floor(Math.random() * 6) + 1);
    const sellerRoll = Math.floor(Math.random() * 6) + 1 + (Math.floor(Math.random() * 6) + 1);
    const cost = prop.basePrice * 3;

    if (buyerRoll > sellerRoll && activePlayer.cash >= cost) {
      soundFx.playFanfare();
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          if (p.id === activePlayer.id) return { ...p, cash: p.cash - cost, monopolyChallengeUsed: true };
          if (p.id === seller.id) return { ...p, cash: p.cash + cost };
          return p;
        }),
        properties: prev.properties.map((p) => (p.id === prop.id ? { ...p, ownerId: activePlayer.id } : p)),
      }));
      addLog(`⚔️ DUEL WON! ${activePlayer.name} (${buyerRoll}) beat ${seller.name} (${sellerRoll}) & won ${prop.name}!`, 'success', activePlayer.id);
    } else {
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, monopolyChallengeUsed: true } : p)),
      }));
      addLog(`⚔️ DUEL FAILED! ${seller.name} (${sellerRoll}) defended against ${activePlayer.name} (${buyerRoll}).`, 'warning', activePlayer.id);
    }
  }, [gameState.hasTaxOccurred, properties, activePlayer, players, addLog, setEngineState]);

  // --- WILDCARD PLAY ---
  const handlePlayCard = useCallback(
    (
      rawCardId: string,
      options?: { targetPropertyId?: string; targetPlayerId?: number }
    ) => {
      soundFx.playCardDraw();
      const cardId = normalizeWildcardId(rawCardId);
      const card = activePlayer.wildcardsHand.find(
        (c) => normalizeWildcardId(c.id) === cardId || c.id === rawCardId
      );
      if (!card) return;

      const resolveSpaceLandingAfterMovement = (targetPos: number, passedGo: boolean) => {
        let newCash = activePlayer.cash;
        let newLaps = activePlayer.lapsCompleted;
        let newBankerLaps = gameState.bankerLapCounter;

        if (passedGo) {
          newLaps++;
          soundFx.playCash();
          newCash += 200;
          if (activePlayer.id === 0) newBankerLaps++;
          addLog(`🏃 ${activePlayer.name} passed GO and collected $200!`, 'success', activePlayer.id);
        }

        setEngineState((prev) => ({
          ...prev,
          players: prev.players.map((p) =>
            p.id === activePlayer.id
              ? {
                  ...p,
                  cash: newCash,
                  position: targetPos,
                  lapsCompleted: newLaps,
                  inJail: false,
                  jailTurns: 0,
                  activeModifiers: passedGo
                    ? p.activeModifiers.filter((m) => m.expiresAt !== 'PASS_GO')
                    : p.activeModifiers,
                }
              : p
          ),
          gameState: {
            ...prev.gameState,
            bankerLapCounter: newBankerLaps,
            turnPhase: 'RESOLVING_SPACE',
          },
        }));

        const landed = boardSpaces[targetPos];
        if (landed.type === 'FREE_PARKING') {
          handleFreeParkingLanding(false);
        } else if (landed.type === 'CHANCE') {
          const { card: chCard, newDeck } = drawChanceCard(chanceDeck);
          setChanceDeck(newDeck);
          setActiveChanceCard(chCard);
          addLog(`❓ ${activePlayer.name} landed on Chance!`, 'card', activePlayer.id);
        } else if (landed.type === 'COMMUNITY_CHEST') {
          const { card: ccCard, newDeck } = drawCommunityChestCard(communityChestDeck);
          setCommunityChestDeck(newDeck);
          setActiveCommunityChestCard(ccCard);
          addLog(`🧰 ${activePlayer.name} landed on Community Chest!`, 'card', activePlayer.id);
        } else if (landed.type === 'GO_TO_JAIL') {
          soundFx.playJail();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p
            ),
          }));
          addLog(`🚨 ${activePlayer.name} sent to Jail!`, 'danger', activePlayer.id);
        } else if (landed.type === 'TAX' && landed.taxAmount) {
          const isTaxImmune =
            activePlayer.taxExempt ||
            activePlayer.activeModifiers.some(
              (m) => m.id === 'tax_exempt' || m.id === 'obstructing_injustice'
            );
          if (isTaxImmune) {
            soundFx.playCash();
            addLog(`🏛️ ${activePlayer.name} invoked Tax Exemption! Paid $0 tax.`, 'success', activePlayer.id);
          } else {
            const fee = landed.taxAmount;
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === activePlayer.id ? { ...p, cash: Math.max(0, p.cash - fee) } : p
              ),
              gameState: {
                ...prev.gameState,
                lotteryPool: Math.min(2000, prev.gameState.lotteryPool + fee),
                hasTaxOccurred: true,
              },
            }));
            addLog(`💸 ${activePlayer.name} paid $${fee} tax to Vault.`, 'warning', activePlayer.id);
          }
        } else if (landed.type === 'PROPERTY' && landed.propertyId) {
          const prop = properties.find((p) => p.id === landed.propertyId);
          if (prop && prop.ownerId !== null && prop.ownerId !== activePlayer.id) {
            const owner = players.find((p) => p.id === prop.ownerId) || null;
            const hasImmunity = activePlayer.activeModifiers.some((m) => m.id === 'obstructing_injustice');
            const hasFreeRent = activePlayer.activeModifiers.some((m) => m.id === 'free_rent');
            const hasRentEvasion = activePlayer.activeModifiers.some((m) => m.id === 'rent_evasion');
            const isVip = activePlayer.activeModifiers.some((m) => m.id === 'vip');

            if (hasImmunity) {
              soundFx.playCash();
              addLog(`⚖️ Total Immunity Shield! ${activePlayer.name} paid $0 rent for ${prop.name}!`, 'success', activePlayer.id);
            } else if (hasFreeRent) {
              const rent = calculateRent(prop, properties, owner, 7, isVip);
              soundFx.playCash();
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) => {
                  if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                  if (p.id === activePlayer.id) {
                    return {
                      ...p,
                      activeModifiers: p.activeModifiers.filter((m) => m.id !== 'free_rent'),
                    };
                  }
                  return p;
                }),
              }));
              addLog(`🛡️ Free Rent Shield! Bank covered $${rent} rent to ${owner?.name}!`, 'success', activePlayer.id);
            } else if (hasRentEvasion) {
              const rent = calculateRent(prop, properties, owner, 7, isVip);
              soundFx.playCash();
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) => {
                  if (p.id === activePlayer.id) {
                    return {
                      ...p,
                      cash: p.cash + rent,
                      activeModifiers: p.activeModifiers.filter((m) => m.id !== 'rent_evasion'),
                    };
                  }
                  if (p.id === prop.ownerId) return { ...p, cash: Math.max(0, p.cash - rent) };
                  return p;
                }),
              }));
              addLog(`🔄 Rent Evasion! Owner ${owner?.name} paid YOU $${rent} rent!`, 'success', activePlayer.id);
            } else {
              const rent = calculateRent(prop, properties, owner, 7, isVip);
              if (rent > 0) {
                const wasCrooked = prop.isCrooked || prop.modifiedBy?.includes('crooked');
                soundFx.playCash();
                setEngineState((prev) => ({
                  ...prev,
                  players: prev.players.map((p) => {
                    if (p.id === activePlayer.id) {
                      const updatedMods = isVip ? p.activeModifiers.filter((m) => m.id !== 'vip') : p.activeModifiers;
                      return { ...p, cash: Math.max(0, p.cash - rent), activeModifiers: updatedMods };
                    }
                    if (p.id === prop.ownerId) return { ...p, cash: p.cash + rent };
                    return p;
                  }),
                  properties: wasCrooked
                    ? prev.properties.map((pr) => (pr.id === prop.id ? { ...pr, isCrooked: false, modifiedBy: pr.modifiedBy?.filter((b) => b !== 'crooked') } : pr))
                    : prev.properties,
                }));
                addLog(`🏠 ${activePlayer.name} paid $${rent} rent to ${owner?.name} for ${prop.name}${wasCrooked ? ' (2x Crooked!)' : ''}.`, 'warning', activePlayer.id);
              }
            }
          }
        }
      };

      // Execute effect based on normalized card ID
      switch (cardId) {
        case 'extra_die': {
          soundFx.playDiceRoll();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers.filter((m) => m.id !== 'one_die'),
                      { id: 'extra_die', name: 'Extra Die (3d6)', type: 'BUFF', expiresAt: 'TURN_END' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🎲 ${activePlayer.name} activated Extra Die! Your next roll will throw 3 dice!`, 'card', activePlayer.id);
          break;
        }
        case 'one_die': {
          soundFx.playDiceRoll();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers.filter((m) => m.id !== 'extra_die'),
                      { id: 'one_die', name: 'One Die (1d6)', type: 'BUFF', expiresAt: 'TURN_END' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🎲 ${activePlayer.name} activated One Die! Your next roll will throw only 1 die!`, 'card', activePlayer.id);
          break;
        }
        case 'second_chance': {
          if (gameState.turnPhase === 'POST_ROLL' || gameState.turnPhase === 'RESOLVING_SPACE') {
            soundFx.playFanfare();
            onSecondChanceReroll?.();
            setEngineState((prev) => ({
              ...prev,
              gameState: { ...prev.gameState, turnPhase: 'PRE_ROLL' },
            }));
            addLog(`🎲 ${activePlayer.name} used Second Chance to reroll the dice!`, 'card', activePlayer.id);
          } else {
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) =>
                p.id === activePlayer.id
                  ? {
                      ...p,
                      activeModifiers: [
                        ...p.activeModifiers,
                        { id: 'second_chance', name: 'Second Chance', type: 'BUFF', expiresAt: 'TURN_END' },
                      ],
                    }
                  : p
              ),
            }));
            addLog(`🎲 ${activePlayer.name} primed Second Chance for an optional reroll!`, 'card', activePlayer.id);
          }
          break;
        }
        case 'free_rent': {
          soundFx.playCash();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'free_rent', name: 'Free Rent Shield', type: 'BUFF', expiresAt: 'LANDING' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🛡️ ${activePlayer.name} activated Free Rent Shield! Next rent fee is covered by the Bank!`, 'card', activePlayer.id);
          break;
        }
        case 'crooked': {
          const myProps = properties.filter((p) => p.ownerId === activePlayer.id && !p.isCrooked);
          if (myProps.length === 0) {
            const anyMyProps = properties.filter((p) => p.ownerId === activePlayer.id);
            if (anyMyProps.length === 0) {
              setEngineState((prev) => ({
                ...prev,
                players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + 100 } : p)),
              }));
              addLog(`🃏 ${activePlayer.name} played Crooked, but owns no property. Compensated with $100!`, 'card', activePlayer.id);
              break;
            } else {
              addLog(`⚠️ All your properties are already rigged with Crooked! Card remains in your hand.`, 'warning', activePlayer.id);
              return;
            }
          }

          if (!options?.targetPropertyId) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: 'Select one of your properties on the board to rig with Crooked (next opponent pays 2x rent):',
                targetType: 'PROPERTY',
                eligiblePropertyIds: myProps.map((p) => p.id),
              });
              return;
            } else {
              const targetProp = [...myProps].sort((a, b) => b.basePrice - a.basePrice)[0];
              options = { targetPropertyId: targetProp.id };
            }
          }

          const targetProp = properties.find((p) => p.id === options!.targetPropertyId);
          if (!targetProp) return;

          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            properties: prev.properties.map((p) =>
              p.id === targetProp.id
                ? { ...p, isCrooked: true, modifiedBy: [...(p.modifiedBy || []), 'crooked'] }
                : p
            ),
          }));
          addLog(`🃏 ${activePlayer.name} rigged ${targetProp.name} with Crooked! Next opponent landing pays 2x rent!`, 'card', activePlayer.id);
          break;
        }
        case 'discount': {
          soundFx.playCash();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'discount', name: '50% Property Discount', type: 'BUFF', expiresAt: 'SINGLE_EVENT' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🏷️ ${activePlayer.name} activated 50% Property Discount on next purchase!`, 'card', activePlayer.id);
          break;
        }
        case 'tax_exempt': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    taxExempt: true,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'tax_exempt', name: 'Tax Exemption', type: 'BUFF', expiresAt: 'PASS_GO' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🏛️ ${activePlayer.name} activated Tax Exemption until passing GO!`, 'card', activePlayer.id);
          break;
        }
        case 'single_forward': {
          const nextPos = (activePlayer.position + 1) % 40;
          const passGo = activePlayer.position + 1 >= 40;
          resolveSpaceLandingAfterMovement(nextPos, passGo);
          addLog(`⏩ ${activePlayer.name} stepped forward +1 space to ${boardSpaces[nextPos].name}!`, 'card', activePlayer.id);
          break;
        }
        case 'two_forward': {
          const nextPos = (activePlayer.position + 2) % 40;
          const passGo = activePlayer.position + 2 >= 40;
          resolveSpaceLandingAfterMovement(nextPos, passGo);
          addLog(`⏩ ${activePlayer.name} advanced forward +2 spaces to ${boardSpaces[nextPos].name}!`, 'card', activePlayer.id);
          break;
        }
        case 'three_forward': {
          const nextPos = (activePlayer.position + 3) % 40;
          const passGo = activePlayer.position + 3 >= 40;
          resolveSpaceLandingAfterMovement(nextPos, passGo);
          addLog(`⏩ ${activePlayer.name} vaulted forward +3 spaces to ${boardSpaces[nextPos].name}!`, 'card', activePlayer.id);
          break;
        }
        case 'five_forward': {
          const nextPos = (activePlayer.position + 5) % 40;
          const passGo = activePlayer.position + 5 >= 40;
          resolveSpaceLandingAfterMovement(nextPos, passGo);
          addLog(`⏩ ${activePlayer.name} rocketed forward +5 spaces to ${boardSpaces[nextPos].name}!`, 'card', activePlayer.id);
          break;
        }
        case 'one_backward': {
          const nextPos = (activePlayer.position - 1 + 40) % 40;
          resolveSpaceLandingAfterMovement(nextPos, false);
          addLog(`⏪ ${activePlayer.name} stepped backward -1 space to ${boardSpaces[nextPos].name}!`, 'card', activePlayer.id);
          break;
        }
        case 'peak_hour': {
          soundFx.playCash();
          const unownedTransit = properties.find(
            (p) => (p.colorGroup === 'Railroad' || p.colorGroup === 'Utility') && p.ownerId === null
          );
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'peak_hour', name: 'Peak Hour Transit', type: 'BUFF', expiresAt: 'PASS_GO' },
                    ],
                  }
                : p
            ),
            properties: unownedTransit
              ? prev.properties.map((p) => (p.id === unownedTransit.id ? { ...p, ownerId: activePlayer.id } : p))
              : prev.properties,
          }));
          addLog(`🚆 ${activePlayer.name} activated Peak Hour! Railroad & Utility rent doubled${unownedTransit ? ` and claimed ${unownedTransit.name}!` : '!' }`, 'card', activePlayer.id);
          break;
        }
        case 'free_ticket': {
          soundFx.playCash();
          const rrPositions = [5, 15, 25, 35];
          const nextRr = rrPositions.find((pos) => pos > activePlayer.position) ?? rrPositions[0];
          const passGo = nextRr < activePlayer.position;
          resolveSpaceLandingAfterMovement(nextRr, passGo);
          addLog(`🎫 ${activePlayer.name} used Free Ticket and fast-traveled to ${boardSpaces[nextRr].name}!`, 'card', activePlayer.id);
          break;
        }
        case 'depreciation': {
          const oppPropsWithBuildings = properties.filter(
            (p) => p.ownerId !== null && p.ownerId !== activePlayer.id && (p.hotel || (p.houses !== undefined && p.houses > 0))
          );
          const oppUnmortgaged = properties.filter(
            (p) => p.ownerId !== null && p.ownerId !== activePlayer.id && !p.isMortgaged
          );
          const hasBuildings = oppPropsWithBuildings.length > 0;
          const eligible = hasBuildings ? oppPropsWithBuildings.map((p) => p.id) : oppUnmortgaged.map((p) => p.id);

          if (eligible.length === 0) {
            addLog(`🏚️ Depreciation played, but opponents have no developed or unmortgaged properties. Card remains in your hand.`, 'warning', activePlayer.id);
            return;
          }

          if (!options?.targetPropertyId) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: hasBuildings
                  ? 'Select an enemy property with houses/hotel to demolish a building:'
                  : 'Select an unmortgaged enemy property to force into mortgage:',
                targetType: 'PROPERTY',
                eligiblePropertyIds: eligible,
              });
              return;
            } else {
              options = { targetPropertyId: eligible[0] };
            }
          }

          const target = properties.find((p) => p.id === options!.targetPropertyId);
          if (!target) return;
          const oppOwner = players.find((p) => p.id === target.ownerId);

          soundFx.playCopSiren();
          if (target.hotel) {
            setEngineState((prev) => ({
              ...prev,
              properties: prev.properties.map((p) =>
                p.id === target.id
                  ? { ...p, hotel: false, houses: 4 }
                  : p
              ),
            }));
            addLog(`🏚️ Depreciation struck ${oppOwner?.name}'s ${target.name}! Hotel demolished down to 4 houses!`, 'card', activePlayer.id);
          } else if (target.houses > 0) {
            setEngineState((prev) => ({
              ...prev,
              properties: prev.properties.map((p) =>
                p.id === target.id
                  ? { ...p, houses: Math.max(0, p.houses - 1) }
                  : p
              ),
            }));
            addLog(`🏚️ Depreciation struck ${oppOwner?.name}'s ${target.name}! 1 house demolished! (Remaining: ${target.houses - 1})`, 'card', activePlayer.id);
          } else {
            setEngineState((prev) => ({
              ...prev,
              properties: prev.properties.map((p) =>
                p.id === target.id ? { ...p, isMortgaged: true } : p
              ),
            }));
            addLog(`🏚️ Depreciation forced a mortgage on ${oppOwner?.name}'s ${target.name}!`, 'card', activePlayer.id);
          }
          break;
        }
        case 'risk_taker': {
          soundFx.playCardDraw();
          const { card: chCard, newDeck } = drawChanceCard(chanceDeck);
          setChanceDeck(newDeck);
          setActiveChanceCard(chCard);
          addLog(`🎲 ${activePlayer.name} played Risk-taker and drew a bonus Chance card!`, 'card', activePlayer.id);
          break;
        }
        case 'hedge_fund': {
          soundFx.playCash();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    cash: p.cash + 100,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'hedge_fund', name: 'Hedge Fund Yield', type: 'BUFF', expiresAt: 'PASS_GO' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`📈 ${activePlayer.name} activated Hedge Fund and collected $100 dividend!`, 'card', activePlayer.id);
          break;
        }
        case 'property_roulette': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id ? { ...p, cash: p.cash + 150 } : p
            ),
          }));
          addLog(`🎰 Property Roulette spun! ${activePlayer.name} hit the $150 jackpot!`, 'card', activePlayer.id);
          break;
        }
        case 'flipping_business': {
          soundFx.playCash();
          const backPos = (activePlayer.position - 5 + 40) % 40;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id ? { ...p, cash: p.cash + 100 } : p
            ),
          }));
          resolveSpaceLandingAfterMovement(backPos, false);
          addLog(`🔄 Flipping Business! ${activePlayer.name} stepped backward 5 spaces and received +$100 bonus!`, 'card', activePlayer.id);
          break;
        }
        case 'lottery_ticket': {
          soundFx.playFanfare();
          soundFx.playCash();
          const pool = gameState.lotteryPool;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + pool } : p)),
            gameState: { ...prev.gameState, lotteryPool: 0 },
          }));
          addLog(`💰 ${activePlayer.name} claimed $${pool} Vault via Lottery Ticket!`, 'card', activePlayer.id);
          break;
        }
        case 'merger': {
          const myProps = properties.filter(
            (p) => p.ownerId === activePlayer.id && !p.hotel && p.colorGroup !== 'Railroad' && p.colorGroup !== 'Utility'
          );
          if (myProps.length === 0) {
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + 150 } : p)),
            }));
            addLog(`🏗️ Corporate Merger granted $150 expansion capital to ${activePlayer.name}!`, 'card', activePlayer.id);
            break;
          }

          if (!options?.targetPropertyId) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: 'Select one of your properties to receive a free building upgrade:',
                targetType: 'PROPERTY',
                eligiblePropertyIds: myProps.map((p) => p.id),
              });
              return;
            } else {
              const targetProp = [...myProps].sort((a, b) => (b.houses || 0) - (a.houses || 0))[0];
              options = { targetPropertyId: targetProp.id };
            }
          }

          const target = properties.find((p) => p.id === options!.targetPropertyId);
          if (!target) return;

          soundFx.playBuyProperty();
          setEngineState((prev) => ({
            ...prev,
            properties: prev.properties.map((p) => {
              if (p.id !== target.id) return p;
              if (p.houses >= 4) return { ...p, houses: 0, hotel: true };
              return { ...p, houses: Math.min(4, (p.houses || 0) + 1) };
            }),
          }));
          addLog(`🏗️ Corporate Merger! Free building upgrade applied to ${activePlayer.name}'s ${target.name}!`, 'card', activePlayer.id);
          break;
        }
        case 'acquisition': {
          const oppProps = properties.filter((p) => p.ownerId !== null && p.ownerId !== activePlayer.id);
          if (oppProps.length === 0) {
            addLog(`🤝 Acquisition played, but opponents hold no properties. Card remains in your hand.`, 'warning', activePlayer.id);
            return;
          }

          if (!options?.targetPropertyId) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: 'Select an opponent property to acquire at base price:',
                targetType: 'PROPERTY',
                eligiblePropertyIds: oppProps.map((p) => p.id),
              });
              return;
            } else {
              const targetProp = [...oppProps].sort((a, b) => b.basePrice - a.basePrice)[0];
              options = { targetPropertyId: targetProp.id };
            }
          }

          const target = properties.find((p) => p.id === options!.targetPropertyId);
          if (!target) return;
          const seller = players.find((p) => p.id === target.ownerId);
          const buyoutCost = target.basePrice;

          soundFx.playBuyProperty();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === activePlayer.id) return { ...p, cash: Math.max(0, p.cash - buyoutCost) };
              if (seller && p.id === seller.id) return { ...p, cash: p.cash + buyoutCost };
              return p;
            }),
            properties: prev.properties.map((p) => (p.id === target.id ? { ...p, ownerId: activePlayer.id } : p)),
          }));
          addLog(`🤝 Hostile Acquisition! ${activePlayer.name} bought ${target.name} from ${seller?.name} for $${buyoutCost}!`, 'card', activePlayer.id);
          break;
        }
        case 'public_offering': {
          soundFx.playCash();
          let totalRaised = 0;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id !== activePlayer.id && !p.isBankrupt) {
                const contribution = Math.min(50, p.cash);
                totalRaised += contribution;
                return { ...p, cash: Math.max(0, p.cash - 50) };
              }
              return p;
            }),
          }));
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + totalRaised } : p)),
          }));
          addLog(`📢 Initial Public Offering! Each opponent contributed $50 to ${activePlayer.name}!`, 'card', activePlayer.id);
          break;
        }
        case 'free_parking_teleport': {
          soundFx.playCash();
          resolveSpaceLandingAfterMovement(20, false);
          addLog(`🚗 Free Parking Teleport! ${activePlayer.name} warped directly to Free Parking!`, 'card', activePlayer.id);
          break;
        }
        case 'ufo': {
          const opponents = players.filter((p) => p.id !== activePlayer.id && !p.isBankrupt);
          if (opponents.length === 0) {
            addLog(`⚠️ No active opponents to swap positions with! Card remains in your hand.`, 'warning', activePlayer.id);
            return;
          }

          if (options?.targetPlayerId === undefined) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: 'Select an opponent to beam up and swap board positions with:',
                targetType: 'PLAYER',
                eligiblePlayerIds: opponents.map((p) => p.id),
              });
              return;
            } else {
              const leadOpp = [...opponents].sort((a, b) => b.cash - a.cash)[0];
              options = { targetPlayerId: leadOpp.id };
            }
          }

          const targetP = players.find((p) => p.id === options!.targetPlayerId);
          if (!targetP) return;

          soundFx.playFanfare();
          const myOldPos = activePlayer.position;
          const oppOldPos = targetP.position;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === activePlayer.id) return { ...p, position: oppOldPos };
              if (p.id === targetP.id) return { ...p, position: myOldPos };
              return p;
            }),
          }));
          addLog(`🛸 UFO Abduction! ${activePlayer.name} and ${targetP.name} swapped positions on the board!`, 'card', activePlayer.id);
          break;
        }
        case 'vip': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'vip', name: 'VIP Pass', type: 'BUFF', expiresAt: 'LANDING' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🍸 VIP Pass activated! Next landing on developed opponent property pays base rent only!`, 'card', activePlayer.id);
          break;
        }
        case 'saturday_rates': {
          soundFx.playCash();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'saturday_rates', name: 'Saturday Rates', type: 'BUFF', expiresAt: 'PASS_GO' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🏖️ Saturday Rates activated! Collect $100 whenever any player visits Free Parking!`, 'card', activePlayer.id);
          break;
        }
        case 'swindle': {
          const unownedProps = properties.filter((p) => p.ownerId === null);
          if (unownedProps.length === 0) {
            setEngineState((prev) => ({
              ...prev,
              players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + 200 } : p)),
            }));
            addLog(`🃏 Swindle played, but all properties are owned. Awarded $200 cash!`, 'card', activePlayer.id);
            break;
          }

          if (!options?.targetPropertyId) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: 'Select an unowned property on the board to claim for free:',
                targetType: 'PROPERTY',
                eligiblePropertyIds: unownedProps.map((p) => p.id),
              });
              return;
            } else {
              const highestVal = [...unownedProps].sort((a, b) => b.basePrice - a.basePrice)[0];
              options = { targetPropertyId: highestVal.id };
            }
          }

          const targetProp = properties.find((p) => p.id === options!.targetPropertyId);
          if (!targetProp) return;

          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            properties: prev.properties.map((p) => (p.id === targetProp.id ? { ...p, ownerId: activePlayer.id } : p)),
          }));
          addLog(`🃏 Swindle executed! ${activePlayer.name} claimed unowned ${targetProp.name} for free!`, 'card', activePlayer.id);
          break;
        }
        case 'petty_theft': {
          const opps = players.filter((p) => p.id !== activePlayer.id && !p.isBankrupt && p.cash > 0);
          if (opps.length === 0) {
            addLog(`⚠️ Opponents have no cash to steal! Card remains in your hand.`, 'warning', activePlayer.id);
            return;
          }

          if (options?.targetPlayerId === undefined) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: 'Select an opponent to pickpocket and steal $100 from:',
                targetType: 'PLAYER',
                eligiblePlayerIds: opps.map((p) => p.id),
              });
              return;
            } else {
              const richestOpp = [...opps].sort((a, b) => b.cash - a.cash)[0];
              options = { targetPlayerId: richestOpp.id };
            }
          }

          const targetP = players.find((p) => p.id === options!.targetPlayerId);
          if (!targetP) return;

          soundFx.playCash();
          const stolen = Math.min(100, targetP.cash);
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id === targetP.id) return { ...p, cash: Math.max(0, p.cash - stolen) };
              if (p.id === activePlayer.id) return { ...p, cash: p.cash + stolen };
              return p;
            }),
          }));
          addLog(`🥷 Petty Theft! ${activePlayer.name} stole $${stolen} from ${targetP.name}!`, 'card', activePlayer.id);
          break;
        }
        case 'obstructing_injustice': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'obstructing_injustice', name: 'Immunity Shield', type: 'BUFF', expiresAt: 'PASS_GO' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`⚖️ Obstructing Injustice! Total Immunity Shield active until passing GO!`, 'card', activePlayer.id);
          break;
        }
        case 'snitch': {
          const opps = players.filter((p) => p.id !== activePlayer.id && !p.isBankrupt && !p.inJail);
          if (opps.length === 0) {
            addLog(`⚠️ No active opponents are eligible to be sent to Jail! Card remains in your hand.`, 'warning', activePlayer.id);
            return;
          }

          if (options?.targetPlayerId === undefined) {
            if (!activePlayer.isAi) {
              setCardTargetingState({
                cardId,
                rawCardId,
                cardName: card.name,
                description: 'Select an opponent to report to police and send directly to Jail:',
                targetType: 'PLAYER',
                eligiblePlayerIds: opps.map((p) => p.id),
              });
              return;
            } else {
              const leadOpp = [...opps].sort((a, b) => b.cash - a.cash)[0];
              options = { targetPlayerId: leadOpp.id };
            }
          }

          const targetP = players.find((p) => p.id === options!.targetPlayerId);
          if (!targetP) return;

          soundFx.playCopSiren();
          soundFx.playJail();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === targetP.id ? { ...p, position: 10, inJail: true, jailTurns: 0 } : p
            ),
          }));
          addLog(`🚨 Snitch! ${activePlayer.name} reported ${targetP.name} to the police! Sent directly to Jail!`, 'card', activePlayer.id);
          break;
        }
        case 'robbery': {
          soundFx.playCash();
          let loot = 0;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id !== activePlayer.id && !p.isBankrupt) {
                const stealAmt = Math.min(100, p.cash);
                loot += stealAmt;
                return { ...p, cash: Math.max(0, p.cash - stealAmt) };
              }
              return p;
            }),
          }));
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + loot } : p)),
          }));
          addLog(`💰 Highway Robbery! ${activePlayer.name} stole $100 from every active opponent!`, 'card', activePlayer.id);
          break;
        }
        case 'power_trip': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    cash: p.cash + 100,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'power_trip', name: 'Power Trip (Roll x $10)', type: 'BUFF', expiresAt: 'PASS_GO' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`⚡ Power Trip! +$100 bonus awarded and future rolls generate bonus cash!`, 'card', activePlayer.id);
          break;
        }
        case 'rent_evasion': {
          soundFx.playFanfare();
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) =>
              p.id === activePlayer.id
                ? {
                    ...p,
                    activeModifiers: [
                      ...p.activeModifiers,
                      { id: 'rent_evasion', name: 'Rent Evasion (Reverse Rent)', type: 'BUFF', expiresAt: 'LANDING' },
                    ],
                  }
                : p
            ),
          }));
          addLog(`🔄 Rent Evasion active! Next property owner will pay YOU the rent instead!`, 'card', activePlayer.id);
          break;
        }
        case 'heist': {
          soundFx.playFanfare();
          soundFx.playCash();
          let heistLoot = 0;
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => {
              if (p.id !== activePlayer.id && !p.isBankrupt) {
                const stealAmt = Math.min(150, p.cash);
                heistLoot += stealAmt;
                return { ...p, cash: Math.max(0, p.cash - stealAmt) };
              }
              return p;
            }),
          }));
          setEngineState((prev) => ({
            ...prev,
            players: prev.players.map((p) => (p.id === activePlayer.id ? { ...p, cash: p.cash + heistLoot } : p)),
          }));
          addLog(`🎭 GRAND HEIST! ${activePlayer.name} stole $150 from each active opponent!`, 'card', activePlayer.id);
          break;
        }
        case 'bail_jump': {
          soundFx.playFanfare();
          resolveSpaceLandingAfterMovement(19, false);
          addLog(`🏃 Bail Jump! ${activePlayer.name} escaped custody and dashed to space 19 (St. James Place)!`, 'card', activePlayer.id);
          break;
        }
        default: {
          addLog(`🃏 ${activePlayer.name} played ${card.name}!`, 'card', activePlayer.id);
          break;
        }
      }

      setCardTargetingState(null);

      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) => {
          if (p.id !== activePlayer.id) return p;
          let removed = false;
          return {
            ...p,
            wildcardsHand: p.wildcardsHand.filter((c) => {
              if (!removed && (normalizeWildcardId(c.id) === cardId || c.id === rawCardId)) {
                removed = true;
                return false;
              }
              return true;
            }),
          };
        }),
      }));
    },
    [
      activePlayer,
      gameState.turnPhase,
      gameState.bankerLapCounter,
      gameState.lotteryPool,
      boardSpaces,
      properties,
      players,
      chanceDeck,
      communityChestDeck,
      addLog,
      setEngineState,
      onSecondChanceReroll,
      handleFreeParkingLanding,
    ]
  );

  return {
    chanceDeck,
    setChanceDeck,
    activeChanceCard,
    setActiveChanceCard,
    communityChestDeck,
    setCommunityChestDeck,
    activeCommunityChestCard,
    setActiveCommunityChestCard,
    cardTargetingState,
    setCardTargetingState,
    resetDecks,
    drawChance,
    drawCommunityChest,
    handleResolveChanceCard,
    handleResolveCommunityChestCard,
    handleInitiateChallenge,
    handlePlayCard,
  };
}
