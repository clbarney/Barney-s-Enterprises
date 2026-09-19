import {
  GameState,
  Player,
  Property,
  BoardSpace,
  GameEventLog,
  EventHook,
  Wildcard,
  ColorGroup,
  TokenShape,
} from '@/types/monopoly';
import { INITIAL_BOARD_SPACES, INITIAL_PROPERTIES, COLOR_GROUP_COUNTS } from '@/lib/boardData';
import { ALL_WILDCARDS, createWeightedWildcardDeck, shuffleDeck } from '@/lib/wildcards';
import { assignDistinctTokens } from '@/lib/tokens';

export const PLAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B']; // Red, Blue, Green, Yellow
export const TOKEN_SHAPES: TokenShape[] = [
  'hat',
  'car',
  'ship',
  'thimble',
  'dog',
  'boot',
  'train',
  'crown',
];

export const AVATAR_PALETTE: { color: string; shape: 'cube' | 'sphere' | 'pyramid' | 'torus' | 'octahedron' }[] = [
  { color: '#EC4899', shape: 'sphere' },
  { color: '#06B6D4', shape: 'cube' },
  { color: '#10B981', shape: 'pyramid' },
  { color: '#F59E0B', shape: 'torus' },
  { color: '#8B5CF6', shape: 'octahedron' },
  { color: '#EF4444', shape: 'cube' },
];

/**
 * Generates a unique, colorful 3D avatar identifier (color & 3D shape) for a player.
 */
export function generatePlayerAvatar(index: number, name?: string): {
  avatarColor: string;
  avatarShape: 'cube' | 'sphere' | 'pyramid' | 'torus' | 'octahedron';
} {
  const item = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
  return {
    avatarColor: item.color,
    avatarShape: item.shape,
  };
}

function pseudoRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function seededShuffle<T>(array: T[], seed = 12345): T[] {
  const arr = [...array];
  const rand = pseudoRandom(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createInitialEngine(
  playerConfigs: { name: string; isAi: boolean; tokenShape?: TokenShape }[],
  options?: {
    startingCash?: number;
    startWithDraft?: boolean;
    coreActionDeck?: boolean;
    superWildcardDrop?: boolean;
    enabledWildcardIds?: string[];
  }
): {
  gameState: GameState;
  players: Player[];
  properties: Property[];
  boardSpaces: BoardSpace[];
  logs: GameEventLog[];
  eventHooks: EventHook[];
  draftPool: Property[];
} {
  const startingCash = options?.startingCash ?? 1500;
  const startWithDraft = options?.startWithDraft ?? true;
  const includeCore = options?.coreActionDeck ?? true;
  const includeSuper = options?.superWildcardDrop ?? true;
  const enabledWildcardIds = options?.enabledWildcardIds;
  const anyWildcardsEnabled = includeCore || includeSuper;

  // Randomize wildcard deck respecting rule filters
  const rawDeck = anyWildcardsEnabled
    ? createWeightedWildcardDeck({ includeCore, includeSuper, enabledWildcardIds })
    : [];
  const shuffledDeck = rawDeck.length > 0 ? shuffleDeck(rawDeck) : [];

  const preferredP1Shape = playerConfigs[0]?.tokenShape || 'hat';
  const assignedTokens = assignDistinctTokens(preferredP1Shape, playerConfigs.length);

  const players: Player[] = playerConfigs.map((cfg, idx) => {
    const avatar = generatePlayerAvatar(idx, cfg.name);
    return {
      id: idx,
      name: cfg.name || `Player ${idx + 1}`,
      color: PLAYER_COLORS[idx % PLAYER_COLORS.length],
      avatarColor: avatar.avatarColor,
      avatarShape: avatar.avatarShape,
      cash: startingCash,
      position: 0,
      inJail: false,
      jailTurns: 0,
      lapsCompleted: 0,
      wildcardsHand: [],
      activeModifiers: [],
      monopolyChallengeUsed: false,
      taxExempt: false,
      isBankrupt: false,
      isAi: cfg.isAi,
      consecutiveDoubles: 0,
      goldenDealActive: false,
      tokenShape: cfg.tokenShape || assignedTokens[idx] || TOKEN_SHAPES[idx % TOKEN_SHAPES.length],
    };
  });

  // Filter valid draft properties (explicitly exclude DarkBlue, Brown, Railroad, and Utility)
  const eligibleDraftProperties = INITIAL_PROPERTIES.filter(
    (p) => !['Brown', 'DarkBlue', 'Railroad', 'Utility'].includes(p.colorGroup)
  );
  // Randomly shuffle eligible properties and select exactly players.length cards for the draft pool
  const shuffledDraftProperties = seededShuffle(eligibleDraftProperties, Date.now() % 100000);
  const draftPool = startWithDraft ? shuffledDraftProperties.slice(0, players.length) : [];

  // All properties start unowned for the opening draft
  const allInitialProps = INITIAL_PROPERTIES.map((p) => ({ ...p, ownerId: null }));

  let tempDeck = shuffledDeck;
  if (anyWildcardsEnabled) {
    players.forEach((player) => {
      // Give each player 1 starting wildcard if wildcards are enabled
      if (tempDeck.length > 0) {
        player.wildcardsHand.push(tempDeck[0]);
        tempDeck = tempDeck.slice(1);
      }
    });
  }

  const gameState: GameState = {
    timerSeconds: 0,
    gamePhase: startWithDraft ? 'DRAFT' : 'IN_GAME',
    bankerLapCounter: 0,
    lotteryPool: 200,
    activeTurnPlayerId: startWithDraft ? players.length - 1 : 0,
    turnPhase: 'PRE_ROLL',
    goldenDealPlayerId: null,
    saturdayRatesPlayerId: null,
    wildcardDeck: {
      drawPile: tempDeck,
      discardPile: [],
    },
    lastDiceRoll: null,
    isSnakeEyes: false,
    consecutiveDoubles: 0,
    spreeTriggered: false,
    winnerId: null,
    hasTaxOccurred: false,
    turnCount: 1,
  };

  const logs: GameEventLog[] = [
    {
      id: 'log_init',
      timestamp: '00:00:00',
      message: startWithDraft
        ? 'Opening Property Draft! Each player chooses a face-down property card.'
        : 'Welcome to Barney\'s 3D Monopoly! Roll the dice to begin your turn.',
      type: 'info',
    },
  ];

  return {
    gameState,
    players,
    properties: allInitialProps,
    boardSpaces: [...INITIAL_BOARD_SPACES],
    logs,
    eventHooks: [],
    draftPool,
  };
}

// Draw wildcard helper
export function drawWildcard(
  gameState: GameState,
  options?: { includeCore?: boolean; includeSuper?: boolean; enabledWildcardIds?: string[] }
): { card: Wildcard | null; newGameState: GameState } {
  let { drawPile, discardPile } = gameState.wildcardDeck;
  if (drawPile.length === 0) {
    if (discardPile.length === 0) {
      const includeCore = options?.includeCore ?? true;
      const includeSuper = options?.includeSuper ?? true;
      const enabledWildcardIds = options?.enabledWildcardIds;
      if (!includeCore && !includeSuper) {
        return { card: null, newGameState: gameState };
      }
      drawPile = shuffleDeck(createWeightedWildcardDeck({ includeCore, includeSuper, enabledWildcardIds }));
    } else {
      drawPile = shuffleDeck(discardPile);
      discardPile = [];
    }
  }
  if (drawPile.length === 0) {
    return { card: null, newGameState: gameState };
  }
  const card = drawPile[0];
  const newDrawPile = drawPile.slice(1);
  return {
    card,
    newGameState: {
      ...gameState,
      wildcardDeck: {
        drawPile: newDrawPile,
        discardPile,
      },
    },
  };
}

export interface TaxBillBreakdownItem {
  category: string;
  count: number;
  ratePerUnit: number;
  subtotal: number;
  note?: string;
}

export interface TaxBillResult {
  totalTax: number;
  breakdown: string;
  isExempt: boolean;
  items: TaxBillBreakdownItem[];
  utilityCredit: number;
  rawTaxBeforeCredits: number;
}

// Calculate tax bill with detailed itemization
export function calculateTaxBill(player: Player, properties: Property[]): TaxBillResult {
  if (player.taxExempt) {
    return {
      totalTax: 0,
      breakdown: 'Player holds active Tax Exempt status!',
      isExempt: true,
      items: [],
      utilityCredit: 0,
      rawTaxBeforeCredits: 0,
    };
  }

  let totalTax = 0;
  const playerProps = properties.filter((p) => p.ownerId === player.id && !p.isMortgaged);
  let utilityCount = 0;
  let railroadCount = 0;
  let side1Count = 0;
  let side2Count = 0;
  let side3Count = 0;
  let side4Count = 0;
  let totalHouses = 0;
  let totalHotels = 0;

  playerProps.forEach((p) => {
    if (p.colorGroup === 'Railroad') {
      railroadCount++;
      totalTax += 5;
    } else if (p.colorGroup === 'Utility') {
      utilityCount++;
    } else {
      if (p.side === 1) {
        side1Count++;
        totalTax += 5;
      } else if (p.side === 2) {
        side2Count++;
        totalTax += 10;
      } else if (p.side === 3) {
        side3Count++;
        totalTax += 15;
      } else if (p.side === 4) {
        side4Count++;
        totalTax += 20;
      }

      if (p.houses === 5) {
        totalHotels++;
        totalTax += 25; // hotel rate
      } else if (p.houses > 0) {
        totalHouses += p.houses;
        totalTax += p.houses * 5;
      }
    }
  });

  const rawTax = totalTax;
  const utilityCredit = utilityCount > 0 ? 40 * utilityCount : 0;
  const netTax = Math.max(0, rawTax - utilityCredit);

  const items: TaxBillBreakdownItem[] = [];
  if (side1Count > 0) items.push({ category: 'Side 1 (Brown / Light Blue)', count: side1Count, ratePerUnit: 5, subtotal: side1Count * 5 });
  if (side2Count > 0) items.push({ category: 'Side 2 (Pink / Orange)', count: side2Count, ratePerUnit: 10, subtotal: side2Count * 10 });
  if (side3Count > 0) items.push({ category: 'Side 3 (Red / Yellow)', count: side3Count, ratePerUnit: 15, subtotal: side3Count * 15 });
  if (side4Count > 0) items.push({ category: 'Side 4 (Green / Dark Blue)', count: side4Count, ratePerUnit: 20, subtotal: side4Count * 20 });
  if (railroadCount > 0) items.push({ category: 'Railroad Depots', count: railroadCount, ratePerUnit: 5, subtotal: railroadCount * 5 });
  if (totalHouses > 0) items.push({ category: 'Developed Houses', count: totalHouses, ratePerUnit: 5, subtotal: totalHouses * 5 });
  if (totalHotels > 0) items.push({ category: 'Luxury Hotels', count: totalHotels, ratePerUnit: 25, subtotal: totalHotels * 25 });
  if (utilityCount > 0) items.push({ category: 'Utility Green Rebate', count: utilityCount, ratePerUnit: -40, subtotal: -utilityCredit, note: 'Utility owners receive clean-energy green rebates' });

  return {
    totalTax: netTax,
    breakdown: `Portfolio Tax: $${netTax} (${playerProps.length} props, ${totalHouses} houses, ${totalHotels} hotels)`,
    isExempt: false,
    items,
    utilityCredit,
    rawTaxBeforeCredits: rawTax,
  };
}

// Check Monopoly completion
export function checkMonopoly(ownerId: number, colorGroup: ColorGroup, properties: Property[]): boolean {
  if (colorGroup === 'Railroad' || colorGroup === 'Utility') return false;
  const required = COLOR_GROUP_COUNTS[colorGroup];
  const owned = properties.filter((p) => p.colorGroup === colorGroup && p.ownerId === ownerId).length;
  return owned === required;
}

// Calculate property Rent
export function calculateRent(
  property: Property,
  properties: Property[],
  owner: Player | null,
  diceTotal: number,
  isVip: boolean = false
): number {
  if (!owner || property.ownerId === null || property.isMortgaged) return 0;
  if (owner.inJail) return 0;

  let rent = 0;
  if (property.colorGroup === 'Railroad') {
    const ownedRailroads = properties.filter((p) => p.colorGroup === 'Railroad' && p.ownerId === owner.id && !p.isMortgaged).length;
    const baseRents = [0, 25, 50, 100, 200];
    rent = baseRents[ownedRailroads] || 25;
  } else if (property.colorGroup === 'Utility') {
    const ownedUtilities = properties.filter((p) => p.colorGroup === 'Utility' && p.ownerId === owner.id && !p.isMortgaged).length;
    const multiplier = ownedUtilities === 2 ? 10 : 4;
    rent = (diceTotal || 7) * multiplier;
  } else if (isVip) {
    rent = property.baseRent;
  } else if (property.hotel) {
    rent = property.rentLevels[5];
  } else if (property.houses > 0) {
    rent = property.rentLevels[property.houses];
  } else {
    const hasMonopoly = checkMonopoly(owner.id, property.colorGroup, properties);
    rent = hasMonopoly ? property.baseRent * 2 : property.baseRent;
  }

  // x2 Crooked Multiplier: Doubles next rent payment
  if (property.isCrooked || property.modifiedBy?.includes('crooked')) {
    rent *= 2;
  }

  // Peak Hour Multiplier: Doubles transit and utility rent for owner
  if (owner.activeModifiers?.some((m) => m.id === 'peak_hour') && (property.colorGroup === 'Railroad' || property.colorGroup === 'Utility')) {
    rent *= 2;
  }

  return rent;
}

// Spree Evaluation
export function executeSpreeEvent(
  players: Player[],
  properties: Property[],
  logs: GameEventLog[]
): { properties: Property[]; logs: GameEventLog[] } {
  const updatedProps = [...properties];
  const newLogs = [...logs];

  newLogs.push({
    id: `log_spree_${Date.now()}`,
    timestamp: new Date().toLocaleTimeString(),
    message: '⚡ THE GREAT MONOPOLY SPREE TRIGGERED! Unowned color group properties granted to leaders, free houses awarded!',
    type: 'rule',
  });

  const colorGroups: ColorGroup[] = ['Brown', 'LightBlue', 'Pink', 'Orange', 'Red', 'Yellow', 'Green', 'DarkBlue'];

  players.forEach((player) => {
    if (player.isBankrupt) return;

    colorGroups.forEach((group) => {
      const groupProps = updatedProps.filter((p) => p.colorGroup === group);
      const ownedByPlayer = groupProps.filter((p) => p.ownerId === player.id);
      const threshold = group === 'Brown' || group === 'DarkBlue' ? 1 : 2;

      if (ownedByPlayer.length >= threshold) {
        groupProps.forEach((p) => {
          if (p.ownerId === null) {
            p.ownerId = player.id;
            p.isMortgaged = false;
            newLogs.push({
              id: `log_spree_grant_${p.id}`,
              timestamp: new Date().toLocaleTimeString(),
              message: `⚡ ${player.name} granted ${p.name} for FREE via Spree!`,
              type: 'success',
              playerId: player.id,
            });
          }
        });
      }
    });
  });

  players.forEach((player) => {
    if (player.isBankrupt) return;
    colorGroups.forEach((group) => {
      if (checkMonopoly(player.id, group, updatedProps)) {
        updatedProps
          .filter((p) => p.colorGroup === group && p.ownerId === player.id)
          .forEach((p) => {
            if (p.isMortgaged) {
              p.isMortgaged = false;
            }
            if (!p.hotel && p.houses < 4) {
              p.houses++;
            } else if (p.houses === 4) {
              p.houses = 5;
              p.hotel = true;
            }
          });
      }
    });
  });

  return { properties: updatedProps, logs: newLogs };
}

// Endgame Evaluation
export function evaluateEndgame(
  players: Player[],
  properties: Property[]
): { standings: { player: Player; portfolioValue: number }[]; winner: Player } {
  const standings = players.map((player) => {
    if (player.isBankrupt) return { player, portfolioValue: 0 };

    let value = player.cash;
    properties.forEach((p) => {
      if (p.ownerId === player.id) {
        if (!p.isMortgaged) {
          value += p.basePrice;
          value += p.houses * p.houseCost;
          value += p.baseRent;
        }
      }
    });
    return { player, portfolioValue: value };
  });

  standings.sort((a, b) => b.portfolioValue - a.portfolioValue);
  return { standings, winner: standings[0].player };
}
