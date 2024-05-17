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
    name: 'sextant',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Sextant_von_Alexander_von_Humboldt.jpg/640px-Sextant_von_Alexander_von_Humboldt.jpg',
  },
  shavingMirror: {
    name: 'shavingMirror',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/3/32/Mirror%2C_shaving_%28AM_880330-3%29.jpg',
  },
  mosquitoNetting: {
    name: 'mosquitoNetting',
    imageUrl:
      'https://commons.wikimedia.org/wiki/Category:Mosquito_nets#/media/File:Net,_mosquito_(AM_2015.20.7-1).jpg',
  },
  waterContainer: {
    name: '25 liter container of Water',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/c/c4/PikiWiki_Israel_65236_container_for_water.jpg',
  },
  armyRations: {
    name: 'Case of Army Rations',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/0/00/24_Hour_Multi_Climate_Ration_Pack_MOD_45157289.jpg',
  },
  pacificMaps: {
    name: 'Maps of the Pacific Ocean', // ToDo - Change to Atlantic ocean?
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Kepler-world.jpg',
  },
  floatingSeatCushion: {
    name: 'Floating Seat Cushion',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/e/ec/EM_USAIRWAYS_EXPRESS_CRJ-200_%282878446162%29.jpg',
  },
  canOilMixture: {
    name: '10 liter can of Oil/Petrol mixture',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/3/33/Britische_copy_wehrmacht-einheitskanister_1943_jerrycan.jpg',
  },
  transistorRadio: {
    name: 'Small Transistor Radio',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/b/b6/Vintage_Philco_6-Transistor_Radio%2C_Model_T76-124%2C_1958%2C_Leather_Case_%288385122630%29.jpg',
  },
  plasticSheeting: {
    name: 'Plastic Sheeting',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Film_StandardForm001.jpg',
  },
  sharkRepellent: {
    name: 'Can of Shark Repellent',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Konservendose-1.jpg',
  },
  rubbingAlcohol: {
    name: 'One bottle rubbing alcohol',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Rubbing_alcohol.JPG',
  },
  nylonRope: {
    name: '15 ft. of Nylon Rope',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Nylon_Rope.JPG',
  },
  chocolateBars: {
    name: '2 boxes of Chocolate Bars',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/91/2Tablettes_Grand_crus.png',
  },
  fishingKit: {
    name: 'An ocean Fishing Kit & Pole',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Fishing_time_at_sea.jpg',
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
