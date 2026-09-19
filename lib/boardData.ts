import { BoardSpace, Property } from '@/types/monopoly';

export const INITIAL_BOARD_SPACES: BoardSpace[] = [
  // SIDE 1 (Bottom, indices 0..9)
  { index: 0, name: 'GO', side: 1, type: 'GO' },
  { index: 1, name: 'Mediterranean Ave', side: 1, type: 'PROPERTY', colorGroup: 'Brown', propertyId: 'mediterranean_ave' },
  { index: 2, name: 'Community Chest', side: 1, type: 'COMMUNITY_CHEST' },
  { index: 3, name: 'Baltic Ave', side: 1, type: 'PROPERTY', colorGroup: 'Brown', propertyId: 'baltic_ave' },
  { index: 4, name: 'Income Tax', side: 1, type: 'TAX', taxAmount: 200 },
  { index: 5, name: 'Reading Railroad', side: 1, type: 'PROPERTY', colorGroup: 'Railroad', propertyId: 'reading_railroad' },
  { index: 6, name: 'Oriental Ave', side: 1, type: 'PROPERTY', colorGroup: 'LightBlue', propertyId: 'oriental_ave' },
  { index: 7, name: 'Chance', side: 1, type: 'CHANCE' },
  { index: 8, name: 'Vermont Ave', side: 1, type: 'PROPERTY', colorGroup: 'LightBlue', propertyId: 'vermont_ave' },
  { index: 9, name: 'Connecticut Ave', side: 1, type: 'PROPERTY', colorGroup: 'LightBlue', propertyId: 'connecticut_ave' },

  // SIDE 2 (Left, indices 10..19)
  { index: 10, name: 'Jail / Just Visiting', side: 2, type: 'JAIL' },
  { index: 11, name: 'St. Charles Place', side: 2, type: 'PROPERTY', colorGroup: 'Pink', propertyId: 'st_charles_place' },
  { index: 12, name: 'Electric Company', side: 2, type: 'PROPERTY', colorGroup: 'Utility', propertyId: 'electric_company' },
  { index: 13, name: 'States Ave', side: 2, type: 'PROPERTY', colorGroup: 'Pink', propertyId: 'states_ave' },
  { index: 14, name: 'Virginia Ave', side: 2, type: 'PROPERTY', colorGroup: 'Pink', propertyId: 'virginia_ave' },
  { index: 15, name: 'Pennsylvania Railroad', side: 2, type: 'PROPERTY', colorGroup: 'Railroad', propertyId: 'penn_railroad' },
  { index: 16, name: 'St. James Place', side: 2, type: 'PROPERTY', colorGroup: 'Orange', propertyId: 'st_james_place' },
  { index: 17, name: 'Community Chest', side: 2, type: 'COMMUNITY_CHEST' },
  { index: 18, name: 'Tennessee Ave', side: 2, type: 'PROPERTY', colorGroup: 'Orange', propertyId: 'tennessee_ave' },
  { index: 19, name: 'New York Ave', side: 2, type: 'PROPERTY', colorGroup: 'Orange', propertyId: 'new_york_ave' },

  // SIDE 3 (Top, indices 20..29)
  { index: 20, name: 'Free Parking', side: 3, type: 'FREE_PARKING' },
  { index: 21, name: 'Kentucky Ave', side: 3, type: 'PROPERTY', colorGroup: 'Red', propertyId: 'kentucky_ave' },
  { index: 22, name: 'Chance', side: 3, type: 'CHANCE' },
  { index: 23, name: 'Indiana Ave', side: 3, type: 'PROPERTY', colorGroup: 'Red', propertyId: 'indiana_ave' },
  { index: 24, name: 'Illinois Ave', side: 3, type: 'PROPERTY', colorGroup: 'Red', propertyId: 'illinois_ave' },
  { index: 25, name: 'B. & O. Railroad', side: 3, type: 'PROPERTY', colorGroup: 'Railroad', propertyId: 'b_and_o_railroad' },
  { index: 26, name: 'Atlantic Ave', side: 3, type: 'PROPERTY', colorGroup: 'Yellow', propertyId: 'atlantic_ave' },
  { index: 27, name: 'Ventnor Ave', side: 3, type: 'PROPERTY', colorGroup: 'Yellow', propertyId: 'ventnor_ave' },
  { index: 28, name: 'Water Works', side: 3, type: 'PROPERTY', colorGroup: 'Utility', propertyId: 'water_works' },
  { index: 29, name: 'Marvin Gardens', side: 3, type: 'PROPERTY', colorGroup: 'Yellow', propertyId: 'marvin_gardens' },

  // SIDE 4 (Right, indices 30..39)
  { index: 30, name: 'Go To Jail', side: 4, type: 'GO_TO_JAIL' },
  { index: 31, name: 'Pacific Ave', side: 4, type: 'PROPERTY', colorGroup: 'Green', propertyId: 'pacific_ave' },
  { index: 32, name: 'North Carolina Ave', side: 4, type: 'PROPERTY', colorGroup: 'Green', propertyId: 'north_carolina_ave' },
  { index: 33, name: 'Community Chest', side: 4, type: 'COMMUNITY_CHEST' },
  { index: 34, name: 'Pennsylvania Ave', side: 4, type: 'PROPERTY', colorGroup: 'Green', propertyId: 'pennsylvania_ave' },
  { index: 35, name: 'Short Line Railroad', side: 4, type: 'PROPERTY', colorGroup: 'Railroad', propertyId: 'short_line_railroad' },
  { index: 36, name: 'Chance', side: 4, type: 'CHANCE' },
  { index: 37, name: 'Park Place', side: 4, type: 'PROPERTY', colorGroup: 'DarkBlue', propertyId: 'park_place' },
  { index: 38, name: 'Luxury Tax', side: 4, type: 'TAX', taxAmount: 100 },
  { index: 39, name: 'Boardwalk', side: 4, type: 'PROPERTY', colorGroup: 'DarkBlue', propertyId: 'boardwalk' },
];

