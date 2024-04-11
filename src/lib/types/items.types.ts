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
