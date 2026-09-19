import { TokenShape } from '@/types/monopoly';

export interface PremiumTokenOption {
  id: TokenShape;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
  metalFinish: string;
  accentColor: string;
  baseMaterialColor: number; // Three.js hex color
  accentMaterialColor: number;
  iconName: 'Crown' | 'Car' | 'Ship' | 'Sparkles' | 'Dog' | 'Footprints' | 'Train' | 'Award';
  symbol: string;
  historicalNote: string;
}

export const ALL_PREMIUM_TOKENS: PremiumTokenOption[] = [
  {
    id: 'hat',
    name: 'The Gilded Top Hat',
    shortName: 'Top Hat',
    subtitle: "The Aristocrat's Heirloom",
    description:
      'Handcrafted from high-society lustrous gold with a curved brim, tapered crown, and a rich crimson satin ribbon band.',
    metalFinish: '24K Gilded Gold & Crimson Satin',
    accentColor: '#F59E0B',
    baseMaterialColor: 0xeab308,
    accentMaterialColor: 0xd97706,
    iconName: 'Award',
    symbol: '🎩',
    historicalNote: 'The iconic gentleman’s emblem of prestige, high finance, and boardroom supremacy.',
  },
  {
    id: 'car',
    name: 'The 1930s Luxury Roadster',
    shortName: 'Roadster',
    subtitle: 'Streamlined Grand Tourer',
    description:
      'An aerodynamic Art-Deco roadster featuring a vertical chrome radiator grille, torpedo headlights, wire-spoke wheels, and a tapered boat-tail rear.',
    metalFinish: 'Brushed Chrome & Mirror Platinum',
    accentColor: '#38BDF8',
    baseMaterialColor: 0xe2e8f0,
    accentMaterialColor: 0x38bdf8,
    iconName: 'Car',
    symbol: '🏎️',
    historicalNote: 'Celebrates the Golden Age of grand touring speed, luxury craftsmanship, and swift moves around the board.',
  },
  {
    id: 'ship',
    name: 'The Royal Battleship',
    shortName: 'Battleship',
    subtitle: 'Imperial Naval Flagship',
    description:
      'A majestic dreadnought featuring stepped multi-level observation decks, fore & aft rotating twin artillery turrets, and raked steam funnels.',
    metalFinish: 'Gunmetal Navy Steel & Polished Brass',
    accentColor: '#6366F1',
    baseMaterialColor: 0x94a3b8,
    accentMaterialColor: 0x6366f1,
    iconName: 'Ship',
    symbol: '🚢',
    historicalNote: 'Command high-seas trade routes, impenetrable naval fortitude, and strategic board positioning.',
  },
  {
    id: 'thimble',
    name: 'The Jeweled Thimble',
    shortName: 'Thimble',
    subtitle: "The Master Jeweler's Seal",
    description:
      'Turned from solid heirloom bronze, adorned with four concentric rings of knurled diamond dimples and a fluted filigree beaded rim.',
    metalFinish: 'Chiseled Antique Bronze & Topaz',
    accentColor: '#D97706',
    baseMaterialColor: 0xd97706,
    accentMaterialColor: 0xfef08a,
    iconName: 'Sparkles',
    symbol: '🧵',
    historicalNote: 'A timeless heirloom symbol of diligence, meticulous precision, and enduring protective fortune.',
  },
  {
    id: 'dog',
    name: 'The Scottish Terrier',
    shortName: 'Scottie Dog',
    subtitle: 'The Loyal Highland Guardian',
    description:
      'Sculpted with a low-slung highland skirt, distinctive bearded muzzle, alert pricked ears, and a burnished collar with dangling medallion.',
    metalFinish: 'Cast Antique Pewter & Brass Collar',
    accentColor: '#10B981',
    baseMaterialColor: 0x64748b,
    accentMaterialColor: 0x10b981,
    iconName: 'Dog',
    symbol: '🐕',
    historicalNote: 'One of the most beloved companion pieces in gaming history, bringing unwavering loyalty and terrier tenacity.',
  },
  {
    id: 'boot',
    name: 'The Dapper Oxford Boot',
    shortName: 'Oxford Boot',
    subtitle: 'Vintage Wingtip Brogue',
    description:
      'A distinguished high-ankle brogue boot featuring a stacked leather heel, welted sole, brass lace eyelets, and classic wingtip toe contour.',
    metalFinish: 'Burnished Copper & Antique Brass',
    accentColor: '#EA580C',
    baseMaterialColor: 0xc2410c,
    accentMaterialColor: 0xfbbf24,
    iconName: 'Footprints',
    symbol: '👢',
    historicalNote: 'A testament to tireless groundwork, steady strides from Mediterranean Avenue to Boardwalk.',
  },
  {
    id: 'train',
    name: 'The Iron Horse Locomotive',
    shortName: 'Locomotive',
    subtitle: 'Victorian Industrial Titan',
    description:
      'A majestic 4-4-0 steam locomotive boasting a pressurized boiler, flanged balloon smokestack, dual brass sand domes, and wedge cowcatcher.',
    metalFinish: 'Smoked Cast Iron & Mirror Brass',
    accentColor: '#8B5CF6',
    baseMaterialColor: 0x475569,
    accentMaterialColor: 0xfacc15,
    iconName: 'Train',
    symbol: '🚂',
    historicalNote: 'The supreme engine of commerce that connects railroads across the board into unstoppable transit monopolies.',
  },
  {
    id: 'crown',
    name: 'The Sovereign Crown',
    shortName: 'Imperial Crown',
    subtitle: 'Imperial Coronation Diadem',
    description:
      'A regal coronation diadem encircled with jewel cabochons, rising openwork cross arches, an imperial velvet cap, and celestial cross orb.',
    metalFinish: 'Coronation 24K Gold & Royal Jewels',
    accentColor: '#EC4899',
    baseMaterialColor: 0xf59e0b,
    accentMaterialColor: 0xec4899,
    iconName: 'Crown',
    symbol: '👑',
    historicalNote: 'The ultimate trophy piece for the undisputed Chairman and master of the Monopoly board.',
  },
];

export function getPremiumToken(shape: TokenShape): PremiumTokenOption {
  return (
    ALL_PREMIUM_TOKENS.find((t) => t.id === shape) || ALL_PREMIUM_TOKENS[0]
  );
}

/**
 * Assigns unique tokens for all players in a match, ensuring Player 1 gets their preferred
 * token, and AI bots receive non-conflicting premium tokens from the pool.
 */
export function assignDistinctTokens(
  preferredPlayer1Shape: TokenShape,
  totalPlayers: number = 4
): TokenShape[] {
  const selected: TokenShape[] = [preferredPlayer1Shape];
  const remainingPool = ALL_PREMIUM_TOKENS.map((t) => t.id).filter(
    (id) => id !== preferredPlayer1Shape
  );

  for (let i = 1; i < totalPlayers; i++) {
    if (remainingPool.length > 0) {
      selected.push(remainingPool.shift()!);
    } else {
      selected.push(ALL_PREMIUM_TOKENS[i % ALL_PREMIUM_TOKENS.length].id);
    }
  }

  return selected;
}
