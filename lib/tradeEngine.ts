import { ColorGroup, Player, Property, TradeOffer, AIPersonality, RentConcession } from '@/types/monopoly';

export type PropertyTier = 'TIER_S' | 'TIER_A' | 'TIER_B' | 'TIER_C';

export interface PropertyValuationReport {
  propertyId: string;
  propertyName: string;
  colorGroup: ColorGroup;
  tier: PropertyTier;
  baseFacePrice: number;
  markovMultiplier: number;
  markovValue: number;
  monopolyCompletionBonus: number;
  blockerBonus: number;
  mortgagePenalty: number;
  housesValue: number;
  housesCount: number;
  hasHotel: boolean;
  groupHasHouses: boolean;
  groupPropertyIds: string[];
  finalPerceivedValue: number;
  lore: string;
  isBlocker: boolean;
  completesMonopoly: boolean;
}

export interface TradeEvaluationResult {
  verdict: 'ACCEPT' | 'REJECT' | 'COUNTER';
  deltaV: number; // Received - Given
  perceivedReceivedValue: number;
  perceivedGivenValue: number;
  ratio: number; // Received / Given
  requiredLeewayRatio: number;
  evaluatorPersonality: AIPersonality;
  isExistentialThreat: boolean;
  isConcedingBlockerForCash: boolean;
  summaryReason: string;
  detailedAnalysis: string[];
  sweetenersOffered: string[];
  counterOffer?: TradeOffer;
  receivedBreakdown: {
    cashValue: number;
    nominalCash: number;
    propertiesValuation: PropertyValuationReport[];
    rentConcessionsValue: number;
  };
  givenBreakdown: {
    cashValue: number;
    nominalCash: number;
    propertiesValuation: PropertyValuationReport[];
    rentConcessionsValue: number;
  };
}

// Color group member counts in standard Monopoly
export const COLOR_GROUP_COUNTS: Record<ColorGroup, number> = {
  Brown: 2,
  LightBlue: 3,
  Pink: 3,
  Orange: 3,
  Red: 3,
  Yellow: 3,
  Green: 3,
  DarkBlue: 2,
  Railroad: 4,
  Utility: 2,
};

// ROI / Development Speed Ranking (Higher = Faster Kill Threat)
export const COLOR_ROI_SPEED_RANK: Record<ColorGroup, number> = {
  Orange: 10,    // Post-jail 6/8/9 kill zone, $100 houses
  LightBlue: 9, // Ultra-cheap $50 house rush early game
  Red: 8,       // Illinois #1 visited, Chance redirects, $150
  Yellow: 7,    // Strong midgame, $150 houses
  Pink: 6,      // Moderate cost, post-jail early lane
  DarkBlue: 5,  // Fatal rent but $200 houses high capital trap
  Brown: 4,     // Cheap starvation, low max rent
  Green: 3,     // $200/house, $600/set capital trap
  Railroad: 2,  // No development, flat scaling
  Utility: 1,   // Weak late game
};

/**
 * Maps a property's color group to its strategic Markov ROI tier.
 */
export function getPropertyTier(colorGroup: ColorGroup): PropertyTier {
  switch (colorGroup) {
    case 'Orange':
    case 'Red':
      return 'TIER_S';
    case 'Yellow':
    case 'LightBlue':
    case 'Railroad':
      return 'TIER_A';
    case 'DarkBlue':
    case 'Pink':
    case 'Green':
      return 'TIER_B';
    case 'Brown':
    case 'Utility':
    default:
      return 'TIER_C';
  }
}

/**
 * Calculates cash required to reach the catastrophic 3-house sweet spot on every street in the set.
 */
export function calculateSet3HouseCost(colorGroup: ColorGroup, properties: Property[]): number {
  const groupProps = properties.filter((p) => p.colorGroup === colorGroup);
  if (groupProps.length === 0 || colorGroup === 'Railroad' || colorGroup === 'Utility') return 0;
  const houseCost = groupProps[0].houseCost;
  return groupProps.length * 3 * houseCost;
}

/**
 * Computes a player's total net worth (cash + unmortgaged properties + 50% mortgaged + house costs).
 */
export function calculatePlayerNetWorth(player: Player, properties: Property[]): number {
  if (player.isBankrupt) return 0;
  let netWorth = player.cash;
  properties.forEach((p) => {
    if (p.ownerId === player.id) {
      if (p.isMortgaged) {
        netWorth += p.basePrice / 2;
      } else {
        netWorth += p.basePrice;
        netWorth += p.houses * p.houseCost;
      }
    }
  });
  return netWorth;
}

/**
 * Checks if a property acts as a single blocker preventing an opponent from finishing a monopoly.
 */
