export type GamePhase = 'SETUP' | 'DRAFT' | 'IN_GAME' | 'SPREE_TRIGGERED' | 'ENDGAME_EVAL';

export type TurnPhase = 'PRE_ROLL' | 'RESOLVING_SPACE' | 'ACTION_PHASE' | 'POST_ROLL' | 'TRADE_OR_BUILD' | 'END_TURN';

export type ColorGroup = 'Brown' | 'LightBlue' | 'Pink' | 'Orange' | 'Red' | 'Yellow' | 'Green' | 'DarkBlue' | 'Railroad' | 'Utility';

export type SpaceType = 'GO' | 'PROPERTY' | 'COMMUNITY_CHEST' | 'CHANCE' | 'TAX' | 'JAIL' | 'FREE_PARKING' | 'GO_TO_JAIL';

export interface ActiveModifier {
  id: string;
  name: string;
  type: string;
  expiresAt: 'PASS_GO' | 'TURN_END' | 'SINGLE_EVENT' | 'LANDING';
  value?: number | string;
}

export interface Wildcard {
  id: string;
  name: string;
  type: 'Core' | 'Super';
  duration: string;
  description: string;
  executionType: 'PRE_ROLL' | 'INSTANT_DRAW' | 'REACTIVE' | 'EVENT' | 'ANY_PHASE';
  targetRequired?: 'NONE' | 'PLAYER' | 'PROPERTY' | 'SPACE';
  weight?: number;
}

export type TokenShape = 'hat' | 'car' | 'ship' | 'thimble' | 'dog' | 'boot' | 'train' | 'crown';

export interface Player {
  id: number;
  name: string;
  color: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  hasGetOutOfJailFreeCard?: boolean;
  lapsCompleted: number;
  wildcardsHand: Wildcard[];
  activeModifiers: ActiveModifier[];
  monopolyChallengeUsed: boolean;
  taxExempt: boolean;
  isBankrupt: boolean;
  isAi: boolean;
  consecutiveDoubles: number;
  goldenDealActive: boolean;
  tokenShape: TokenShape;
  avatarColor: string;
  avatarShape?: 'cube' | 'sphere' | 'pyramid' | 'torus' | 'octahedron';
  freeParkingDoublesCount?: number;
}

export interface BoardSpace {
  index: number;
  name: string;
  side: 1 | 2 | 3 | 4;
  type: SpaceType;
  colorGroup?: ColorGroup;
  propertyId?: string;
  taxAmount?: number;
}

export interface Property {
  id: string;
  name: string;
  colorGroup: ColorGroup;
  side: 1 | 2 | 3 | 4;
  ownerId: number | null;
  houses: number; // 0..4
  hotel: boolean; // house count 5 = hotel
  isMortgaged: boolean;
  basePrice: number;
  baseRent: number;
  houseCost: number;
  rentLevels: number[]; // [base, 1h, 2h, 3h, 4h, hotel]
  modifiedBy: string[];
  isCrooked?: boolean;
}

export interface WildcardDeck {
  drawPile: Wildcard[];
  discardPile: Wildcard[];
}

export interface GameState {
  timerSeconds: number;
  gamePhase: GamePhase;
  bankerLapCounter: number;
  lotteryPool: number;
  activeTurnPlayerId: number;
  turnPhase: TurnPhase;
  goldenDealPlayerId: number | null;
  saturdayRatesPlayerId: number | null;
  wildcardDeck: WildcardDeck;
  lastDiceRoll: [number, number] | null;
  isSnakeEyes: boolean;
  consecutiveDoubles: number;
  spreeTriggered: boolean;
  winnerId: number | null;
  hasTaxOccurred: boolean; // Monopoly Duel card gate
  turnCount: number;
  rentConcessions?: RentConcession[];
}

export interface GameEventLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger' | 'rule' | 'card';
  playerId?: number;
}

export interface EventHook {
  type: 'CAMERA_FOCUS' | 'ANIMATE_DICE_ROLL' | 'TRIGGER_HUD_MODAL' | 'CELEBRATION' | 'SOUND_EFFECT';
  targetSpaceIndex?: number;
  targetPlayerId?: number;
  durationMs?: number;
  diceValues?: [number, number];
  isSnakeEyes?: boolean;
  modalType?: string;
  availableOptions?: string[];
  soundName?: string;
}

export interface EnginePayload {
  gameState: GameState;
  players: Player[];
  properties: Property[];
  boardSpaces: BoardSpace[];
  logs: GameEventLog[];
  eventHooks: EventHook[];
}

