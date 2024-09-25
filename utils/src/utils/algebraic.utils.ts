export interface AlgebraicData<Data> {
  kind: string;
  data: Data;
}

// Elaborate data getter that in the presense of a kind gets the right kind of data.
export function getKindData<T extends AlgebraicData<object>, K extends T['kind']>(
  kind: K,
  foo: T,
): T & { kind: K } extends AlgebraicData<infer Data> ? Data : never {
  return foo.data as T & { kind: K } extends AlgebraicData<infer Data> ? Data : never;
}

// Elaborate data getter that in the presense of a kind gets the right kind of data.
export function castToKind<T extends { kind: string }, K extends T['kind']>(
  kind: K,
  foo: T,
): T & { kind: K } {
  return foo as T & { kind: K };
}

// When the field "kind" is used to denote a type (a discriminated union), then this
// returns null if the object is not of that kind, and otherwise returns the object
// (but with the more specific type)
export function tryCast<T extends { kind: string }, K extends T['kind']>(
  kind: K,
  objMaybeOfKind: T,
): (T & { kind: K }) | null {
  if (objMaybeOfKind.kind === kind) {
    return objMaybeOfKind as T & { kind: K };
  } else {
    return null;
  }
}

export function assertCast<T extends { kind: string }, K extends T['kind']>(
  objMaybeOfKind: T,
  kind: K,
): T & { kind: K } {
  if (objMaybeOfKind.kind === kind) {
    return objMaybeOfKind as T & { kind: K };
  } else {
    throw new Error(`Given object with kind=${objMaybeOfKind.kind} needs to have kind=${kind}`);
  }
}

export function assertCastOrUndefined<T extends { kind: string }, K extends T['kind']>(
  objMaybeOfKind: T | undefined,
  kind: K,
): (T & { kind: K }) | undefined {
  if (objMaybeOfKind === undefined) {
    return undefined;
  } else if (objMaybeOfKind.kind === kind) {
    return objMaybeOfKind as T & { kind: K };
  } else {
    throw new Error(`Given object with kind=${objMaybeOfKind.kind} needs to have kind=${kind}`);
  }
}

export function isOfKind<T extends { kind: string }, K extends T['kind']>(
  objMaybeOfKind: T,
  kind: K,
): objMaybeOfKind is T & { kind: K } {
  return objMaybeOfKind.kind === kind;
}

let _uniqueId = 0;

/** Returns a unique ID */
export const uniqueId = (prefix?: string) => {
  return prefix ? `${prefix}${_uniqueId++}` : `${_uniqueId++}`;
};

/**
 * Runs a Condorcet election on a set of rankings.
 */

export function getCondorcetElectionWinner(rankings: Record<string, string[]>) {
  // Extract unique candidates from all rankings
  const candidates = new Set<string>();
  Object.values(rankings).forEach((ranking) => {
    ranking.forEach((candidate) => candidates.add(candidate));
  });

  const participants = Array.from(candidates);
  const wins: Record<string, number> = {};

  // Initialize win counts
  participants.forEach((candidate) => {
    wins[candidate] = 0;
  });

  // Compare each candidate against each other
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const p1 = participants[i];
      const p2 = participants[j];

      let p1Wins = 0;
      let p2Wins = 0;

      // Determine the winner in each ranking
      Object.values(rankings).forEach((ranking) => {
        const indexP1 = ranking.indexOf(p1);
        const indexP2 = ranking.indexOf(p2);

        if (indexP1 < indexP2) {
          p1Wins++;
        } else {
          p2Wins++;
        }
      });

      // Update the win counts
      if (p1Wins > p2Wins) {
        wins[p1]++;
      } else if (p2Wins > p1Wins) {
        wins[p2]++;
      }
      // In case of a tie, no win count is updated
    }
  }

  // Find the participant with the most wins
  let winner: string | null = null;
  let maxWins = -1;
  for (const candidate in wins) {
    if (wins[candidate] > maxWins) {
      maxWins = wins[candidate];
      winner = candidate;
    }
  }

  return winner ?? participants[0] ?? '';
}

export function getTimeElapsedInMinutes(timestamp: { seconds: number, nanoseconds: number }) {
    const now = Date.now();

    // Convert the timestamp to milliseconds
    const timestampMillis = (timestamp.seconds * 1000) + Math.floor(timestamp.nanoseconds / 1000000);
  
    // Calculate the difference in milliseconds
    const diffMillis = now - timestampMillis;
  
    // Convert the difference to minutes and round it down
    const diffMinutes = Math.floor(diffMillis / (1000 * 60));
  
    return diffMinutes;
}

export function hexToRgb(hex: string) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

// Returns an RGB color interpolated on the range between startColor and endColor.
export function getRgbColorInterpolation(startColorHex: string, endColorHex:string, curNum: number, maxNum:number) {
    const clampedMinutes = Math.min(Math.max(curNum, 0), maxNum);
    
    const startColor = hexToRgb(startColorHex);
    const endColor = hexToRgb(endColorHex); 
  
    const factor = clampedMinutes / maxNum; 
    const r = Math.round(startColor.r + factor * (endColor.r - startColor.r));
    const g = Math.round(startColor.g + factor * (endColor.g - startColor.g));
    const b = Math.round(startColor.b + factor * (endColor.b - startColor.b));
  
    return `rgb(${r}, ${g}, ${b})`;
}