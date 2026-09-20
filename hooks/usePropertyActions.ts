import { useCallback } from 'react';
import {
  Player,
  Property,
  GameEventLog,
  GameRulesOptions,
  Wildcard,
} from '@/types/monopoly';
import { soundFx } from '@/lib/sound';
import { drawWildcard } from '@/lib/gameEngine';

interface EngineStateLike {
  gameState: any;
  players: Player[];
  properties: Property[];
  draftPool: Property[];
  logs: GameEventLog[];
}

interface UsePropertyActionsProps<T extends EngineStateLike> {
  engineState: T;
  setEngineState: React.Dispatch<React.SetStateAction<T>>;
  activePlayer: Player;
  rules: GameRulesOptions;
  addLog: (message: string, type?: GameEventLog['type'], playerId?: number) => void;
  setRevealStartingWildcard?: React.Dispatch<React.SetStateAction<Wildcard | null>>;
}

export function usePropertyActions<T extends EngineStateLike>({
  engineState,
  setEngineState,
  activePlayer,
  rules,
  addLog,
  setRevealStartingWildcard,
}: UsePropertyActionsProps<T>) {
  const { properties, players } = engineState;

  // --- DRAFT PHASE HANDLER ---
  const handleDraftProperty = useCallback(
    (propertyId: string, targetPlayerId?: number) => {
      const prop = properties.find((p) => p.id === propertyId);
      if (!prop) return;

      soundFx.playBuyProperty();

      setEngineState((prev) => {
        const pId = targetPlayerId !== undefined ? targetPlayerId : prev.gameState.activeTurnPlayerId;
        const draftingPlayer = prev.players.find((p) => p.id === pId) || prev.players[0];

        const newProps = prev.properties.map((p) =>
          p.id === propertyId ? { ...p, ownerId: draftingPlayer.id } : p
        );
        const newDraftPool = prev.draftPool.filter((p) => p.id !== propertyId);

        const nextPlayerId = (draftingPlayer.id + 1) % prev.players.length;
        const isDraftComplete = newDraftPool.length === 0 || draftingPlayer.id === prev.players.length - 1;

        let newPlayers = [...prev.players];
        let currentGS = { ...prev.gameState };

        if (isDraftComplete) {
          if (rules.coreActionDeck || rules.superWildcardDrop) {
            newPlayers = newPlayers.map((p) => {
              const { card, newGameState } = drawWildcard(currentGS, {
                includeCore: rules.coreActionDeck,
                includeSuper: rules.superWildcardDrop,
              });
              currentGS = newGameState;
              return card ? { ...p, wildcardsHand: [card] } : p;
            });
          }
          currentGS.gamePhase = 'IN_GAME';
          currentGS.activeTurnPlayerId = 0;
          currentGS.turnPhase = 'PRE_ROLL';

          if (setRevealStartingWildcard && newPlayers[0]?.wildcardsHand?.[0]) {
            setRevealStartingWildcard(newPlayers[0].wildcardsHand[0]);
          }
        } else {
          currentGS.activeTurnPlayerId = nextPlayerId;
        }

        return {
          ...prev,
          gameState: currentGS,
          players: newPlayers,
          properties: newProps,
          draftPool: newDraftPool,
        };
      });

      const pId = targetPlayerId !== undefined ? targetPlayerId : activePlayer.id;
      const draftingPlayer = players.find((p) => p.id === pId) || activePlayer;
      addLog(`🎯 ${draftingPlayer.name} drafted ${prop.name} for $0!`, 'success', draftingPlayer.id);
    },
    [properties, activePlayer, players, rules, addLog, setEngineState, setRevealStartingWildcard]
  );

  // Buy Property Action
  const handleBuyProperty = useCallback(
    (propertyId: string, withDiscount?: boolean) => {
      const prop = properties.find((p) => p.id === propertyId);
      if (!prop) return;

      const hasDiscountInHand = activePlayer.wildcardsHand.some(
        (w) => w.id === 'discount' || w.id === 'x2_discount'
      );
      const hasDiscountModifier = activePlayer.activeModifiers.some((m) => m.id === 'discount');
      const applyDiscount = !!(withDiscount || hasDiscountModifier || (withDiscount && hasDiscountInHand));

      const finalPrice = applyDiscount ? Math.floor(prop.basePrice / 2) : prop.basePrice;
      if (activePlayer.cash < finalPrice) return;

      soundFx.playBuyProperty();

      setEngineState((prev) => {
        const isDoubles = prev.gameState.lastDiceRoll && prev.gameState.lastDiceRoll[0] === prev.gameState.lastDiceRoll[1];
        const consecutiveDoubles = prev.gameState.consecutiveDoubles || 0;
        const nextTurnPhase = prev.gameState.turnPhase === 'RESOLVING_SPACE'
          ? (isDoubles && consecutiveDoubles > 0 && consecutiveDoubles < 3 && !activePlayer.inJail ? 'PRE_ROLL' : 'POST_ROLL')
          : prev.gameState.turnPhase;

        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            turnPhase: nextTurnPhase,
          },
          players: prev.players.map((p) => {
            if (p.id !== activePlayer.id) return p;
            let newHand = p.wildcardsHand;
            if (applyDiscount && !hasDiscountModifier && hasDiscountInHand) {
              const cardIdx = newHand.findIndex((w) => w.id === 'discount' || w.id === 'x2_discount');
              if (cardIdx !== -1) {
                newHand = [...newHand.slice(0, cardIdx), ...newHand.slice(cardIdx + 1)];
              }
            }
            return {
              ...p,
              cash: p.cash - finalPrice,
              wildcardsHand: newHand,
              activeModifiers: p.activeModifiers.filter((m) => m.id !== 'discount'),
            };
          }),
          properties: prev.properties.map((p) =>
            p.id === propertyId ? { ...p, ownerId: activePlayer.id } : p
          ),
        };
      });

      if (applyDiscount) {
        addLog(`🏷️ ${activePlayer.name} bought ${prop.name} with 50% DISCOUNT for $${finalPrice}!`, 'success', activePlayer.id);
      } else {
        addLog(`🏢 ${activePlayer.name} bought ${prop.name} for $${finalPrice}!`, 'success', activePlayer.id);
      }
    },
    [properties, activePlayer, addLog, setEngineState]
  );

  // Pass Property Action
  const handlePassProperty = useCallback(
    (propertyId: string) => {
      const prop = properties.find((p) => p.id === propertyId);
      const pName = prop ? prop.name : 'property';
      addLog(`🛑 ${activePlayer.name} passed on purchasing ${pName}.`, 'info', activePlayer.id);

      setEngineState((prev) => {
        const isDoubles = prev.gameState.lastDiceRoll && prev.gameState.lastDiceRoll[0] === prev.gameState.lastDiceRoll[1];
        const consecutiveDoubles = prev.gameState.consecutiveDoubles || 0;
        const nextTurnPhase = prev.gameState.turnPhase === 'RESOLVING_SPACE'
          ? (isDoubles && consecutiveDoubles > 0 && consecutiveDoubles < 3 && !activePlayer.inJail ? 'PRE_ROLL' : 'POST_ROLL')
          : prev.gameState.turnPhase;

        return {
          ...prev,
          gameState: {
            ...prev.gameState,
            turnPhase: nextTurnPhase,
          },
        };
      });
    },
    [properties, activePlayer, addLog, setEngineState]
  );

  // Build House Action
  const onBuildHouse = useCallback(
    (propId: string) => {
      if (rules.jailFrozenAssets && activePlayer.inJail) {
        addLog(`🔒 Assets Frozen in Jail! You cannot build or upgrade properties while incarcerated.`, 'warning', activePlayer.id);
        return;
      }
      const prop = properties.find((p) => p.id === propId);
      if (!prop || !prop.colorGroup || prop.houseCost === 0) return;

      // Monopoly validation: Player must own ALL properties in this color group
      const groupProps = properties.filter((p) => p.colorGroup === prop.colorGroup);
      const hasMonopoly = groupProps.length > 0 && groupProps.every((p) => p.ownerId === activePlayer.id);

      if (!hasMonopoly) {
        addLog(`⚠️ Cannot build on ${prop.name}! You must own all ${prop.colorGroup} properties first for a Monopoly.`, 'warning', activePlayer.id);
        return;
      }

      if (prop.hotel) {
        addLog(`⭐ ${prop.name} already has a Hotel! Maximum improvement reached.`, 'info', activePlayer.id);
        return;
      }

      if (activePlayer.cash < prop.houseCost) {
        addLog(`⚠️ Insufficient cash to build on ${prop.name}! Required: $${prop.houseCost}, Cash: $${activePlayer.cash}.`, 'warning', activePlayer.id);
        return;
      }

      // Uniform building validation: Cannot place Nth house until all properties have N-1 houses
      const isHotelUpgrade = prop.houses === 4;
      if (!isHotelUpgrade) {
        const targetHouseCount = prop.houses; // player is trying to build house #(targetHouseCount + 1)
        const hasUnevenBuilding = groupProps.some(
          (p) => (p.hotel ? 5 : p.houses) < targetHouseCount
        );
        if (hasUnevenBuilding) {
          addLog(
            `⚠️ Cannot build house #${targetHouseCount + 1} on ${prop.name}! Monopoly rules require uniform building: all ${prop.colorGroup} properties must have at least ${targetHouseCount} house${targetHouseCount === 1 ? '' : 's'} before adding another here.`,
            'warning',
            activePlayer.id
          );
          return;
        }
      }

      // Rule: Option for a hotel only when all properties in this color group have 4 houses on them
      if (isHotelUpgrade) {
        const allHave4Houses = groupProps.every((p) => p.houses >= 4 || p.hotel);
        if (!allHave4Houses) {
          addLog(`⚠️ Cannot buy hotel on ${prop.name}! All properties in the ${prop.colorGroup} set must have 4 houses before buying a hotel.`, 'warning', activePlayer.id);
          return;
        }
      }

      soundFx.playBuyProperty();
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === activePlayer.id ? { ...p, cash: p.cash - prop.houseCost } : p
        ),
        properties: prev.properties.map((p) => {
          if (p.id !== propId) return p;
          if (isHotelUpgrade) {
            return { ...p, houses: 5, hotel: true };
          }
          return { ...p, houses: Math.min(4, p.houses + 1), hotel: false };
        }),
      }));

      if (isHotelUpgrade) {
        addLog(`🏨 Upgraded to a standard Monopoly HOTEL on ${prop.name} for $${prop.houseCost}!`, 'success', activePlayer.id);
      } else {
        addLog(`🏠 Added physical Monopoly house #${prop.houses + 1} on ${prop.name} for $${prop.houseCost}.`, 'success', activePlayer.id);
      }
    },
    [rules.jailFrozenAssets, activePlayer, properties, addLog, setEngineState]
  );

  // Sell House Action
  const onSellHouse = useCallback(
    (propId: string) => {
      if (rules.jailFrozenAssets && activePlayer.inJail) {
        addLog(`🔒 Assets Frozen in Jail! You cannot sell buildings while incarcerated.`, 'warning', activePlayer.id);
        return;
      }
      const prop = properties.find((p) => p.id === propId);
      if (!prop || !prop.colorGroup || !prop.houseCost) return;
      if (!prop.hotel && (!prop.houses || prop.houses <= 0)) {
        addLog(`⚠️ No houses or hotel on ${prop.name} to sell!`, 'warning', activePlayer.id);
        return;
      }

      // Uniform breakdown validation: Player cannot sell from this property if other properties in the set have more houses/hotels
      const groupProps = properties.filter((p) => p.colorGroup === prop.colorGroup);
      const currentLevel = prop.hotel ? 5 : (prop.houses || 0);
      const hasHigherInGroup = groupProps.some(
        (p) => (p.hotel ? 5 : (p.houses || 0)) > currentLevel
      );
      if (hasHigherInGroup) {
        addLog(
          `⚠️ Cannot sell building on ${prop.name}! Monopoly rules require uniform breakdown: properties with more buildings in the ${prop.colorGroup} set must be sold down first.`,
          'warning',
          activePlayer.id
        );
        return;
      }

      const refund = Math.round(prop.houseCost / 2);
      soundFx.playCash();

      const hadHotel = prop.hotel;
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === activePlayer.id ? { ...p, cash: p.cash + refund } : p
        ),
        properties: prev.properties.map((p) => {
          if (p.id !== propId) return p;
          if (hadHotel) {
            return { ...p, houses: 4, hotel: false };
          }
          return { ...p, houses: Math.max(0, p.houses - 1), hotel: false };
        }),
      }));

      if (hadHotel) {
        addLog(`🏨 Sold HOTEL on ${prop.name} for +$${refund}! Downgraded to 4 houses.`, 'success', activePlayer.id);
      } else {
        addLog(`🏠 Sold house on ${prop.name} for +$${refund}! Current houses: ${prop.houses - 1}.`, 'success', activePlayer.id);
      }
    },
    [rules.jailFrozenAssets, activePlayer, properties, addLog, setEngineState]
  );

  // Mortgage Property Action
  const onMortgageProperty = useCallback(
    (propId: string) => {
      const prop = properties.find((p) => p.id === propId);
      if (!prop) return;

      if (prop.ownerId !== activePlayer.id) {
        addLog(`⚠️ You do not own ${prop.name}!`, 'warning', activePlayer.id);
        return;
      }

      if (prop.isMortgaged) {
        addLog(`⚠️ ${prop.name} is already mortgaged!`, 'warning', activePlayer.id);
        return;
      }

      if (prop.colorGroup) {
        const groupProps = properties.filter((p) => p.colorGroup === prop.colorGroup);
        const hasDevelopments = groupProps.some((p) => (p.houses && p.houses > 0) || p.hotel);
        if (hasDevelopments) {
          addLog(`⚠️ Cannot mortgage ${prop.name}: all properties in the ${prop.colorGroup} group must have all houses and hotels sold first!`, 'warning', activePlayer.id);
          return;
        }
      }

      soundFx.playCash();
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === activePlayer.id ? { ...p, cash: p.cash + prop.basePrice / 2 } : p
        ),
        properties: prev.properties.map((p) => (p.id === propId ? { ...p, isMortgaged: true } : p)),
      }));
      addLog(`🏦 Mortgaged ${prop.name} for +$${prop.basePrice / 2}.`, 'warning', activePlayer.id);
    },
    [properties, activePlayer, addLog, setEngineState]
  );

  // Unmortgage Property Action
  const onUnmortgageProperty = useCallback(
    (propId: string) => {
      const prop = properties.find((p) => p.id === propId);
      if (!prop) return;

      if (prop.ownerId !== activePlayer.id) {
        addLog(`⚠️ You do not own ${prop.name}!`, 'warning', activePlayer.id);
        return;
      }

      if (!prop.isMortgaged) {
        addLog(`⚠️ ${prop.name} is not mortgaged!`, 'warning', activePlayer.id);
        return;
      }

      const cost = Math.round((prop.basePrice / 2) * 1.1);
      if (activePlayer.cash < cost) {
        addLog(`⚠️ Insufficient funds to unmortgage ${prop.name} (requires $${cost}).`, 'warning', activePlayer.id);
        return;
      }

      soundFx.playCash();
      setEngineState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === activePlayer.id ? { ...p, cash: p.cash - cost } : p
        ),
        properties: prev.properties.map((p) => (p.id === propId ? { ...p, isMortgaged: false } : p)),
      }));
      addLog(`🏦 Unmortgaged ${prop.name} for -$${cost}.`, 'success', activePlayer.id);
    },
    [properties, activePlayer, addLog, setEngineState]
  );

  return {
    handleDraftProperty,
    handleBuyProperty,
    handlePassProperty,
    onBuildHouse,
    onSellHouse,
    onMortgageProperty,
    onUnmortgageProperty,
  };
}