export type AIPersonality = 'SHARK' | 'PRAGMATIC' | 'DESPERATE';

export interface RentConcession {
  id: string;
  grantorId: number; // Owner who waives rent
  beneficiaryId: number; // Player who lands for free
  propertyId: string;
  remainingLandings: number;
}

export interface TradeOffer {
  id: string;
  senderId: number;
  receiverId: number;
  senderCash: number;
  receiverCash: number;
  senderProperties: string[];
  receiverProperties: string[];
  senderWildcardIds?: string[];
  receiverWildcardIds?: string[];
  senderGetOutOfJailCard?: boolean;
  receiverGetOutOfJailCard?: boolean;
  rentConcessions?: RentConcession[];
  sweetenerNotes?: string[];
  proposerMessage?: string;
}

export interface GameRulesOptions {
  // Economy & Bankroll
  startingCash: number; // 1500 (standard), 2000 (fast tycoon), 1000 (hardcore)

  // DLC 1: Rapid Transit & Jumpstart
  openingDraft: boolean; // Property Draft: Guarantees every player a colored asset at turn zero
  railwayTransit: boolean; // Railway Transportation: Active warp points between owned stations ($50)
  doubleCashOnGo: boolean; // Land on GO Perk: Double payday ($400) or tactical warp option on exact landings
  snakeEyesBonus: boolean; // Snake Eyes Bounty: Softens low rolls with $400 cash injection and bonus turn

  // DLC 2: Hostile Takeovers & Regulatory Crackdown
  monopolyChallenge: boolean; // Monopoly Challenge: High-stakes buyout duels to finish sets against stubborn players
  jailFrozenAssets: boolean; // Jail Frozen Assets: Strips rent collection, trading, and auction rights while incarcerated

  // DLC 3: Wall Street & Speculation
  taxDayPortfolioTax: boolean; // Tax Day: Cyclical portfolio taxes every 5 banker laps & foreclosure auctions
  freeParkingLottery: boolean; // Free Parking Lottery: Dice-driven casino with progressive jackpot & Golden Deals

  // DLC 4: Rogue Tactics (Wildcards Expansion)
  coreActionDeck: boolean; // Core Action Deck: Reusable movement manipulation, die alterations, fee immunities
  superWildcardDrop: boolean; // Super Wildcard Drop: Hostile property heists, forced mergers, hedge funds, sudden bankruptcies

  // DLC 5: Sudden Death Timer
  greatMonopolySpree: boolean; // Great Monopoly Spree: Auto-completes sets at 90m, net-worth liquidation at 120m

  // Ultimate Monopoly Additions (Outside Suggestions)
  speedDie: boolean; // The Speed Die: 3rd die (1-3, Bus, Mr. Monopoly) cutting game length by 40%
  skyscrapersAndDepots: boolean; // Skyscrapers & Depots: Construction tier above Hotels and station upgrades
  busTicketsDeck: boolean; // Bus Tickets Deck: Travel to any space on current board side
  stockExchange: boolean; // Corporate Stock Exchange: Passive dividend shares in rail/utility syndicates
  tripleTrackBoard: boolean; // Triple-Track Board: Multi-ring board connected by Transit Stations

  // Strategic trading pacts
  tradeRentImmunity: boolean; // Allow strategic Rent Concessions in trades
  taxDayWildcardDuel: boolean; // Tax spaces trigger Wildcard Duels

  // Custom Wildcard Deck Curation
  enabledWildcardIds?: string[]; // Specific wildcard IDs enabled in the game (defaults to all if undefined)
}

export type GraphicQualityPreset = 'AUTO' | 'BATTERY_SAVER' | 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA' | 'CUSTOM';
export type ShadowQualitySetting = 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
export type TargetFpsSetting = 'AUTO' | '30' | '60' | 'UNCAPPED';

export interface GameSettingsOptions {
  soundEnabled: boolean;
  soundVolume: number; // 0.0 - 1.0
  ambientPorchAudio: boolean;
  botSpeed: 1 | 2 | 3;
  cameraMode: 'CINEMATIC' | 'OVERHEAD' | 'FREE_ORBIT';
  scenicViewMode: boolean;

