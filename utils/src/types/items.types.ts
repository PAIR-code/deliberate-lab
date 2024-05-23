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
export type ItemName = (typeof ITEM_NAMES)[number];
export const ITEMS: Record<ItemName, Item> = {
  sextant: {
    name: 'Compass',
    imageUrl:
      '/assets/items/compass.jpeg',
    ranking: 15, // Useless without tables and chronometer.
  },
  shavingMirror: {
    name: 'Mirror',
    imageUrl:
      '/assets/items/mirror.jpeg',
    ranking: 1,
  },
  mosquitoNetting: {
    name: 'Mosquito netting',
    imageUrl:
      '/assets/items/netting.jpeg',
    ranking: 14,
  },
  waterContainer: {
    name: 'Water (25L)',
    imageUrl:
      '/assets/items/water.jpeg',
    ranking: 3,
  },
  armyRations: {
    name: 'Case of army rations',
    imageUrl: '/assets/items/rations.jpeg',
    ranking: 4,
  },
  pacificMaps: {
    name: 'Maps of the Atlantic Ocean', 
    imageUrl: '/assets/items/map.jpeg',
    ranking: 13,
  },
  floatingSeatCushion: {
    name: 'Floating seat cushion',
    imageUrl: '/assets/items/cushion.jpeg',
    ranking: 9,
  },
  canOilMixture: {
    name: 'Can of oil/petrol (10L)',
    imageUrl: '/assets/items/oil.jpeg',
    ranking: 2,
  },
  transistorRadio: {
    name: 'Small transistor radio',
    imageUrl: '/assets/items/radio.jpeg',
    ranking: 12,
  },
  plasticSheeting: {
    name: 'Plastic sheeting',
    imageUrl: '/assets/items/sheeting.jpeg',
    ranking: 5, 
  },
  sharkRepellent: {
    name: 'Can of shark repellent',
    imageUrl: '/assets/items/repellent.jpeg',
    ranking: 10,
  },
  rubbingAlcohol: {
    name: 'Bottle of rubbing alcohol',
    imageUrl: '/assets/items/rubbing_alcohol.jpeg',
    ranking: 11,
  },
  nylonRope: {
    name: 'Nylon rope (15 ft.)',
    imageUrl: '/assets/items/rope.jpeg',
    ranking: 8,
  },
  chocolateBars: {
    name: 'Chocolate bars (2 boxes)',
    imageUrl: '/assets/items/chocolate.jpeg',
    ranking: 6,
  },
  fishingKit: {
    name: 'A fishing kit & pole',
    imageUrl: '/assets/items/fishing.jpeg',
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
