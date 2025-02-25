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

/** Returns the rank index of a key in an object */
export const keyRank = (obj: Record<string, unknown>, key: string): number => {
  return Object.keys(obj).indexOf(key);
};

/** Shorthand to make code more readable */
export const valuesArray = <T>(obj: Record<string, T> | undefined): T[] => {
  return Object.values(obj ?? {});
};

/** Merge two arrays of objects into a new array, uniquely identifying objects by the given key.
 * When two objects have the same key, the one from the incoming array is kept.
 */
export const mergeByKey = <T extends object, K extends Indexable<T>>(
  previousArray: T[],
  incomingArray: T[],
  key: K,
): T[] => {
  return Object.values({
    ...lookupTable(previousArray, key),
    ...lookupTable(incomingArray, key),
  });
};

/** Converts a record into an object that allows record field merging into firestore.
 * When updating a firestore document, you can only merge top level attributes, not values nested in object attributes.
 * In order to merge nested values, you need to flatten the record into a single level object with keys that represent the path to the nested value.
 *
 * @example
 * const firestoreData = { answers: { q1: "maybe", q2: "maybe", q3: "maybe"}}
 * const answers = { q1: "yes", q2: "no" };  // Incoming data to be merged
 *
 * //    mergeableAnsers = { "answers.q1": "yes", "answers.q2": "no" };
 * const mergeableAnsers = mergeableRecord(answers, "answers")
 * firestoreDoc.set(mergeableAnsers, { merge: true });
 */
export const mergeableRecord = <K extends Index, V>(
  record: Record<K, V>,
  fieldName: string,
) => {
  const result: Record<string, V> = {};

  Object.entries(record).forEach(([key, value]) => {
    result[`${fieldName}.${key}`] = value as V;
  });

  return result;
};

/** Returns a list of all possible pairs of array elements without duplicates, assuming the array elements are distinct */
export const pairs = <T>(array: readonly T[]): [T, T][] => {
  const result: [T, T][] = [];

  for (let i = 0; i < array.length - 1; i++) {
    for (let j = i + 1; j < array.length; j++) {
      result.push([array[i], array[j]]);
    }
  }

  return result;
};