export function isBlockerProperty(
  property: Property,
  holderPlayerId: number,
  targetPlayerId: number,
  allProperties: Property[]
): boolean {
  if (property.colorGroup === 'Railroad' || property.colorGroup === 'Utility') return false;
  const groupProps = allProperties.filter((p) => p.colorGroup === property.colorGroup);
  const targetOwnedCount = groupProps.filter((p) => p.ownerId === targetPlayerId).length;
  const required = COLOR_GROUP_COUNTS[property.colorGroup];

  // Target owns all others in the group except this one
  return targetOwnedCount === required - 1 && property.ownerId === holderPlayerId;
}

/**
 * Checks if acquiring this property completes a monopoly for the receiving player.
 */
export function willCompleteMonopoly(
  property: Property,
  receiverId: number,
  allProperties: Property[]
): boolean {
  if (property.colorGroup === 'Railroad' || property.colorGroup === 'Utility') return false;
  const groupProps = allProperties.filter((p) => p.colorGroup === property.colorGroup);
  const receiverCurrentOwned = groupProps.filter((p) => p.ownerId === receiverId).length;
  const required = COLOR_GROUP_COUNTS[property.colorGroup];
  return receiverCurrentOwned === required - 1;
}

/**
 * Determines a player's effective AI personality based on game state and bankroll.
 * If in bottom 20% of net worth or cash < $150 under threat, shifts dynamically to DESPERATE SURVIVOR.
 */
export function determineEffectivePersonality(
  player: Player,
  basePersonality: AIPersonality,
  allPlayers: Player[],
  allProperties: Property[]
): AIPersonality {
  const activePlayers = allPlayers.filter((p) => !p.isBankrupt);
  if (activePlayers.length <= 1) return basePersonality;

  const totalGameNetWorth = activePlayers.reduce((acc, p) => acc + calculatePlayerNetWorth(p, allProperties), 0);
  const playerNW = calculatePlayerNetWorth(player, allProperties);
  const share = totalGameNetWorth > 0 ? playerNW / totalGameNetWorth : 0.25;

  // If player holds less than 18% of global wealth or cash < $150 while others have monopolies
  const opponentsHaveMonopolies = allProperties.some((p) => p.ownerId !== null && p.ownerId !== player.id && p.houses > 0);
  if ((share < 0.18 || player.cash < 150) && opponentsHaveMonopolies) {
    return 'DESPERATE';
  }

  return basePersonality;
}

/**
 * Phase 1 & 2: Evaluate a single property asset with Markov landing matrices and dynamic context.
 */
