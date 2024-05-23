/** Item types. Items are shown to users, who need to choose and rate the most useful one */

/** Item displayed to the user. The name must be unique */
export interface Item {
  name: string; // unique
  imageUrl: string;
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
      '/assets/items/compass.jpeg'
  },
  shavingMirror: {
    name: 'Mirror',
    imageUrl:
      '/assets/items/mirror.jpeg'
  },
  mosquitoNetting: {
    name: 'Mosquito netting',
    imageUrl:
      '/assets/items/netting.jpeg'
  },
  waterContainer: {
    name: 'Water (25L)',
    imageUrl:
      '/assets/items/water.jpeg'
  },
  armyRations: {
    name: 'Case of army rations',
    imageUrl: '/assets/items/rations.jpeg'
  },
  pacificMaps: {
    name: 'Maps of the Atlantic Ocean', 
    imageUrl: '/assets/items/map.jpeg'
  },
  floatingSeatCushion: {
    name: 'Floating seat cushion',
    imageUrl: '/assets/items/cushion.jpeg'
  },
  canOilMixture: {
    name: 'Can of oil/petrol (10L)',
    imageUrl: '/assets/items/oil.jpeg'
  },
  transistorRadio: {
    name: 'Small transistor radio',
    imageUrl: '/assets/items/radio.jpeg'
  },
  plasticSheeting: {
    name: 'Plastic sheeting',
    imageUrl: '/assets/items/sheeting.jpeg'
  },
  sharkRepellent: {
    name: 'Can of shark repellent',
    imageUrl: '/assets/items/repellent.jpeg'
  },
  rubbingAlcohol: {
    name: 'Bottle of rubbing alcohol',
    imageUrl: '/assets/items/rubbing_alcohol.jpeg'
  },
  nylonRope: {
    name: 'Nylon rope (15 ft.)',
    imageUrl: '/assets/items/rope.jpeg'
  },
  chocolateBars: {
    name: 'Chocolate bars (2 boxes)',
    imageUrl: '/assets/items/chocolate.jpeg'
  },
  fishingKit: {
    name: 'A fishing kit & pole',
    imageUrl: '/assets/items/fishing.jpeg'
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
