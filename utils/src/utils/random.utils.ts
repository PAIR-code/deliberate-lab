/** Random utilities that support seeding. */

/** Enum for seed strategies */
export enum SeedStrategy {
  EXPERIMENT = 'experiment',
  COHORT = 'cohort',
  PARTICIPANT = 'participant',
  CUSTOM = 'custom',
}

/** Configuration for shuffling items with different seed strategies */
export interface ShuffleConfig {
  shuffle: boolean;
  seed: SeedStrategy;
  customSeed: string; // Always set, but only used when seed is SeedStrategy.CUSTOM
}

export function createShuffleConfig(config: {
  shuffle: boolean;
  seed: SeedStrategy;
  customSeed?: string;
}): ShuffleConfig {
  return {
    shuffle: config.shuffle,
    seed: config.seed,
    customSeed: config.customSeed ?? '',
  };
}

// ********************************************************************************************* //
//                                             SEED                                              //
// ********************************************************************************************* //

// Seed shared by all random functions.
let RANDOM_SEED = 0;

/**
 * Simple hash: sum of character codes.
 * Used as fallback in browser environments.
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += str.charCodeAt(i);
  }
  return hash;
};

// Try to load Node.js crypto module for better hash distribution.
// Falls back to simpleHash in browser environments (where require is unavailable).
let nodeCrypto: typeof import('crypto') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  nodeCrypto = require('crypto');
} catch {
  // Not in Node.js or crypto unavailable
}

/**
 * Hash a string to a 32-bit integer.
 * Uses Node's crypto module when available (better distribution),
 * falls back to simple character code summation in browser environments.
 */
const hashString = (str: string): number => {
  if (nodeCrypto) {
    const hash = nodeCrypto.createHash('md5').update(str).digest();
    return hash.readUInt32BE(0);
  }
  return simpleHash(str);
};

/** Initialize the seed with a custom value (number or string) */
export const seed = (value: number | string) => {
  if (typeof value === 'string') {
    RANDOM_SEED = hashString(value);
  } else {
    RANDOM_SEED = value >>> 0; // Ensure non-negative 32-bit integer
  }
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
export const choices = <T>(
  array: readonly T[],
  n: number,
  seedValue?: string | number,
): T[] => {
  if (array.length < n) {
    throw new Error(
      `Cannot choose ${n} distinct values from an array of length ${array.length}`,
    );
  }

  if (seedValue !== undefined) {
    seed(seedValue);
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

/** Shuffles an array using a string seed for consistent results. */
export const shuffleWithSeed = <T>(
  array: readonly T[],
  seedString: string = '',
): T[] => {
  return choices(array, array.length, seedString);
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

// ********************************************************************************************* //
//                                    WEIGHTED SELECTION                                         //
// ********************************************************************************************* //

/**
 * Normalize weights to sum to 1.
 * If weights are not provided or don't match values length, returns equal weights.
 */
export const normalizeWeights = (
  numValues: number,
  weights?: number[],
): number[] => {
  if (!weights || weights.length !== numValues) {
    return Array(numValues).fill(1 / numValues);
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    return Array(numValues).fill(1 / numValues);
  }

  return weights.map((w) => w / totalWeight);
};

/**
 * Choose one value from an array using weighted probabilities.
 * If weights are not provided, uses equal probability (same as choice()).
 *
 * @param array Array of values to choose from
 * @param weights Optional weights for each value (must match array length)
 * @param seedValue Optional seed for reproducible results
 */
export const weightedChoice = <T>(
  array: readonly T[],
  weights?: number[],
  seedValue?: string | number,
): T => {
  if (array.length === 0) {
    throw new Error('Cannot choose from an empty array');
  }

  if (!weights || weights.length !== array.length) {
    // Fall back to unweighted choice
    if (seedValue !== undefined) {
      seed(seedValue);
    }
    return choice(array);
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    if (seedValue !== undefined) {
      seed(seedValue);
    }
    return choice(array);
  }

  if (seedValue !== undefined) {
    seed(seedValue);
  }

  const randomPosition = random() * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < array.length; i++) {
    cumulative += weights[i];
    if (randomPosition < cumulative) {
      return array[i];
    }
  }

  // Fallback (shouldn't reach here due to floating point)
  return array[array.length - 1];
};

/**
 * Select a value using weighted round-robin based on position.
 * With weights [2, 1], the cycle is: A, A, B, A, A, B, ...
 *
 * @param array Array of values to choose from
 * @param position Current position in the sequence (e.g., participant count)
 * @param weights Optional weights for each value (must match array length)
 */
export const weightedRoundRobin = <T>(
  array: readonly T[],
  position: number,
  weights?: number[],
): T => {
  if (array.length === 0) {
    throw new Error('Cannot choose from an empty array');
  }

  if (!weights || weights.length !== array.length) {
    // Fall back to simple modulo
    return array[position % array.length];
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    return array[position % array.length];
  }

  // Position within the weight cycle
  const positionInCycle = position % totalWeight;

  // Find which value this position falls into
  let cumulative = 0;
  for (let i = 0; i < array.length; i++) {
    cumulative += weights[i];
    if (positionInCycle < cumulative) {
      return array[i];
    }
  }

  // Fallback (shouldn't reach here)
  return array[array.length - 1];
};