export function evaluatePropertyAsset(
  property: Property,
  giver: Player,
  receiver: Player,
  isEvaluatorGiver: boolean,
  allProperties: Property[],
  turnCount: number
): PropertyValuationReport {
  const tier = getPropertyTier(property.colorGroup);
  const basePrice = property.basePrice;
  let markovMultiplier = 1.0;
  let lore = '';

  // 1. Base Markov & Landing Frequency Multipliers
  switch (property.colorGroup) {
    case 'Orange':
      // 6, 8, 9 spaces out from Jail. Highest frequency landing zone in the game; cheap $100 build.
      markovMultiplier = 2.85;
      lore = 'Kill Zone (6,8,9 out from Jail; $100 house rush)';
      break;
    case 'Red':
      // High traffic via Chance redirects; Illinois is #1 visited property.
      markovMultiplier = 2.40;
      lore = 'High Traffic (Chance redirects & Illinois #1 visited)';
      break;
    case 'Yellow':
      // Strong mid-game kill threat; $150 house cost.
      markovMultiplier = 2.00;
      lore = 'Mid-Game Kill Threat ($150 house build tier)';
      break;
    case 'LightBlue':
      // Ultra-cheap house rush ($50/house). Lethal in early game to starve opponents of cash.
      markovMultiplier = 1.90;
      lore = 'Ultra-Cheap House Rush ($50/house starvation)';
      break;
    case 'Railroad': {
      // Scales exponentially with count owned by the receiver post-trade
      const receiverCurrentRRs = allProperties.filter(
        (p) => p.colorGroup === 'Railroad' && p.ownerId === receiver.id && p.id !== property.id
      ).length;
      const futureRRs = receiverCurrentRRs + 1;
      const rrMultipliers = [0.35, 0.65, 1.35, 2.85]; // Scales from $70 up to $570 for complete 4
      markovMultiplier = rrMultipliers[Math.min(3, futureRRs - 1)];
      lore = `Railroad Network (${futureRRs}/4 owned; scales non-linearly)`;
      break;
    }
    case 'DarkBlue':
      // Fatal when built, but $200/house creates bankruptcy risk for cash-poor players.
      if (receiver.cash < 350) {
        markovMultiplier = 1.25; // Capital trap discount
        lore = 'Capital Trap Risk (Under $350 cash reserves)';
      } else if (receiver.cash > 800) {
        markovMultiplier = 1.75; // Lethal execution potential
        lore = 'Lethal Luxury Monopoly ($800+ cash reserves)';
      } else {
        markovMultiplier = 1.50;
        lore = 'Boardwalk Luxury Threat ($200 house build)';
      }
      break;
    case 'Green':
      // Expensive trap ($200/house, $600/set). Deprioritize unless flush with cash.
      if (receiver.cash > 900) {
        markovMultiplier = 1.35;
        lore = 'Late-Game Powerhouse ($900+ cash reserves)';
      } else {
        markovMultiplier = 1.10;
        lore = 'Capital Trap ($200/house, $600/set steep hurdle)';
      }
      break;
    case 'Pink':
      markovMultiplier = 1.55;
      lore = 'Post-Jail Stepping Stone ($100 house tier)';
      break;
    case 'Brown':
      // Early game useful for house starvation; collapses post-turn 15
      if (turnCount <= 15) {
        markovMultiplier = 1.35;
        lore = 'Early-Game House Starvation Weapon ($50 houses)';
      } else {
        markovMultiplier = 0.75;
        lore = 'Late-Game Low Ceiling (Negligible max rent)';
      }
      break;
    case 'Utility':
      // Collapses rapidly after turn 15
      if (turnCount <= 15) {
        markovMultiplier = 1.00;
        lore = 'Early Utility Cashflow ($70 average rent)';
      } else {
        markovMultiplier = 0.50;
        lore = 'Late-Game Depreciation (Collapses after turn 15)';
      }
      break;
  }

  let markovValue = basePrice * markovMultiplier;

  // 2. Existing Improvements Valuation (Houses / Hotels)
  // Factoring in full replacement equity + exponential rent-generating power of houses/hotel
  const housesCount = property.hotel ? 5 : (property.houses || 0);
  const houseBaseCost = housesCount * (property.houseCost || 0);
  const houseRentYieldMultiplier = housesCount > 0 ? (1 + 0.20 * Math.min(4, housesCount)) : 1.0;
  const housesValue = Math.round(houseBaseCost * houseRentYieldMultiplier);

  // Group properties check (for trading complete sets with houses)
  const groupProps = allProperties.filter((p) => p.colorGroup === property.colorGroup);
  const groupHasHouses = groupProps.some((p) => (p.houses && p.houses > 0) || p.hotel);
  const groupPropertyIds = groupProps.map((p) => p.id);

  // 3. Mortgage Discount Penalty
  let mortgagePenalty = 0;
  if (property.isMortgaged) {
    // 50% face value lost + 10% lifting fee penalty (worth only 45% of developed value)
    mortgagePenalty = markovValue * 0.55;
    markovValue *= 0.45;
  }

  // 4. Monopoly Completion Surcharge / Premium
  let monopolyCompletionBonus = 0;
  const completes = willCompleteMonopoly(property, receiver.id, allProperties);
  if (completes) {
    if (isEvaluatorGiver) {
      // Evaluator is GIVING AWAY the final piece of a color group:
      // Adds a +100% to +200% surcharge to that property's valuation based on color tier
      let surchargePercent = 1.0;
      if (tier === 'TIER_S') surchargePercent = 2.0; // +200% for Orange/Red
      else if (tier === 'TIER_A') surchargePercent = 1.5; // +150% for Yellow/LightBlue
      else if (property.colorGroup === 'DarkBlue' || property.colorGroup === 'Pink') surchargePercent = 1.2; // +120%
      else surchargePercent = 1.0; // +100% for Green/Brown

      monopolyCompletionBonus = markovValue * surchargePercent;
    } else {
      // Evaluator is RECEIVING the final piece of its own monopoly:
      // Buyer willing to pay up to 180% over face value if they have cash reserves to build 3 houses immediately!
      const cost3Houses = calculateSet3HouseCost(property.colorGroup, allProperties);
      if (receiver.cash >= cost3Houses) {
        monopolyCompletionBonus = markovValue * 1.80; // Full 180% premium
      } else if (receiver.cash >= cost3Houses * 0.5) {
        monopolyCompletionBonus = markovValue * 1.10; // Moderate premium
      } else {
        monopolyCompletionBonus = markovValue * 0.40; // Cash-poor, cannot build immediately
      }
    }
  }

  // 5. Blocker Leverage
  let blockerBonus = 0;
  const blocker = isBlockerProperty(property, giver.id, receiver.id, allProperties);
  if (blocker) {
    // Single property holding leverage over opponent's 3-property set
    blockerBonus = markovValue * 1.50;
  }

  // 6. Existential Threat Multiplier
  // If trade gives opponent a monopoly AND they possess liquid cash to buy >= 3 houses per street immediately:
  // TREAT AS EXISTENTIAL THREAT: Value opponent's received assets at 2.5x!
  let existentialThreatScale = 1.0;
  if (isEvaluatorGiver && completes) {
    const cost3Houses = calculateSet3HouseCost(property.colorGroup, allProperties);
    if (receiver.cash >= cost3Houses) {
      existentialThreatScale = 2.5;
    }
  }

  const finalPerceivedValue = Math.round((markovValue + housesValue + monopolyCompletionBonus + blockerBonus) * existentialThreatScale);

  return {
    propertyId: property.id,
    propertyName: property.name,
    colorGroup: property.colorGroup,
    tier,
    baseFacePrice: basePrice,
    markovMultiplier,
    markovValue: Math.round(markovValue),
    monopolyCompletionBonus: Math.round(monopolyCompletionBonus),
    blockerBonus: Math.round(blockerBonus),
    mortgagePenalty: Math.round(mortgagePenalty),
    housesValue,
    housesCount,
    hasHotel: !!property.hotel,
    groupHasHouses,
    groupPropertyIds,
    finalPerceivedValue,
    lore,
    isBlocker: blocker,
    completesMonopoly: completes,
  };
}

