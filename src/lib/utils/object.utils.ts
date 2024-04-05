/** All types that can safely be used to index an object */
export type Index = string | number | symbol;

/** Type union of all keys of Obj that extend the type Type */
export type KeyOfType<Obj, Type> = {
  [K in keyof Obj]: Obj[K] extends Type ? K : never;
}[keyof Obj];

/** Type union of all keys in Obj that can be used as indexes */
export type Indexable<Obj> = KeyOfType<Obj, Index>;

/** Create a lookup table for an object list, indexed by the given key */
export const lookupTable = <T extends object>(list: T[], key: Indexable<T>): Record<Index, T> => {
  const table: Record<Index, T> = {};

  list.forEach((item) => {
    table[item[key] as Index] = item;
  });
  return table;
};
