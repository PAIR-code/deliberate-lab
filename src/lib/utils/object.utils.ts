/** All types that can safely be used to index an object */
export type Index = string | number | symbol;

/** Type union of all keys of Obj that extend the type Type */
export type KeyOfType<Obj, Type> = {
  [K in keyof Obj]: Obj[K] extends Type ? K : never;
}[keyof Obj];

/** Type union of all keys in Obj that can be used as indexes */
export type Indexable<Obj> = KeyOfType<Obj, Index>;

/** Create a lookup table for an object list, indexed by the given key */
export const lookupTable = <
  Type extends object,
  KeyName extends Indexable<Type>,
  KeyType extends Type[KeyName] & Index,
>(
  list: Type[],
  key: KeyName,
): Record<KeyType, Type> => {
  const table: Record<KeyType, Type> = {} as Record<KeyType, Type>;

  list.forEach((item) => {
    table[item[key] as KeyType] = item;
  });
  return table;
};

/** Exclude all fields of type U from type T */
export type ExcludeProps<T, U> = {
  [P in Exclude<keyof T, keyof U>]: T[P];
};

/** Iterate through all keys of an object in order, and returns a key -> index map. */
export const keysRanking = (obj: object): Record<string, number> => {
  const keys = Object.keys(obj);
  const ranking: Record<string, number> = {} as Record<string, number>;

  keys.forEach((key, index) => {
    ranking[key] = index;
  });

  return ranking;
};
