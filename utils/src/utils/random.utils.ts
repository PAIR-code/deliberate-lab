/** Random utilities that support seeding. */

// ********************************************************************************************* //
//                                             SEED                                              //
// ********************************************************************************************* //

// Seed shared by all random functions.
let RANDOM_SEED = 0;

/** Initialize the seed with a custom value */
export const seed = (value: number) => {
  RANDOM_SEED = value;
};

/** Update the seed using a Linear Congruential Generator */
const next = (a = 1664525, b = 1013904223, m = 2 ** 32) => {
  RANDOM_SEED = (a * RANDOM_SEED + b) % m;
  return RANDOM_SEED;
};

// ********************************************************************************************* //
//                                       RANDOM FUNCTIONS                                        //
// ********************************************************************************************* //

/** Returns a random floating point value in [0, 1] */
export const random = () => next() / 2 ** 32;

/** Returns a random integer in [min, max] */
export const randint = (min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

/** Chooses a random value from an array. The array is not modified. */
export const choice = <T>(array: readonly T[]): T => {
  if (array.length === 0) {
    throw new Error('Cannot choose from an empty array');
  }

  return array[randint(0, array.length - 1)];
};

/** Chooses n random distinct values from an array. The array is not modified. */
export const choices = <T>(array: readonly T[], n: number): T[] => {
  if (array.length <= n) {
    throw new Error(
      `Cannot choose ${n} distinct values from an array of length ${array.length}`,
    );
  }

  const copy = [...array];
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const index = randint(0, copy.length - 1);
    result.push(copy[index]);
    copy.splice(index, 1);
  }

  return result;
};

/** Generates a random alphanumeric string of length n. */
export const randstr = (n: number): string => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters[randomIndex];
  }

  return result;
};