/**
 * Applies Cash Elasticity based on bankroll.
 * When cash balance > $800: Cash is cheap (prefer acquiring deeds over collecting cash, factor = 0.8x).
 * When cash balance < $200: Liquidity is critical (+40% premium on incoming cash, factor = 1.4x).
 */
export function calculatePerceivedCashValue(
  cashAmount: number,
  playerCashBalance: number,
  isIncoming: boolean
): number {
  if (cashAmount <= 0) return 0;
  if (isIncoming) {
    if (playerCashBalance < 200) {
      // Critical liquidity premium: +40%
      return Math.round(cashAmount * 1.40);
    } else if (playerCashBalance > 800) {
      // Cash is cheap: 0.80x
      return Math.round(cashAmount * 0.80);
    }
    return cashAmount;
  } else {
    // Outgoing cash
    if (playerCashBalance < 200) {
      return Math.round(cashAmount * 1.30); // Harder to surrender cash when broke
    } else if (playerCashBalance > 800) {
      return Math.round(cashAmount * 0.85); // Easier to part with cash when rich
    }
    return cashAmount;
  }
}

/**
 * Phase 3 & 4: Master Trade Evaluation Function.
 * Evaluates proposal from the viewpoint of `evaluator` (typically receiverId or target player).
 */
export function evaluateTradeProposal(
  offer: TradeOffer,
  players: Player[],
  properties: Property[],
  currentTurn: number,
  forcedPersonality?: AIPersonality
): TradeEvaluationResult {
  const sender = players.find((p) => p.id === offer.senderId) || players[0];
  const receiver = players.find((p) => p.id === offer.receiverId) || players[1];

  // The evaluator is the recipient of the trade offer
  const evaluator = receiver;
  const proposer = sender;

  // Determine effective AI personality
  const evaluatorPersonality = forcedPersonality || determineEffectivePersonality(
    evaluator,
    (evaluator.name.includes('Barney') ? 'SHARK' : evaluator.name.includes('Cyber') ? 'PRAGMATIC' : 'SHARK'),
    players,
    properties
  );

  // 1. Evaluate incoming assets to Evaluator (sender gives to evaluator)
  const incomingProps = properties.filter((p) => offer.senderProperties.includes(p.id));
  const incomingValuations = incomingProps.map((p) =>
    evaluatePropertyAsset(p, proposer, evaluator, false, properties, currentTurn)
  );
  const totalIncomingPropsValue = incomingValuations.reduce((acc, v) => acc + v.finalPerceivedValue, 0);
  const incomingCashValue = calculatePerceivedCashValue(offer.senderCash, evaluator.cash, true);

  // Rent Concessions granted by Proposer to Evaluator (e.g. 1-2 free landings)
  let incomingRentConcessionsValue = 0;
  if (offer.rentConcessions) {
    offer.rentConcessions
      .filter((rc) => rc.grantorId === proposer.id && rc.beneficiaryId === evaluator.id)
      .forEach((rc) => {
        const prop = properties.find((p) => p.id === rc.propertyId);
        if (prop) {
          const expectedRent = prop.baseRent * (prop.houses > 0 ? prop.houses * 2 : 1);
          incomingRentConcessionsValue += expectedRent * rc.remainingLandings;
        }
      });
  }

  const perceivedReceivedValue = totalIncomingPropsValue + incomingCashValue + incomingRentConcessionsValue;

  // 2. Evaluate outgoing assets from Evaluator (evaluator gives to proposer)
  const outgoingProps = properties.filter((p) => offer.receiverProperties.includes(p.id));
  const outgoingValuations = outgoingProps.map((p) =>
    evaluatePropertyAsset(p, evaluator, proposer, true, properties, currentTurn)
  );
  const totalOutgoingPropsValue = outgoingValuations.reduce((acc, v) => acc + v.finalPerceivedValue, 0);
  const outgoingCashValue = calculatePerceivedCashValue(offer.receiverCash, evaluator.cash, false);

  // Rent Concessions granted by Evaluator to Proposer
  let outgoingRentConcessionsValue = 0;
  if (offer.rentConcessions) {
    offer.rentConcessions
      .filter((rc) => rc.grantorId === evaluator.id && rc.beneficiaryId === proposer.id)
      .forEach((rc) => {
        const prop = properties.find((p) => p.id === rc.propertyId);
        if (prop) {
          const expectedRent = prop.baseRent * (prop.houses > 0 ? prop.houses * 2 : 1);
          outgoingRentConcessionsValue += expectedRent * rc.remainingLandings;
        }
      });
  }

  const perceivedGivenValue = Math.max(1, totalOutgoingPropsValue + outgoingCashValue + outgoingRentConcessionsValue);

  // Net Delta V & Ratio
  const deltaV = perceivedReceivedValue - perceivedGivenValue;
  const ratio = perceivedReceivedValue / perceivedGivenValue;

  // Check special constraints:
  // Blocker Leverage: Never trade a blocker for flat cash unless facing immediate bankruptcy
  const evaluatorGivingBlocker = outgoingValuations.some((v) => v.isBlocker);
  const isConcedingBlockerForCash =
    evaluatorGivingBlocker &&
    incomingProps.length === 0 &&
    evaluator.cash >= 150 &&
    calculatePlayerNetWorth(evaluator, properties) >= 350;

  // Existential Threat: Does trade give opponent a monopoly with cash to build >= 3 houses?
  const isExistentialThreat = outgoingValuations.some((v) => {
    if (v.completesMonopoly) {
      const cost3H = calculateSet3HouseCost(v.colorGroup, properties);
      return proposer.cash >= cost3H;
    }
    return false;
  });

  // Check mutual monopoly speeds (for Shark)
  const evaluatorCompletingSet = incomingValuations.find((v) => v.completesMonopoly);
  const proposerCompletingSet = outgoingValuations.find((v) => v.completesMonopoly);

  let sharkAllowsMutualMonopoly = true;
  if (evaluatorPersonality === 'SHARK' && evaluatorCompletingSet && proposerCompletingSet) {
    const mySpeed = COLOR_ROI_SPEED_RANK[evaluatorCompletingSet.colorGroup];
    const theirSpeed = COLOR_ROI_SPEED_RANK[proposerCompletingSet.colorGroup];
    if (mySpeed < theirSpeed) {
      // Opponent's monopoly kills faster than Shark's (e.g. Shark gets Green, Opponent gets Orange)
      sharkAllowsMutualMonopoly = false;
    }
  }

  // Determine acceptance leeway ratio threshold based on personality
  let requiredLeewayRatio = 1.0;
  switch (evaluatorPersonality) {
    case 'SHARK':
      // Leeway: +10% to +30% surplus
      requiredLeewayRatio = 1.18;
      break;
    case 'PRAGMATIC':
      // Leeway: -5% to +10% surplus
      requiredLeewayRatio = 0.96;
      break;
    case 'DESPERATE':
      // Leeway: -25% to 0%
      requiredLeewayRatio = 0.78;
      break;
  }

  const detailedAnalysis: string[] = [];
  const sweetenersOffered: string[] = [];
  let verdict: 'ACCEPT' | 'REJECT' | 'COUNTER' = 'REJECT';
  let summaryReason = '';

  // Analysis logs
  detailedAnalysis.push(`AI Personality: ${evaluatorPersonality} (Required Ratio: ${(requiredLeewayRatio * 100).toFixed(0)}%).`);
  detailedAnalysis.push(`Perceived Value Received: $${perceivedReceivedValue} vs Given: $${perceivedGivenValue} (ΔV: ${deltaV >= 0 ? '+' : ''}$${deltaV}, Ratio: ${(ratio * 100).toFixed(0)}%).`);

  if (isConcedingBlockerForCash) {
    detailedAnalysis.push(`⚠️ Blocker Leverage Violation: Refusing to sell a critical monopoly blocker for raw cash without property equity.`);
  }

  if (isExistentialThreat) {
    detailedAnalysis.push(`🚨 Existential Threat: Proposer possesses liquid capital to build 3+ houses immediately on the completed set.`);
  }

  if (evaluatorPersonality === 'SHARK' && !sharkAllowsMutualMonopoly) {
    detailedAnalysis.push(`🦈 Shark ROI Refusal: Opponent's completed set (${proposerCompletingSet?.colorGroup}) yields faster kill velocity than evaluator's set (${evaluatorCompletingSet?.colorGroup}).`);
  }

  // Acceptance check
  const passesHardConstraints = !isConcedingBlockerForCash && sharkAllowsMutualMonopoly && (!isExistentialThreat || ratio >= 1.6);

  if (passesHardConstraints && ratio >= requiredLeewayRatio) {
    verdict = 'ACCEPT';
    summaryReason = `Trade proposal is equitable and meets ${evaluatorPersonality} tournament thresholds (Net Surplus: +$${Math.max(0, deltaV)}).`;
  } else if (
    passesHardConstraints &&
    ratio >= requiredLeewayRatio - 0.22 && // Within counter-offer sweetening range
    !isConcedingBlockerForCash
  ) {
    // Generate Counter-Offer using Phase 4 Sweeteners
    verdict = 'COUNTER';
    summaryReason = `Trade is close to acceptance threshold. Generating structured counter-proposal with balancing sweeteners.`;

    // 1. Cash Balancing Sweetener:
    // Calculate exact cash required to bring ratio up to requiredLeewayRatio
    const targetReceived = Math.round(perceivedGivenValue * requiredLeewayRatio);
    const cashDeltaNeeded = Math.max(25, targetReceived - perceivedReceivedValue);

    // Can proposer afford it?
    const adjustedSenderCash = offer.senderCash + cashDeltaNeeded;

    // 2. Mortgaged Throw-in Sweetener:
    // If cash delta is high, look for an unneeded mortgaged utility or low-tier single property from sender
    let addedThrowInProp: Property | undefined;
    if (cashDeltaNeeded > 150) {
      const candidateThrowIns = properties.filter(
        (p) =>
          p.ownerId === proposer.id &&
          !offer.senderProperties.includes(p.id) &&
          (p.isMortgaged || p.colorGroup === 'Utility' || p.colorGroup === 'Brown') &&
          !isBlockerProperty(p, proposer.id, evaluator.id, properties)
      );
      if (candidateThrowIns.length > 0) {
        addedThrowInProp = candidateThrowIns[0];
      }
    }

    // 3. Rent Immunity Concession Sweetener:
    // Offer 1 or 2 free landings on the traded property to bridge the remaining gap
    const rentConcessions: RentConcession[] = [...(offer.rentConcessions || [])];
    if (outgoingProps.length > 0 && incomingRentConcessionsValue === 0) {
      rentConcessions.push({
        id: `concession_${Date.now()}_${outgoingProps[0].id}`,
        grantorId: proposer.id,
        beneficiaryId: evaluator.id,
        propertyId: outgoingProps[0].id,
        remainingLandings: 2,
      });
      sweetenersOffered.push(`2 Free Landings (Rent Immunity) on ${outgoingProps[0].name}`);
    }

    if (addedThrowInProp) {
      sweetenersOffered.push(`Throw-in Asset: ${addedThrowInProp.name} (${addedThrowInProp.isMortgaged ? 'Mortgaged' : 'Clean'})`);
    }

    const counterSenderCash = addedThrowInProp ? Math.max(0, cashDeltaNeeded - 80) : adjustedSenderCash;
    if (cashDeltaNeeded > 0) {
      sweetenersOffered.push(`Cash Balancing: +$${counterSenderCash - offer.senderCash} from Proposer`);
    }

    const counterOffer: TradeOffer = {
      id: `counter_${offer.id}_${Date.now()}`,
      senderId: offer.receiverId, // Inverted: Evaluator proposes to original sender
      receiverId: offer.senderId,
      senderCash: offer.receiverCash,
      receiverCash: Math.min(proposer.cash, counterSenderCash),
      senderProperties: [...offer.receiverProperties],
      receiverProperties: addedThrowInProp ? [...offer.senderProperties, addedThrowInProp.id] : [...offer.senderProperties],
      rentConcessions,
      sweetenerNotes: sweetenersOffered,
      proposerMessage: `I need balancing concessions: Add $${Math.max(0, counterSenderCash - offer.senderCash)} cash${addedThrowInProp ? ` plus ${addedThrowInProp.name}` : ''} and rent immunity.`,
    };

    return {
      verdict,
      deltaV,
      perceivedReceivedValue,
      perceivedGivenValue,
      ratio,
      requiredLeewayRatio,
      evaluatorPersonality,
      isExistentialThreat,
      isConcedingBlockerForCash,
      summaryReason,
      detailedAnalysis,
      sweetenersOffered,
      counterOffer,
      receivedBreakdown: {
        cashValue: incomingCashValue,
        nominalCash: offer.senderCash,
        propertiesValuation: incomingValuations,
        rentConcessionsValue: incomingRentConcessionsValue,
      },
      givenBreakdown: {
        cashValue: outgoingCashValue,
        nominalCash: offer.receiverCash,
        propertiesValuation: outgoingValuations,
        rentConcessionsValue: outgoingRentConcessionsValue,
      },
    };
  } else {
    verdict = 'REJECT';
    if (isConcedingBlockerForCash) {
      summaryReason = `Rejected: Blocker leverage rule strictly forbids trading critical monopoly blockers for flat cash.`;
    } else if (isExistentialThreat) {
      summaryReason = `Rejected: Crown-prevention rule — granting you this monopoly allows an immediate 3-house build with your $${proposer.cash} liquid reserves.`;
    } else if (evaluatorPersonality === 'SHARK' && !sharkAllowsMutualMonopoly) {
      summaryReason = `Rejected: Shark ROI velocity rule — your target color group (${proposerCompletingSet?.colorGroup}) develops significantly faster than the offered set.`;
    } else {
      summaryReason = `Rejected: Proposal yields insufficient value (Ratio: ${(ratio * 100).toFixed(0)}% vs required ${(requiredLeewayRatio * 100).toFixed(0)}%).`;
    }
  }

  return {
    verdict,
    deltaV,
    perceivedReceivedValue,
    perceivedGivenValue,
    ratio,
    requiredLeewayRatio,
    evaluatorPersonality,
    isExistentialThreat,
    isConcedingBlockerForCash,
    summaryReason,
    detailedAnalysis,
    sweetenersOffered,
    receivedBreakdown: {
      cashValue: incomingCashValue,
      nominalCash: offer.senderCash,
      propertiesValuation: incomingValuations,
      rentConcessionsValue: incomingRentConcessionsValue,
    },
    givenBreakdown: {
      cashValue: outgoingCashValue,
      nominalCash: offer.receiverCash,
      propertiesValuation: outgoingValuations,
      rentConcessionsValue: outgoingRentConcessionsValue,
    },
  };
}