export const INITIAL_PROPERTIES: Property[] = [
  // Brown (Side 1)
  { id: 'mediterranean_ave', name: 'Mediterranean Ave', colorGroup: 'Brown', side: 1, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 60, baseRent: 2, houseCost: 50, rentLevels: [2, 10, 30, 90, 160, 250], modifiedBy: [] },
  { id: 'baltic_ave', name: 'Baltic Ave', colorGroup: 'Brown', side: 1, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 60, baseRent: 4, houseCost: 50, rentLevels: [4, 20, 60, 180, 320, 450], modifiedBy: [] },

  // Light Blue (Side 1)
  { id: 'oriental_ave', name: 'Oriental Ave', colorGroup: 'LightBlue', side: 1, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 100, baseRent: 6, houseCost: 50, rentLevels: [6, 30, 90, 270, 400, 550], modifiedBy: [] },
  { id: 'vermont_ave', name: 'Vermont Ave', colorGroup: 'LightBlue', side: 1, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 100, baseRent: 6, houseCost: 50, rentLevels: [6, 30, 90, 270, 400, 550], modifiedBy: [] },
  { id: 'connecticut_ave', name: 'Connecticut Ave', colorGroup: 'LightBlue', side: 1, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 120, baseRent: 8, houseCost: 50, rentLevels: [8, 40, 100, 300, 450, 600], modifiedBy: [] },

  // Pink (Side 2)
  { id: 'st_charles_place', name: 'St. Charles Place', colorGroup: 'Pink', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 140, baseRent: 10, houseCost: 100, rentLevels: [10, 50, 150, 450, 625, 750], modifiedBy: [] },
  { id: 'states_ave', name: 'States Ave', colorGroup: 'Pink', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 140, baseRent: 10, houseCost: 100, rentLevels: [10, 50, 150, 450, 625, 750], modifiedBy: [] },
  { id: 'virginia_ave', name: 'Virginia Ave', colorGroup: 'Pink', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 160, baseRent: 12, houseCost: 100, rentLevels: [12, 60, 180, 500, 700, 900], modifiedBy: [] },

  // Orange (Side 2)
  { id: 'st_james_place', name: 'St. James Place', colorGroup: 'Orange', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 180, baseRent: 14, houseCost: 100, rentLevels: [14, 70, 200, 550, 750, 950], modifiedBy: [] },
  { id: 'tennessee_ave', name: 'Tennessee Ave', colorGroup: 'Orange', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 180, baseRent: 14, houseCost: 100, rentLevels: [14, 70, 200, 550, 750, 950], modifiedBy: [] },
  { id: 'new_york_ave', name: 'New York Ave', colorGroup: 'Orange', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 200, baseRent: 16, houseCost: 100, rentLevels: [16, 80, 220, 600, 800, 1000], modifiedBy: [] },

  // Red (Side 3)
  { id: 'kentucky_ave', name: 'Kentucky Ave', colorGroup: 'Red', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 220, baseRent: 18, houseCost: 150, rentLevels: [18, 90, 250, 700, 875, 1050], modifiedBy: [] },
  { id: 'indiana_ave', name: 'Indiana Ave', colorGroup: 'Red', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 220, baseRent: 18, houseCost: 150, rentLevels: [18, 90, 250, 700, 875, 1050], modifiedBy: [] },
  { id: 'illinois_ave', name: 'Illinois Ave', colorGroup: 'Red', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 240, baseRent: 20, houseCost: 150, rentLevels: [20, 100, 300, 750, 925, 1100], modifiedBy: [] },

  // Yellow (Side 3)
  { id: 'atlantic_ave', name: 'Atlantic Ave', colorGroup: 'Yellow', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 260, baseRent: 22, houseCost: 150, rentLevels: [22, 110, 330, 800, 975, 1150], modifiedBy: [] },
  { id: 'ventnor_ave', name: 'Ventnor Ave', colorGroup: 'Yellow', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 260, baseRent: 22, houseCost: 150, rentLevels: [22, 110, 330, 800, 975, 1150], modifiedBy: [] },
  { id: 'marvin_gardens', name: 'Marvin Gardens', colorGroup: 'Yellow', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 280, baseRent: 24, houseCost: 150, rentLevels: [24, 120, 360, 850, 1025, 1200], modifiedBy: [] },

  // Green (Side 4)
  { id: 'pacific_ave', name: 'Pacific Ave', colorGroup: 'Green', side: 4, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 300, baseRent: 26, houseCost: 200, rentLevels: [26, 130, 390, 900, 1100, 1275], modifiedBy: [] },
  { id: 'north_carolina_ave', name: 'North Carolina Ave', colorGroup: 'Green', side: 4, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 300, baseRent: 26, houseCost: 200, rentLevels: [26, 130, 390, 900, 1100, 1275], modifiedBy: [] },
  { id: 'pennsylvania_ave', name: 'Pennsylvania Ave', colorGroup: 'Green', side: 4, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 320, baseRent: 28, houseCost: 200, rentLevels: [28, 150, 450, 1000, 1200, 1400], modifiedBy: [] },

  // Dark Blue (Side 4)
  { id: 'park_place', name: 'Park Place', colorGroup: 'DarkBlue', side: 4, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 350, baseRent: 35, houseCost: 200, rentLevels: [35, 175, 500, 1100, 1300, 1500], modifiedBy: [] },
  { id: 'boardwalk', name: 'Boardwalk', colorGroup: 'DarkBlue', side: 4, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 400, baseRent: 50, houseCost: 200, rentLevels: [50, 200, 600, 1400, 1700, 2000], modifiedBy: [] },

  // Railroads (25 rent x number of railroads owned)
  { id: 'reading_railroad', name: 'Reading Railroad', colorGroup: 'Railroad', side: 1, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 200, baseRent: 25, houseCost: 0, rentLevels: [25, 50, 100, 200, 200, 200], modifiedBy: [] },
  { id: 'penn_railroad', name: 'Pennsylvania Railroad', colorGroup: 'Railroad', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 200, baseRent: 25, houseCost: 0, rentLevels: [25, 50, 100, 200, 200, 200], modifiedBy: [] },
  { id: 'b_and_o_railroad', name: 'B. & O. Railroad', colorGroup: 'Railroad', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 200, baseRent: 25, houseCost: 0, rentLevels: [25, 50, 100, 200, 200, 200], modifiedBy: [] },
  { id: 'short_line_railroad', name: 'Short Line Railroad', colorGroup: 'Railroad', side: 4, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 200, baseRent: 25, houseCost: 0, rentLevels: [25, 50, 100, 200, 200, 200], modifiedBy: [] },

  // Utilities
  { id: 'electric_company', name: 'Electric Company', colorGroup: 'Utility', side: 2, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 150, baseRent: 15, houseCost: 0, rentLevels: [15, 30, 45, 60, 75, 90], modifiedBy: [] },
  { id: 'water_works', name: 'Water Works', colorGroup: 'Utility', side: 3, ownerId: null, houses: 0, hotel: false, isMortgaged: false, basePrice: 150, baseRent: 15, houseCost: 0, rentLevels: [15, 30, 45, 60, 75, 90], modifiedBy: [] },
];

export const COLOR_GROUP_COUNTS: Record<string, number> = {
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

export const COLOR_GROUP_HEX: Record<string, string> = {
  Brown: '#8B4513',
  LightBlue: '#38BDF8',
  Pink: '#EC4899',
  Orange: '#F97316',
  Red: '#EF4444',
  Yellow: '#EAB308',
  Green: '#22C55E',
  DarkBlue: '#1E3A8A',
  Railroad: '#475569',
  Utility: '#64748B',
};
