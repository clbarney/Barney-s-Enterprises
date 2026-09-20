import { Player, Property, BoardSpace, GameEventLog } from '@/types/monopoly';

export interface CommunityChestCard {
  id: string;
  title: string;
  subTitle: string;
  description: string;
  actionType:
    | 'ADVANCE_TO_GO'
    | 'BANK_ERROR'
    | 'DOCTOR_FEE'
    | 'SALE_OF_STOCK'
    | 'GET_OUT_OF_JAIL_FREE'
    | 'GO_TO_JAIL'
    | 'HOLIDAY_FUND'
    | 'INCOME_TAX_REFUND'
    | 'BIRTHDAY'
    | 'LIFE_INSURANCE'
    | 'HOSPITAL_FEES'
    | 'SCHOOL_FEES'
    | 'CONSULTANCY_FEE'
    | 'STREET_REPAIRS'
    | 'BEAUTY_CONTEST'
    | 'INHERITANCE';
  targetSpaceIndex?: number;
  amount?: number;
}

export const ALL_COMMUNITY_CHEST_CARDS: CommunityChestCard[] = [
  {
    id: 'chest_go',
    title: 'ADVANCE TO GO',
    subTitle: 'COLLECT $200',
    description: 'Advance to GO. Collect $200 salary as you pass.',
    actionType: 'ADVANCE_TO_GO',
    targetSpaceIndex: 0,
    amount: 200,
  },
  {
    id: 'chest_bank_error',
    title: 'BANK ERROR IN YOUR FAVOR',
    subTitle: 'TREASURY PAYOUT',
    description: 'Bank error in your favor. Collect $200 from the Bank.',
    actionType: 'BANK_ERROR',
    amount: 200,
  },
  {
    id: 'chest_doctor_fee',
    title: "DOCTOR'S FEE",
    subTitle: 'MEDICAL EXPENSE',
    description: "Doctor's fee! Pay $50 to the Bank.",
    actionType: 'DOCTOR_FEE',
    amount: 50,
  },
  {
    id: 'chest_stock_sale',
    title: 'FROM SALE OF STOCK YOU GET $50',
    subTitle: 'INVESTMENT GAIN',
    description: 'From sale of stock you get $50.',
    actionType: 'SALE_OF_STOCK',
    amount: 50,
  },
  {
    id: 'chest_jail_free',
    title: 'GET OUT OF JAIL FREE',
    subTitle: 'EXEMPTION PASS',
    description: 'This card may be kept until needed or used instantly.',
    actionType: 'GET_OUT_OF_JAIL_FREE',
  },
  {
    id: 'chest_go_to_jail',
    title: 'GO DIRECTLY TO JAIL',
    subTitle: 'DO NOT PASS GO',
    description: 'Go directly to Jail. Do not pass GO, do not collect $200.',
    actionType: 'GO_TO_JAIL',
    targetSpaceIndex: 10,
  },
  {
    id: 'chest_holiday_fund',
    title: 'HOLIDAY FUND MATURES',
    subTitle: 'SAVINGS PAYOUT',
    description: 'Holiday Fund matures. Receive $100.',
    actionType: 'HOLIDAY_FUND',
    amount: 100,
  },
  {
    id: 'chest_tax_refund',
    title: 'INCOME TAX REFUND',
    subTitle: 'REVENUE REFUND',
    description: 'Income tax refund. Collect $20 from the Treasury.',
    actionType: 'INCOME_TAX_REFUND',
    amount: 20,
  },
  {
    id: 'chest_birthday',
    title: 'IT IS YOUR BIRTHDAY',
    subTitle: 'PARTY CELEBRATION',
    description: 'It is your birthday! Collect $10 from every player.',
    actionType: 'BIRTHDAY',
    amount: 10,
  },
  {
    id: 'chest_life_insurance',
    title: 'LIFE INSURANCE MATURES',
    subTitle: 'POLICY PAYOUT',
    description: 'Life insurance matures. Collect $100.',
    actionType: 'LIFE_INSURANCE',
    amount: 100,
  },
  {
    id: 'chest_hospital_fees',
    title: 'PAY HOSPITAL FEES OF $100',
    subTitle: 'HEALTHCARE CHARGE',
    description: 'Pay hospital fees of $100 to the Bank.',
    actionType: 'HOSPITAL_FEES',
    amount: 100,
  },
  {
    id: 'chest_school_fees',
    title: 'PAY SCHOOL FEES OF $50',
    subTitle: 'TUITION EXPENSE',
    description: 'Pay school fees of $50 to the Bank.',
    actionType: 'SCHOOL_FEES',
    amount: 50,
  },
  {
    id: 'chest_consultancy_fee',
    title: 'RECEIVE $25 CONSULTANCY FEE',
    subTitle: 'ADVISORY YIELD',
    description: 'Receive $25 consultancy fee for expert services.',
    actionType: 'CONSULTANCY_FEE',
    amount: 25,
  },
  {
    id: 'chest_street_repairs',
    title: 'ASSESSED FOR STREET REPAIRS',
    subTitle: 'MUNICIPAL WORK',
    description: 'You are assessed for street repairs. Pay $40 per house and $115 per hotel.',
    actionType: 'STREET_REPAIRS',
  },
  {
    id: 'chest_beauty_contest',
    title: 'SECOND PRIZE IN BEAUTY CONTEST',
    subTitle: 'PAGEANT AWARD',
    description: 'You have won second prize in a beauty contest. Collect $10.',
    actionType: 'BEAUTY_CONTEST',
    amount: 10,
  },
  {
    id: 'chest_inheritance',
    title: 'YOU INHERIT $100',
    subTitle: 'ESTATE BEQUEST',
    description: 'You inherit $100 from a wealthy relative.',
    actionType: 'INHERITANCE',
    amount: 100,
  },
];

export function createCommunityChestDeck(): { drawPile: CommunityChestCard[]; discardPile: CommunityChestCard[] } {
  const shuffled = [...ALL_COMMUNITY_CHEST_CARDS].sort(() => Math.random() - 0.5);
  return {
    drawPile: shuffled,
    discardPile: [],
  };
}

export function drawCommunityChestCard(deck: { drawPile: CommunityChestCard[]; discardPile: CommunityChestCard[] }): {
  card: CommunityChestCard;
  newDeck: { drawPile: CommunityChestCard[]; discardPile: CommunityChestCard[] };
} {
  let { drawPile, discardPile } = deck;
  if (!drawPile || drawPile.length === 0) {
    const cardsToShuffle = discardPile && discardPile.length > 0 ? discardPile : ALL_COMMUNITY_CHEST_CARDS;
    drawPile = [...cardsToShuffle].sort(() => Math.random() - 0.5);
    discardPile = [];
  }
  const card = drawPile[0] || ALL_COMMUNITY_CHEST_CARDS[0];
  const newDraw = drawPile.slice(1);
  return {
    card,
    newDeck: {
      drawPile: newDraw,
      discardPile: [...(discardPile || []), card],
    },
  };
}