  // Performance & Battery Optimization (For Low-End & Mobile Web Players)
  graphicQuality?: GraphicQualityPreset;
  graphicPreset?: GraphicQualityPreset;
  shadowsQuality?: ShadowQualitySetting;
  shadowQuality?: ShadowQualitySetting;
  bloomEffect?: boolean;
  bloomEnabled?: boolean;
  targetFps: TargetFpsSetting;
  renderScale?: number; // 0.75, 1.0, 1.25, 1.5, 2.0
  resolutionScale?: string | number;
  batterySaverMode?: boolean;
  isBatterySaver?: boolean;
  ambientAnimations: boolean; // fireflies, candle flicker, fairy point lights
  smartIdleThrottle: boolean; // lowers frame pacing after 1 minute of input inactivity
}

export const DEFAULT_RULES: GameRulesOptions = {
  startingCash: 1500,
  openingDraft: true,
  railwayTransit: true,
  doubleCashOnGo: true,
  snakeEyesBonus: true,
  monopolyChallenge: true,
  jailFrozenAssets: true,
  taxDayPortfolioTax: true,
  freeParkingLottery: true,
  coreActionDeck: true,
  superWildcardDrop: true,
  greatMonopolySpree: true,
  speedDie: true,
  skyscrapersAndDepots: true,
  busTicketsDeck: true,
  stockExchange: true,
  tripleTrackBoard: false,
  tradeRentImmunity: true,
  taxDayWildcardDuel: true,
};

export const DEFAULT_SETTINGS: GameSettingsOptions = {
  soundEnabled: true,
  soundVolume: 0.8,
  ambientPorchAudio: true,
  botSpeed: 1,
  cameraMode: 'CINEMATIC',
  scenicViewMode: false,
  graphicQuality: 'AUTO',
  graphicPreset: 'AUTO',
  shadowsQuality: 'MEDIUM',
  shadowQuality: 'LOW',
  bloomEffect: false, // Defaulting bloom off provides 3-4x faster draw rates on mobile & low-end GPUs
  bloomEnabled: false,
  targetFps: '60',
  renderScale: 1.0,
  resolutionScale: '1.0',
  batterySaverMode: false,
  isBatterySaver: false,
  ambientAnimations: true,
  smartIdleThrottle: true,
};

/**
 * Intelligent hardware capability detection for web players
 */
export function detectDeviceCapabilities(): {
  recommendedPreset: GraphicQualityPreset;
  isMobile: boolean;
  cores: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  pixelRatio: number;
  lowEndHardware: boolean;
  deviceTier: 'low' | 'medium' | 'high' | 'ultra';
} {
  if (typeof window === 'undefined') {
    return {
      recommendedPreset: 'MEDIUM',
      isMobile: false,
      cores: 4,
      hardwareConcurrency: 4,
      deviceMemory: 4,
      pixelRatio: 1,
      lowEndHardware: false,
      deviceTier: 'medium',
    };
  }

  const cores = navigator.hardwareConcurrency || 4;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;
  const pixelRatio = window.devicePixelRatio || 1;

  const lowEndHardware = cores <= 2 || memory <= 2 || (isMobile && cores <= 4 && memory <= 3);

  let deviceTier: 'low' | 'medium' | 'high' | 'ultra' = 'medium';
  let recommendedPreset: GraphicQualityPreset = 'MEDIUM';

  if (lowEndHardware) {
    deviceTier = 'low';
    recommendedPreset = isMobile ? 'BATTERY_SAVER' : 'LOW';
  } else if (isMobile) {
    deviceTier = 'medium';
    recommendedPreset = 'BATTERY_SAVER';
  } else if (cores >= 8 && memory >= 8) {
    deviceTier = 'high';
    recommendedPreset = 'HIGH';
  }

  return {
    recommendedPreset,
    isMobile,
    cores,
    hardwareConcurrency: cores,
    deviceMemory: memory,
    pixelRatio,
    lowEndHardware,
    deviceTier,
  };
}

/**
 * Resolves effective Three.js rendering parameters based on the current settings
 */
