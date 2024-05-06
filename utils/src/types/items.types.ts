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

export type ItemName = 'compas' | 'blanket' | 'lighter';
export const ITEMS: Record<ItemName, Item> = {
  blanket: {
    name: 'blanket',
    imageUrl:
      'https://img.freepik.com/free-psd/blanket-isolated-transparent-background_191095-10098.jpg?size=338&ext=jpg&ga=GA1.1.1700460183.1712448000&semt=sph',
  },
  compas: {
    name: 'compas',
    imageUrl: 'https://m.media-amazon.com/images/I/81NUeKWdiQL._AC_UF1000,1000_QL80_.jpg',
  },
  lighter: {
    name: 'lighter',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/White_lighter_with_flame.JPG/1200px-White_lighter_with_flame.JPG',
  },
};

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultItemPair = (): ItemPair => {
  return {
    item1: 'blanket',
    item2: 'compas',
  };
};
