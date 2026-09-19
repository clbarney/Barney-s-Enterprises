import { Wildcard } from '@/types/monopoly';

export const ALL_WILDCARDS: Wildcard[] = [
  // CORE CARDS
  {
    id: 'extra_die',
    name: 'Extra Die',
    weight: 4,
    type: 'Core',
    duration: '1 Turn',
    description: 'Roll 3d6 instead of 2d6 for movement on your turn.',
    executionType: 'PRE_ROLL',
    targetRequired: 'NONE',
  },
  {
    id: 'one_die',
    name: 'One Die',
    weight: 3,
    type: 'Core',
    duration: '1 Turn',
    description: 'Roll 1d6 instead of 2d6 for movement on your turn.',
    executionType: 'PRE_ROLL',
    targetRequired: 'NONE',
  },
  {
    id: 'second_chance',
    name: 'Second Chance',
    weight: 1,
    type: 'Core',
    duration: '1 Turn',
    description: 'Reroll dice once if requested; enforce second result.',
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
  {
    id: 'free_rent',
    name: 'Free Rent',
    weight: 1,
    type: 'Core',
    duration: '1 Event',
    description: 'Active player pays $0 rent on landing. Bank pays owner the full rent value.',
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
  {
    id: 'crooked',
    name: 'Crooked',
    weight: 2,
    type: 'Core',
    duration: 'Active until landed',
    description: 'Attach to an owned property. Next rent landing pays 2x rent.',
    executionType: 'EVENT',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'discount',
    name: 'Discount',
    weight: 2,
    type: 'Core',
    duration: '1 Event',
    description: 'Buy landed unowned property at 50% discount.',
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
  {
    id: 'tax_exempt',
    name: 'Tax Exempt',
    weight: 2,
    type: 'Core',
    duration: '1 Event / Tax Day',
    description: 'Negates landing tax fees or exempts player from current Tax Day.',
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
  {
    id: 'single_forward',
    name: 'Single Forward',
    weight: 1,
    type: 'Core',
    duration: 'Pre or Post Roll',
    description: 'Move +1 space before or after rolling dice.',
    executionType: 'ANY_PHASE',
    targetRequired: 'NONE',
  },
  {
    id: 'two_forward',
    name: '2 Forward',
    weight: 1,
    type: 'Core',
    duration: 'Pre or Post Roll',
    description: 'Move +2 spaces before or after rolling dice.',
    executionType: 'ANY_PHASE',
    targetRequired: 'NONE',
  },
  {
    id: 'three_forward',
    name: '3 Forward',
    weight: 1,
    type: 'Core',
    duration: 'Pre or Post Roll',
    description: 'Move +3 spaces before or after rolling dice.',
    executionType: 'ANY_PHASE',
    targetRequired: 'NONE',
  },
  {
    id: 'five_forward',
    name: '5 Forward',
    weight: 1,
    type: 'Core',
    duration: 'Pre or Post Roll',
    description: 'Move +5 spaces before or after rolling dice.',
    executionType: 'ANY_PHASE',
    targetRequired: 'NONE',
  },
  {
    id: 'one_backward',
    name: 'One Move Backward',
    weight: 1,
    type: 'Core',
    duration: 'Pre or Post Roll',
    description: 'Move -1 space before or after rolling dice.',
    executionType: 'ANY_PHASE',
    targetRequired: 'NONE',
  },

  // SUPER CARDS
  {
    id: 'peak_hour',
    name: 'Peak Hour',
    weight: 1,
    type: 'Super',
    duration: 'Until Pass GO',
    description: 'Trains/Utilities pay 2x rent. If 0 owned: claim nearest open for free.',
    executionType: 'PRE_ROLL',
    targetRequired: 'NONE',
  },
  {
    id: 'free_ticket',
    name: 'Free Ticket',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Free transport to any Train space without paying ticket/rent fees.',
    executionType: 'EVENT',
    targetRequired: 'SPACE',
  },
  {
    id: 'depreciation',
    name: 'Depreciation',
    weight: 1,
    type: 'Super',
    duration: 'Instant (Draw)',
    description: 'Target opponent property loses up to 2 houses, or gets mortgaged if no houses.',
    executionType: 'INSTANT_DRAW',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'risk_taker',
    name: 'Risk-taker',
    weight: 1,
    type: 'Super',
    duration: 'Until Pass GO',
    description: 'Draw Chance/Community Chest every time passing or landing on one.',
    executionType: 'PRE_ROLL',
    targetRequired: 'NONE',
  },
  {
    id: 'hedge_fund',
    name: 'Hedge Fund',
    weight: 1,
    type: 'Super',
    duration: 'Until Pass GO',
    description: 'Attach to opponent monopoly. Receive 50% of accrued rents/sales ($0 if in Jail).',
    executionType: 'EVENT',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'property_roulette',
    name: 'Property Roulette',
    weight: 1,
    type: 'Super',
    duration: 'Instant (Draw)',
    description: 'Swap chosen owned property with next player in turn order OR go to Jail and forfeit next GO cash.',
    executionType: 'INSTANT_DRAW',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'flipping_business',
    name: 'Flipping Business',
    weight: 1,
    type: 'Super',
    duration: 'Until Pass GO',
    description: 'Reverse movement direction (move counter-clockwise).',
    executionType: 'PRE_ROLL',
    targetRequired: 'NONE',
  },
  {
    id: 'lottery_ticket',
    name: 'Lottery Ticket',
    weight: 1,
    type: 'Super',
    duration: 'Instant (Draw)',
    description: 'Claim entire lottery pool immediately. Reset lottery pool to $0.',
    executionType: 'INSTANT_DRAW',
    targetRequired: 'NONE',
  },
  {
    id: 'merger',
    name: 'Merger',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Instantly add 1 house to each property in an owned monopoly for $0.',
    executionType: 'EVENT',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'acquisition',
    name: 'Acquisition',
    weight: 1,
    type: 'Super',
    duration: 'Instant/Pre-Roll',
    description: 'Buy final missing property of a set from an owner for 2x base price.',
    executionType: 'PRE_ROLL',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'public_offering',
    name: 'Public Offering',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Play on new monopoly: all opponents must pay the bank for 1 house on your set.',
    executionType: 'EVENT',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'free_parking_teleport',
    name: 'Free Parking',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Teleport directly to Free Parking and trigger Free Parking logic.',
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
  {
    id: 'ufo',
    name: 'UFO',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Swap physical board positions with target player.',
    executionType: 'EVENT',
    targetRequired: 'PLAYER',
  },
  {
    id: 'vip',
    name: 'VIP',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: "Pay standard base rent on an opponent's upgraded monopoly (ignore houses/hotels).",
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
  {
    id: 'saturday_rates',
    name: 'Saturday Rates',
    weight: 1,
    type: 'Super',
    duration: 'Until Pass GO',
    description: 'Collect $100 from any player who lands on Free Parking.',
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
  {
    id: 'swindle',
    name: 'Swindle',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Swap an owned property with any remaining unowned board property.',
    executionType: 'EVENT',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'petty_theft',
    name: 'Petty Theft',
    weight: 1,
    type: 'Super',
    duration: 'Reactive',
    description: 'Play when opponent buys a property: steal ownership immediately for $0.',
    executionType: 'REACTIVE',
    targetRequired: 'PROPERTY',
  },
  {
    id: 'obstructing_injustice',
    name: 'Obstructing Injustice',
    weight: 1,
    type: 'Super',
    duration: 'Reactive',
    description: 'Cancel or block any played Super or Core card targeting you.',
    executionType: 'REACTIVE',
    targetRequired: 'NONE',
  },
  {
    id: 'snitch',
    name: 'Snitch',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Send targeted player directly to Jail.',
    executionType: 'EVENT',
    targetRequired: 'PLAYER',
  },
  {
    id: 'robbery',
    name: 'Robbery',
    weight: 1,
    type: 'Super',
    duration: 'Until Pass GO',
    description: 'Steal $100 from each player you pass on the board.',
    executionType: 'PRE_ROLL',
    targetRequired: 'NONE',
  },
  {
    id: 'power_trip',
    name: 'Power Trip',
    weight: 1,
    type: 'Super',
    duration: 'Until Pass GO',
    description: 'Earn Dice Roll x 10 cash per turn. (If Snake Eyes: Lose rolled amount).',
    executionType: 'PRE_ROLL',
    targetRequired: 'NONE',
  },
  {
    id: 'rent_evasion',
    name: 'Rent Evasion',
    weight: 1,
    type: 'Super',
    duration: 'Reactive',
    description: 'Play before rent payment: Owner pays YOU the rent amount instead.',
    executionType: 'REACTIVE',
    targetRequired: 'NONE',
  },
  {
    id: 'heist',
    name: 'Heist',
    weight: 1,
    type: 'Super',
    duration: 'Instant (Draw)',
    description: 'Instantly steal $150 from every active player.',
    executionType: 'INSTANT_DRAW',
    targetRequired: 'NONE',
  },
  {
    id: 'bail_jump',
    name: 'Bail Jump',
    weight: 1,
    type: 'Super',
    duration: '1 Event',
    description: 'Escape Jail for free and teleport to any space before Free Parking.',
    executionType: 'EVENT',
    targetRequired: 'NONE',
  },
];

// Helper to map legacy 'x#_' IDs to normalized IDs
export function normalizeWildcardId(id: string): string {
  const map: Record<string, string> = {
    x4_extra_die: 'extra_die',
    x3_one_die: 'one_die',
    x1_second_chance: 'second_chance',
    x2_crooked: 'crooked',
    x2_discount: 'discount',
    x2_tax_exempt: 'tax_exempt',
  };
  return map[id] || id;
}

// Generate wildcard deck with proportional probabilities and optional Core/Super/custom filtering:
// Extra Die (4x), One Die (3x), Crooked (2x), Discount (2x), Tax Exempt (2x), others (1x)
export function createWeightedWildcardDeck(options?: {
  includeCore?: boolean;
  includeSuper?: boolean;
  enabledWildcardIds?: string[];
}): Wildcard[] {
  const includeCore = options?.includeCore ?? true;
  const includeSuper = options?.includeSuper ?? true;
  const enabledIds = options?.enabledWildcardIds;
  const deck: Wildcard[] = [];

  ALL_WILDCARDS.forEach((card) => {
    if (card.type === 'Core' && !includeCore) return;
    if (card.type === 'Super' && !includeSuper) return;
    if (enabledIds && enabledIds.length > 0 && !enabledIds.includes(card.id)) return;
    const copies = card.weight || 1;
    for (let i = 0; i < copies; i++) {
      deck.push({ ...card });
    }
  });
  return deck;
}

export function shuffleDeck(deck: Wildcard[]): Wildcard[] {
  const copy = [...deck];
  // Multi-pass cryptographic Fisher-Yates shuffle for true randomization
  for (let pass = 0; pass < 3; pass++) {
    for (let i = copy.length - 1; i > 0; i--) {
      let randVal = Math.random();
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        randVal = buf[0] / 4294967296;
      }
      const j = Math.floor(randVal * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
  }
  return copy;
}