export function resolveEffectiveSettings(settings: GameSettingsOptions): {
  targetQuality: GraphicQualityPreset;
  effectivePixelRatio: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  bloomEnabled: boolean;
  targetFpsNumber: number;
  ambientAnimations: boolean;
  smartIdleThrottle: boolean;
  isBatterySaver: boolean;
  isLowEndMode: boolean;
} {
  const isBatterySaver = Boolean(
    settings.batterySaverMode ||
    settings.isBatterySaver ||
    settings.graphicQuality === 'BATTERY_SAVER' ||
    settings.graphicPreset === 'BATTERY_SAVER'
  );
  
  // Base preset defaults
  let targetQuality = settings.graphicPreset || settings.graphicQuality || 'AUTO';
  if (targetQuality === 'AUTO') {
    const { recommendedPreset } = detectDeviceCapabilities();
    targetQuality = isBatterySaver ? 'BATTERY_SAVER' : recommendedPreset;
  }

  const baseDpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  let effectivePixelRatio = 1.0;
  let shadowsEnabled = true;
  let shadowMapSize = 1024;
  let bloomEnabled = false;
  let targetFpsNumber = 60;
  let ambientAnimations = settings.ambientAnimations;
  let smartIdleThrottle = settings.smartIdleThrottle;

  const shadowSetting = settings.shadowQuality || settings.shadowsQuality || 'MEDIUM';
  const bloomSetting = settings.bloomEnabled ?? settings.bloomEffect ?? false;

  // Pixel ratio is optimized to 1.0 native CSS ratio (and max 1.25 on High/Ultra)
  // preventing GPU fill-rate throttling and browser compositor lag while keeping board crisp and legible
  if (isBatterySaver) {
    effectivePixelRatio = 1.0;
    shadowsEnabled = false;
    shadowMapSize = 512;
    bloomEnabled = false;
    targetFpsNumber = 30;
    ambientAnimations = false;
    smartIdleThrottle = true;
  } else if (targetQuality === 'LOW') {
    effectivePixelRatio = 1.0;
    shadowsEnabled = false;
    shadowMapSize = 512;
    bloomEnabled = false;
    targetFpsNumber = 60;
    ambientAnimations = false;
    smartIdleThrottle = true;
  } else if (targetQuality === 'MEDIUM') {
    effectivePixelRatio = 1.0;
    shadowsEnabled = shadowSetting !== 'OFF';
    shadowMapSize = 1024;
    bloomEnabled = false;
    targetFpsNumber = 60;
    ambientAnimations = settings.ambientAnimations;
    smartIdleThrottle = true;
  } else if (targetQuality === 'HIGH') {
    effectivePixelRatio = Math.min(baseDpr, 1.5);
    shadowsEnabled = shadowSetting !== 'OFF';
    shadowMapSize = 1024;
    bloomEnabled = bloomSetting;
    targetFpsNumber = 60;
    ambientAnimations = settings.ambientAnimations;
    smartIdleThrottle = settings.smartIdleThrottle;
  } else {
    // ULTRA Setting: Smooth 1.5x max pixel ratio & 1024 shadow maps
    effectivePixelRatio = Math.min(baseDpr, 1.5);
    shadowsEnabled = shadowSetting !== 'OFF';
    shadowMapSize = 1024;
    bloomEnabled = bloomSetting;
    targetFpsNumber = targetQuality === 'ULTRA' ? 144 : 60;
    ambientAnimations = settings.ambientAnimations;
    smartIdleThrottle = settings.smartIdleThrottle;
  }

  // Explicit user overrides
  if (shadowSetting === 'OFF') shadowsEnabled = false;
  if (shadowSetting === 'HIGH' && !isBatterySaver) shadowMapSize = 1024;
  if (shadowSetting === 'LOW') shadowMapSize = 512;
  if (bloomSetting && !isBatterySaver && targetQuality !== 'LOW') bloomEnabled = true;
  if (!bloomSetting) bloomEnabled = false;

  if (settings.targetFps === '30') targetFpsNumber = 30;
  else if (settings.targetFps === '60') targetFpsNumber = 60;
  else if (settings.targetFps === 'UNCAPPED') targetFpsNumber = 144;

  const resScale = settings.resolutionScale
    ? settings.resolutionScale === 'DEVICE_MAX'
      ? Math.min(baseDpr, 1.5)
      : parseFloat(String(settings.resolutionScale))
    : settings.renderScale;

  if (resScale && resScale !== 1.0 && !isBatterySaver) {
    effectivePixelRatio = Math.min(baseDpr * resScale, 1.5);
  }

  const isLowEndMode = targetQuality === 'LOW' || isBatterySaver;

  return {
    targetQuality,
    effectivePixelRatio,
    shadowsEnabled,
    shadowMapSize,
    bloomEnabled,
    targetFpsNumber,
    ambientAnimations,
    smartIdleThrottle,
    isBatterySaver,
    isLowEndMode,
  };
}

export interface CardTargetingState {
  cardId: string;
  rawCardId: string;
  cardName: string;
  description: string;
  targetType: 'PROPERTY' | 'PLAYER';
  eligiblePropertyIds?: string[];
  eligiblePlayerIds?: number[];
}

