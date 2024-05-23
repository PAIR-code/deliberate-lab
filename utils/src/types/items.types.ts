/** Item types. Items are shown to users, who need to choose and rate the most useful one */

/** Item displayed to the user. The name must be unique */
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
export const IMAGE_HEADER = 'https://raw.githubusercontent.com/PAIR-code/llm-mediation-experiments/main/webapp/src/assets/items/'
export const IMAGE_SUFFIX = "?raw=true";
// export const IMAGE_HEADER = '/assets/items/';
// export const IMAGE_SUFFIX = "";


export type ItemName = (typeof ITEM_NAMES)[number];
export const ITEMS: Record<ItemName, Item> = {
  sextant: {
    name: 'Compass',
    imageUrl: IMAGE_HEADER + 'compass.jpeg' + IMAGE_SUFFIX,
    ranking: 15, // Useless without tables and chronometer.
  },
  shavingMirror: {
    name: 'Mirror',
    imageUrl: IMAGE_HEADER + 'mirror.jpeg' + IMAGE_SUFFIX,
    ranking: 1,
  },
  mosquitoNetting: {
    name: 'Mosquito netting',
    imageUrl: IMAGE_HEADER + 'netting.jpeg' + IMAGE_SUFFIX,
    ranking: 14,
  },
  waterContainer: {
    name: 'Water (25L)',
    imageUrl: IMAGE_HEADER + 'water.jpeg' + IMAGE_SUFFIX,
    ranking: 3,
  },
  armyRations: {
    name: 'Case of army rations',
    imageUrl: IMAGE_HEADER + 'rations.jpeg' + IMAGE_SUFFIX,
    ranking: 4,
  },
  pacificMaps: {
    name: 'Maps of the Atlantic Ocean', 
    imageUrl: IMAGE_HEADER + 'map.jpeg' + IMAGE_SUFFIX,
    ranking: 13,
  },
  floatingSeatCushion: {
    name: 'Floating seat cushion',
    imageUrl: IMAGE_HEADER + 'cushion.jpeg' + IMAGE_SUFFIX,
    ranking: 9,
  },
  canOilMixture: {
    name: 'Can of oil/petrol (10L)',
    imageUrl: IMAGE_HEADER + 'oil.jpeg' + IMAGE_SUFFIX,
    ranking: 2,
  },
  transistorRadio: {
    name: 'Small transistor radio',
    imageUrl: IMAGE_HEADER + 'radio.jpeg' + IMAGE_SUFFIX,
    ranking: 12,
  },
  plasticSheeting: {
    name: 'Plastic sheeting',
    imageUrl: IMAGE_HEADER + 'sheeting.jpeg' + IMAGE_SUFFIX,
    ranking: 5, 
  },
  sharkRepellent: {
    name: 'Can of shark repellent',
    imageUrl: IMAGE_HEADER + 'repellent.jpeg' + IMAGE_SUFFIX,
    ranking: 10,
  },
  rubbingAlcohol: {
    name: 'Bottle of rubbing alcohol',
    imageUrl: IMAGE_HEADER + 'rubbing_alcohol.jpeg' + IMAGE_SUFFIX,
    ranking: 11,
  },
  nylonRope: {
    name: 'Nylon rope (15 ft.)',
    imageUrl: IMAGE_HEADER + 'rope.jpeg' + IMAGE_SUFFIX,
    ranking: 8,
  },
  chocolateBars: {
    name: 'Chocolate bars (2 boxes)',
    imageUrl: IMAGE_HEADER + 'chocolate.jpeg' + IMAGE_SUFFIX,
    ranking: 6,
  },
  fishingKit: {
    name: 'A fishing kit & pole',
    imageUrl: IMAGE_HEADER + 'fishing.jpeg' + IMAGE_SUFFIX,
    ranking: 7,
  },
};

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultItemPair = (): ItemPair => {
  return {
    item1: 'sextant',
    item2: 'shavingMirror',
  };
};
