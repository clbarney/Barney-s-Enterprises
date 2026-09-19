// Distinct creative typography and styling themes for each property set
// crafted based on location character and investment tier

export interface PropertyStyleTheme {
  titleFont: string;
  priceFont: string;
  titleColor: string;
  priceColor: string;
  motif: string;
  lore: string;
  badgeType:
    | 'vintage-stamp'
    | 'coastal-pill'
    | 'victorian-cartouche'
    | 'marquee-box'
    | 'industrial-plate'
    | 'resort-plaque'
    | 'treasury-frame'
    | 'luxury-gem'
    | 'railroad-ticket'
    | 'utility-gauge';
}

export const PROPERTY_SET_THEMES: Record<string, PropertyStyleTheme> = {
  Brown: {
    // Mediterranean Ave, Baltic Ave - $60 (Historic Seaport / Working-Class Dockland)
    titleFont: "900 36px 'Special Elite', 'Rockwell', 'Courier New', serif",
    priceFont: "800 42px 'Rockwell', 'Courier New', monospace",
    titleColor: '#1E293B',
    priceColor: '#334155',
    motif: '⚓ DOCKLAND ⚓',
    lore: 'HISTORIC SEAPORT',
    badgeType: 'vintage-stamp',
  },
  LightBlue: {
    // Oriental, Vermont, Connecticut - $100-$120 (Coastal New England / Airy Nautical Harbor)
    titleFont: "700 33px 'Montserrat', 'Century Gothic', 'Trebuchet MS', sans-serif",
    priceFont: "800 40px 'Century Gothic', 'Trebuchet MS', sans-serif",
    titleColor: '#0F172A',
    priceColor: '#0284C7',
    motif: '⛵ SEASIDE ⛵',
    lore: 'COASTAL RETREAT',
    badgeType: 'coastal-pill',
  },
  Pink: {
    // St. Charles, States, Virginia - $140-$160 (Southern Victorian / Garden District Parlors)
    titleFont: "italic 700 36px 'Playfair Display', 'Didot', 'Bodoni MT', 'Baskerville', serif",
    priceFont: "bold 42px 'Baskerville', 'Playfair Display', serif",
    titleColor: '#4A044E',
    priceColor: '#9D174D',
    motif: '⚜ HISTORIC ⚜',
    lore: 'GARDEN DISTRICT',
    badgeType: 'victorian-cartouche',
  },
  Orange: {
    // St. James, Tennessee, New York - $180-$200 (Broadway Marquee / Metropolitan Newsprint)
    titleFont: "900 35px 'Impact', 'Franklin Gothic Heavy', 'Arial Black', sans-serif",
    priceFont: "900 44px 'Impact', 'Franklin Gothic Medium', sans-serif",
    titleColor: '#0F172A',
    priceColor: '#EA580C',
    motif: '★ BROADWAY ★',
    lore: 'THEATER DISTRICT',
    badgeType: 'marquee-box',
  },
  Red: {
    // Kentucky, Indiana, Illinois - $220-$240 (Industrial Heartland / American Brick Avenues)
    titleFont: "800 35px 'Rockwell', 'Clarendon', 'Georgia', serif",
    priceFont: "800 42px 'Rockwell', 'Georgia', serif",
    titleColor: '#1E293B',
    priceColor: '#B91C1C',
    motif: '■ HEARTLAND ■',
    lore: 'INDUSTRIAL CAPITAL',
    badgeType: 'industrial-plate',
  },
  Yellow: {
    // Atlantic, Ventnor, Marvin Gardens - $260-$280 (Sun-Drenched Golden Coast / Grand Resort)
    titleFont: "700 35px 'Cinzel', 'Palatino Linotype', 'Book Antiqua', 'Georgia', serif",
    priceFont: "800 42px 'Cinzel', 'Palatino Linotype', serif",
    titleColor: '#713F12',
    priceColor: '#A16207',
    motif: '◆ PROMENADE ◆',
    lore: 'GOLDEN RESORT',
    badgeType: 'resort-plaque',
  },
  Green: {
    // Pacific, North Carolina, Pennsylvania - $300-$320 (Imperial Capital / Executive Banking Boulevards)
    titleFont: "800 34px 'Cinzel Decorative', 'Cinzel', 'Times New Roman', 'Baskerville', serif",
    priceFont: "900 44px 'Cinzel', 'Times New Roman', serif",
    titleColor: '#064E3B',
    priceColor: '#047857',
    motif: '🏛 EXECUTIVE 🏛',
    lore: 'EMBASSY ROW',
    badgeType: 'treasury-frame',
  },
  DarkBlue: {
    // Park Place, Boardwalk - $350-$400 (Billionaire’s Row / Ultra-Luxury Oceanfront Palaces)
    titleFont: "900 36px 'Playfair Display', 'Didot', 'Bodoni MT', 'Cinzel', serif",
    priceFont: "900 46px 'Playfair Display', 'Cinzel', serif",
    titleColor: '#0F172A',
    priceColor: '#1D4ED8',
    motif: '💎 PRESTIGE 💎',
    lore: "BILLIONAIRE'S ROW",
    badgeType: 'luxury-gem',
  },
  Railroad: {
    // Reading, Pennsylvania, B. & O., Short Line - $200 (Iron Horse Steam Locomotive Depots)
    titleFont: "900 34px 'Copperplate', 'Engravers MT', 'Impact', 'Rockwell', serif",
    priceFont: "800 42px 'Copperplate', 'Rockwell', serif",
    titleColor: '#0F172A',
    priceColor: '#1E293B',
    motif: '🚂 STEEL DEPOT 🚂',
    lore: 'TRANSIT LINE',
    badgeType: 'railroad-ticket',
  },
  Utility: {
    // Electric Co, Water Works - $150 (Municipal Dynamo & Hydro Pressure Grid)
    titleFont: "700 32px 'Space Mono', 'Courier New', 'Consolas', monospace",
    priceFont: "700 40px 'Space Mono', 'Courier New', monospace",
    titleColor: '#0F172A',
    priceColor: '#0891B2',
    motif: '⚡ MUNICIPAL ⚡',
    lore: 'PUBLIC WORKS',
    badgeType: 'utility-gauge',
  },
};

export const COLOR_HEX_STR: Record<string, string> = {
  Brown: '#8B4513',
  LightBlue: '#38BDF8',
  Pink: '#EC4899',
  Orange: '#F97316',
  Red: '#EF4444',
  Yellow: '#EAB308',
  Green: '#22C55E',
  DarkBlue: '#1E40AF',
  Railroad: '#475569',
  Utility: '#0EA5E9',
};
