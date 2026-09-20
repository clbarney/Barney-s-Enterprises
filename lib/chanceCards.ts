import { Player, Property, BoardSpace, GameEventLog } from '@/types/monopoly';

export interface ChanceCard {
  id: string;
  title: string;
  subTitle: string;
  description: string;
  actionType:
    | 'ADVANCE_TO_GO'
    | 'ADVANCE_TO_SPACE'
    | 'ADVANCE_TO_NEAREST_UTILITY'
    | 'ADVANCE_TO_NEAREST_RAILROAD'
    | 'BANK_DIVIDEND'
    | 'GET_OUT_OF_JAIL_FREE'
    | 'GO_BACK_3_SPACES'
    | 'GO_TO_JAIL'
    | 'GENERAL_REPAIRS'
    | 'POOR_TAX'
    | 'CHAIRMAN_OF_THE_BOARD'
    | 'BUILDING_LOAN_MATURES';
  targetSpaceIndex?: number;
  amount?: number;
}

export const ALL_CHANCE_CARDS: ChanceCard[] = [
  {
    id: 'chance_go',
    title: 'ADVANCE TO GO',
    subTitle: 'COLLECT $200',
    description: 'Advance to GO. Collect $200 salary as you pass.',
    actionType: 'ADVANCE_TO_GO',
    targetSpaceIndex: 0,
    amount: 200,
  },
  {
    id: 'chance_illinois',
    title: 'ADVANCE TO ILLINOIS AVE',
    subTitle: 'BOARDWALK EXPRESS',
    description: 'Advance to Illinois Ave. If you pass GO, collect $200.',
    actionType: 'ADVANCE_TO_SPACE',
    targetSpaceIndex: 24,
  },
  {
    id: 'chance_st_charles',
    title: 'ADVANCE TO ST. CHARLES PLACE',
    subTitle: 'PINK DISTRICT',
    description: 'Advance to St. Charles Place. If you pass GO, collect $200.',
    actionType: 'ADVANCE_TO_SPACE',
    targetSpaceIndex: 11,
  },
  {
    id: 'chance_utility',
    title: 'ADVANCE TO NEAREST UTILITY',
    subTitle: 'POWER & WATER',
    description: 'Advance to nearest Utility. If unowned, you may buy it. If owned, pay 10x dice roll.',
    actionType: 'ADVANCE_TO_NEAREST_UTILITY',
  },
  {
    id: 'chance_railroad',
    title: 'ADVANCE TO NEAREST RAILROAD',
    subTitle: 'TRANSIT EXPRESS',
    description: 'Advance to nearest Railroad. If unowned, you may buy it. If owned, pay 2x standard rent.',
    actionType: 'ADVANCE_TO_NEAREST_RAILROAD',
  },
  {
    id: 'chance_railroad_2',
    title: 'ADVANCE TO NEAREST RAILROAD',
    subTitle: 'TRANSIT EXPRESS',
    description: 'Advance to nearest Railroad. If unowned, you may buy it. If owned, pay 2x standard rent.',
    actionType: 'ADVANCE_TO_NEAREST_RAILROAD',
  },
  {
    id: 'chance_dividend',
    title: 'BANK PAYS YOU DIVIDEND',
    subTitle: 'INVESTMENT YIELD',
    description: 'Bank pays you dividend of $50.',
    actionType: 'BANK_DIVIDEND',
    amount: 50,
  },
  {
    id: 'chance_jail_free',
    title: 'GET OUT OF JAIL FREE',
    subTitle: 'EXEMPTION PASS',
    description: 'This card may be kept until needed or used instantly.',
    actionType: 'GET_OUT_OF_JAIL_FREE',
  },
  {
    id: 'chance_back_3',
    title: 'GO BACK 3 SPACES',
    subTitle: 'RETREAT 3 TILES',
    description: 'Move your token back 3 spaces immediately.',
    actionType: 'GO_BACK_3_SPACES',
  },
  {
    id: 'chance_go_to_jail',
    title: 'GO DIRECTLY TO JAIL',
    subTitle: 'DO NOT PASS GO',
    description: 'Go directly to Jail. Do not pass GO, do not collect $200.',
    actionType: 'GO_TO_JAIL',
    targetSpaceIndex: 10,
  },
  {
    id: 'chance_repairs',
    title: 'MAKE GENERAL REPAIRS',
    subTitle: 'PROPERTY ASSESSMENT',
    description: 'Make general repairs on all your property. For each house pay $25, for each hotel pay $100.',
    actionType: 'GENERAL_REPAIRS',
  },
  {
    id: 'chance_poor_tax',
    title: 'SPEEDING FINE',
    subTitle: 'TRAFFIC PENALTY',
    description: 'Speeding fine! Pay $15 to the Bank Vault.',
    actionType: 'POOR_TAX',
    amount: 15,
  },
  {
    id: 'chance_reading',
    title: 'TAKE A TRIP TO READING RAILROAD',
    subTitle: 'RAIL TRANSIT',
    description: 'Advance to Reading Railroad. If you pass GO, collect $200.',
    actionType: 'ADVANCE_TO_SPACE',
    targetSpaceIndex: 5,
  },
  {
    id: 'chance_chairman',
    title: 'CHAIRMAN OF THE BOARD',
    subTitle: 'BOARDROOM DUES',
    description: 'You have been elected Chairman of the Board. Pay each player $50.',
    actionType: 'CHAIRMAN_OF_THE_BOARD',
    amount: 50,
  },
  {
    id: 'chance_building_loan',
    title: 'BUILDING LOAN MATURES',
    subTitle: 'LOAN YIELD',
    description: 'Your building loan matures. Collect $150 from the Bank.',
    actionType: 'BUILDING_LOAN_MATURES',
    amount: 150,
  },
  {
    id: 'chance_boardwalk',
    title: 'ADVANCE TO BOARDWALK',
    subTitle: 'PRIME LUXURY',
    description: 'Advance to Boardwalk.',
    actionType: 'ADVANCE_TO_SPACE',
    targetSpaceIndex: 39,
  },
];

export function createChanceDeck(): { drawPile: ChanceCard[]; discardPile: ChanceCard[] } {
  // Shuffle cards
  const shuffled = [...ALL_CHANCE_CARDS].sort(() => Math.random() - 0.5);
  return {
    drawPile: shuffled,
    discardPile: [],
  };
}

export function drawChanceCard(deck: { drawPile: ChanceCard[]; discardPile: ChanceCard[] }): {
  card: ChanceCard;
  newDeck: { drawPile: ChanceCard[]; discardPile: ChanceCard[] };
} {
  let { drawPile, discardPile } = deck;
  if (!drawPile || drawPile.length === 0) {
    const cardsToShuffle = discardPile && discardPile.length > 0 ? discardPile : ALL_CHANCE_CARDS;
    drawPile = [...cardsToShuffle].sort(() => Math.random() - 0.5);
    discardPile = [];
  }
  const card = drawPile[0] || ALL_CHANCE_CARDS[0];
  const newDraw = drawPile.slice(1);
  return {
    card,
    newDeck: {
      drawPile: newDraw,
      discardPile: [...(discardPile || []), card],
    },
  };
}
