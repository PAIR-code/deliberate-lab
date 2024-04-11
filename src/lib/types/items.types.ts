/** Item types. Items are shown to users, who need to choose and rate the most useful one */

/** Item displayed to the user. The name must be unique */
export interface Item {
  name: string; // unique
  imageUrl: string;
}

export interface ItemPair {
  item1: Item;
  item2: Item;
}

export type ItemChoice = keyof ItemPair;

export interface ItemPairWithRatings extends ItemPair {
  choice: ItemChoice | null;
  confidence: number | null; // 0 = 50/50, 1 = most confident
}

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultItemRating = (): ItemPairWithRatings => {
  return {
    item1: {
      name: '',
      imageUrl: '',
    },
    item2: {
      name: '',
      imageUrl: '',
    },
    choice: null,
    confidence: null,
  };
};

export const compas: Item = {
  name: 'compas',
  imageUrl: 'https://m.media-amazon.com/images/I/81NUeKWdiQL._AC_UF1000,1000_QL80_.jpg',
};

export const lighter: Item = {
  name: 'lighter',
  imageUrl:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/White_lighter_with_flame.JPG/1200px-White_lighter_with_flame.JPG',
};

export const blanket: Item = {
  name: 'blanket',
  imageUrl:
    'https://m.media-amazon.com/images/W/MEDIAX_792452-T1/images/I/81-x+F2EsHL._AC_UF894,1000_QL80_.jpg',
};