/**
 * Generates proactive, tournament-grade trade proposals by an AI player.
 * Checks for monopoly completion swaps, cash raising in distress, or acquiring high-traffic Tier S/A zones.
 */
export function generateProactiveTradeOffers(
  aiPlayer: Player,
  allPlayers: Player[],
  allProperties: Property[],
  currentTurn: number
): TradeOffer[] {
  if (aiPlayer.isBankrupt) return [];

  const offers: TradeOffer[] = [];
  const opponents = allPlayers.filter((p) => p.id !== aiPlayer.id && !p.isBankrupt);
  const myProperties = allProperties.filter((p) => p.ownerId === aiPlayer.id);

  // Strategy 1: Find properties that complete an AI monopoly
  const colorGroups: ColorGroup[] = ['Orange', 'Red', 'Yellow', 'LightBlue', 'Pink', 'DarkBlue', 'Green', 'Brown'];

  for (const group of colorGroups) {
    const groupProps = allProperties.filter((p) => p.colorGroup === group);
    const myGroupProps = groupProps.filter((p) => p.ownerId === aiPlayer.id);
    const required = COLOR_GROUP_COUNTS[group];

    // If AI owns required - 1 properties in this group
    if (myGroupProps.length === required - 1) {
      const missingProp = groupProps.find((p) => p.ownerId !== aiPlayer.id && p.ownerId !== null);
      if (missingProp && missingProp.ownerId !== null) {
        const owner = opponents.find((p) => p.id === missingProp.ownerId);
        if (owner) {
          // AI wants `missingProp` from `owner`
          // What can AI offer in return?
          // Look for an unneeded property that owner needs, or high cash
          const tradeableMyProps = myProperties.filter(
            (p) => p.colorGroup !== group && !isBlockerProperty(p, aiPlayer.id, owner.id, allProperties)
          );

          let offeredPropId: string | undefined;
          // Check if AI holds a property that helps `owner`
          for (const myP of tradeableMyProps) {
            const ownerGroupProps = allProperties.filter((p) => p.colorGroup === myP.colorGroup && p.ownerId === owner.id);
            if (ownerGroupProps.length >= 1) {
              offeredPropId = myP.id;
              break;
            }
          }
          if (!offeredPropId && tradeableMyProps.length > 0) {
            offeredPropId = tradeableMyProps[0].id;
          }

          // Offer cash sweetener
          const cashSweetener = Math.min(Math.floor(aiPlayer.cash * 0.45), Math.max(50, missingProp.basePrice * 1.5));

          const proposal: TradeOffer = {
            id: `proactive_${aiPlayer.id}_${Date.now()}_${missingProp.id}`,
            senderId: aiPlayer.id,
            receiverId: owner.id,
            senderCash: cashSweetener,
            receiverCash: 0,
            senderProperties: offeredPropId ? [offeredPropId] : [],
            receiverProperties: [missingProp.id],
            proposerMessage: `Tournament Opportunity: I offer ${offeredPropId ? allProperties.find((p) => p.id === offeredPropId)?.name + ' and ' : ''}$${cashSweetener} cash for ${missingProp.name} to balance the board.`,
            sweetenerNotes: [`Cash injection of $${cashSweetener}`],
          };

          // Validate that the proposal is reasonable
          const evalResult = evaluateTradeProposal(proposal, allPlayers, allProperties, currentTurn);
          if (evalResult.verdict === 'ACCEPT' || evalResult.verdict === 'COUNTER') {
            offers.push(proposal);
          }
        }
      }
    }
  }

  // Strategy 2: Desperate liquidity raise if cash < $150
  if (aiPlayer.cash < 150 && myProperties.length > 0) {
    const surplusProp = myProperties.find(
      (p) => p.houses === 0 && !willCompleteMonopoly(p, aiPlayer.id, allProperties)
    );
    if (surplusProp) {
      const wealthiestOpponent = [...opponents].sort((a, b) => b.cash - a.cash)[0];
      if (wealthiestOpponent && wealthiestOpponent.cash > 300) {
        const cashRequest = Math.round(surplusProp.basePrice * 1.2);
        offers.push({
          id: `desperate_${aiPlayer.id}_${Date.now()}_${surplusProp.id}`,
          senderId: aiPlayer.id,
          receiverId: wealthiestOpponent.id,
          senderCash: 0,
          receiverCash: cashRequest,
          senderProperties: [surplusProp.id],
          receiverProperties: [],
          proposerMessage: `Emergency Liquidity Sale: I will surrender ${surplusProp.name} for $${cashRequest} cash.`,
          sweetenerNotes: [`Fast title deed transfer for liquidity`],
        });
      }
    }
  }

  return offers;
}

