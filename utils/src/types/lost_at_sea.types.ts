/** Lost at Sea types and utils. */

export interface LostAtSeaQuestion {
  id: number; // Note that the question id is not related to the question's position in the survey
  questionText: string;
  item1: ItemName;
  item2: ItemName;
}

/** Lost at Sea question answer. */
export interface LostAtSeaQuestionAnswer {
  id: number;
  choice: ItemName;
  confidence: number; // confidence in the choice (from 0 to 1)
}

/** Item displayed to the user (who rank the most useful one). */
export interface Item {
  name: string; // unique
  imageUrl: string;
  ranking: number; // 1 means it is the most valuable item.
}

export interface ItemPair {
  item1: ItemName;
  item2: ItemName;
}

export type ItemChoice = keyof ItemPair;

// ********************************************************************************************* //
//                                             ITEMS                                             //
// ********************************************************************************************* //

export const ITEM_NAMES = [
  'sextant',
  'shavingMirror',
  'mosquitoNetting',
  'waterContainer',
  'armyRations',
  'pacificMaps',
  'floatingSeatCushion',
  'canOilMixture',
  'transistorRadio',
  'plasticSheeting',
  'sharkRepellent',
  'rubbingAlcohol',
  'nylonRope',
  'chocolateBars',
  'fishingKit',
] as const;

// Use external hosting as a temporary workaround..
// URL_PREFIX.
const prefix = process.env.URL_PREFIX ?? '';
export const IMAGE_HEADER = prefix + 'assets/items/';

export type ItemName = (typeof ITEM_NAMES)[number];
export const ITEMS: Record<ItemName, Item> = {
  sextant: {
    name: 'Sextant',
    imageUrl: IMAGE_HEADER + 'sextant.jpg',
    ranking: 15, // Useless without tables and chronometer.
  },
  shavingMirror: {
    name: 'Mirror',
    imageUrl: IMAGE_HEADER + 'mirror.jpg',
    ranking: 1,
  },
  mosquitoNetting: {
    name: 'Mosquito netting',
    imageUrl: IMAGE_HEADER + 'netting.jpg',
    ranking: 14,
  },
  waterContainer: {
    name: 'Water (25L)',
    imageUrl: IMAGE_HEADER + 'water.jpg',
    ranking: 3,
  },
  armyRations: {
    name: 'Case of army rations',
    imageUrl: IMAGE_HEADER + 'rations.jpg',
    ranking: 4,
  },
  pacificMaps: {
    name: 'Maps of the Atlantic Ocean',
    imageUrl: IMAGE_HEADER + 'map.jpg',
    ranking: 13,
  },
  floatingSeatCushion: {
    name: 'Floating seat cushion',
    imageUrl: IMAGE_HEADER + 'cushion.jpg',
    ranking: 9,
  },
  canOilMixture: {
    name: 'Can of oil/petrol (10L)',
    imageUrl: IMAGE_HEADER + 'oil.jpg',
    ranking: 2,
  },
  transistorRadio: {
    name: 'Small transistor radio',
    imageUrl: IMAGE_HEADER + 'radio.jpg',
    ranking: 12,
  },
  plasticSheeting: {
    name: 'Plastic sheeting',
    imageUrl: IMAGE_HEADER + 'sheeting.jpg',
    ranking: 5,
  },
  sharkRepellent: {
    name: 'Can of shark repellent',
    imageUrl: IMAGE_HEADER + 'repellent.jpg',
    ranking: 10,
  },
  rubbingAlcohol: {
    name: 'Bottle of rubbing alcohol',
    imageUrl: IMAGE_HEADER + 'rubbing_alcohol.jpg',
    ranking: 11,
  },
  nylonRope: {
    name: 'Nylon rope (15 ft.)',
    imageUrl: IMAGE_HEADER + 'rope.jpg',
    ranking: 8,
  },
  chocolateBars: {
    name: 'Chocolate bars (2 boxes)',
    imageUrl: IMAGE_HEADER + 'chocolate.jpg',
    ranking: 6,
  },
  fishingKit: {
    name: 'A fishing kit & pole',
    imageUrl: IMAGE_HEADER + 'fishing.jpg',
    ranking: 7,
  },
};

/**
 * Get Lost at Sea item item pair ranking answer.
 */
export function getLostAtSeaPairAnswer(item1: ItemName, item2: ItemName) {
  const ranking1 = getLostAtSeaItemRanking(item1);
  const ranking2 = getLostAtSeaItemRanking(item2);

  return (ranking1 < ranking2) ? item1 : item2;
}

/**
 * Get Lost at Sea item ranking.
 */
export function getLostAtSeaItemRanking(item: ItemName) {
  return ITEMS[item].ranking;
}