/**
 * Validates the rule:
 * "allow trading properties with houses as long as all three are traded."
 * Checks both sender and receiver property lists:
 * If any property in a color group has houses or hotel, ALL properties in that color group
 * owned by that player must be included together in the trade.
 */
export function validateTradeHouseRules(
  offeredPropIds: string[],
  requestedPropIds: string[],
  allProperties: Property[]
): { valid: boolean; error?: string; offendingGroup?: ColorGroup } {
  // Check offered properties
  for (const propId of offeredPropIds) {
    const prop = allProperties.find((p) => p.id === propId);
    if (!prop || !prop.colorGroup || prop.colorGroup === 'Railroad' || prop.colorGroup === 'Utility') continue;

    const groupProps = allProperties.filter(
      (p) => p.colorGroup === prop.colorGroup && p.ownerId === prop.ownerId
    );
    const hasAnyImprovement = groupProps.some((p) => (p.houses && p.houses > 0) || p.hotel);

    if (hasAnyImprovement) {
      const allSelected = groupProps.every((p) => offeredPropIds.includes(p.id));
      if (!allSelected) {
        return {
          valid: false,
          error: `Properties with houses in the ${prop.colorGroup} group can only be traded if all ${groupProps.length} properties in the set are traded together.`,
          offendingGroup: prop.colorGroup,
        };
      }
    }
  }

  // Check requested properties
  for (const propId of requestedPropIds) {
    const prop = allProperties.find((p) => p.id === propId);
    if (!prop || !prop.colorGroup || prop.colorGroup === 'Railroad' || prop.colorGroup === 'Utility') continue;

    const groupProps = allProperties.filter(
      (p) => p.colorGroup === prop.colorGroup && p.ownerId === prop.ownerId
    );
    const hasAnyImprovement = groupProps.some((p) => (p.houses && p.houses > 0) || p.hotel);

    if (hasAnyImprovement) {
      const allSelected = groupProps.every((p) => requestedPropIds.includes(p.id));
      if (!allSelected) {
        return {
          valid: false,
          error: `Properties with houses in the ${prop.colorGroup} group can only be traded if all ${groupProps.length} properties in the set are traded together.`,
          offendingGroup: prop.colorGroup,
        };
      }
    }
  }

  return { valid: true };
}

