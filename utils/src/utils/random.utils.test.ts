import {
  normalizeWeights,
  weightedChoice,
  weightedRoundRobin,
  seed,
} from './random.utils';

describe('normalizeWeights', () => {
  it('should return equal weights when no weights provided', () => {
    const result = normalizeWeights(3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(1 / 3);
    expect(result[1]).toBeCloseTo(1 / 3);
    expect(result[2]).toBeCloseTo(1 / 3);
  });

  it('should return equal weights when weights length does not match', () => {
    const result = normalizeWeights(3, [1, 2]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(1 / 3);
  });

  it('should normalize weights to sum to 1', () => {
    const result = normalizeWeights(3, [2, 1, 1]);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[1]).toBeCloseTo(0.25);
    expect(result[2]).toBeCloseTo(0.25);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('should handle all zero weights by returning equal weights', () => {
    const result = normalizeWeights(3, [0, 0, 0]);
    expect(result[0]).toBeCloseTo(1 / 3);
  });
});

describe('weightedChoice', () => {
  it('should throw on empty array', () => {
    expect(() => weightedChoice([])).toThrow(
      'Cannot choose from an empty array',
    );
  });

  it('should return the only element from single-element array', () => {
    const result = weightedChoice(['only'], undefined, 'seed');
    expect(result).toBe('only');
  });

  it('should be deterministic with same seed', () => {
    const values = ['A', 'B', 'C'];
    const weights = [1, 1, 1];
    const result1 = weightedChoice(values, weights, 'test-seed');
    const result2 = weightedChoice(values, weights, 'test-seed');
    expect(result1).toBe(result2);
  });

  it('should respect weights over many iterations', () => {
    const values = ['A', 'B'];
    const weights = [3, 1]; // 75% A, 25% B

    const counts: Record<string, number> = {A: 0, B: 0};
    for (let i = 0; i < 1000; i++) {
      const result = weightedChoice(values, weights, `seed-${i}`);
      counts[result]++;
    }

    // With 3:1 weights, A should be ~75%
    // With 1000 samples, expect 70-80% range (within ~5% of target)
    const ratioA = counts['A'] / 1000;
    expect(ratioA).toBeGreaterThan(0.7);
    expect(ratioA).toBeLessThan(0.8);
  });

  it('should handle edge case weights correctly', () => {
    const values = ['A', 'B', 'C'];

    // Zero weight for first value means it should never be selected
    const weightsNoA = [0, 1, 1];
    let foundA = false;
    for (let i = 0; i < 100; i++) {
      if (weightedChoice(values, weightsNoA, `test-${i}`) === 'A') {
        foundA = true;
        break;
      }
    }
    expect(foundA).toBe(false);
  });

  it('should fall back to equal probability without weights', () => {
    const values = ['A', 'B', 'C'];
    // Just ensure it doesn't throw
    const result = weightedChoice(values, undefined, 'seed');
    expect(values).toContain(result);
  });
});

describe('weightedRoundRobin', () => {
  it('should throw on empty array', () => {
    expect(() => weightedRoundRobin([], 0)).toThrow(
      'Cannot choose from an empty array',
    );
  });

  it('should cycle through values with equal weights', () => {
    const values = ['A', 'B', 'C'];
    expect(weightedRoundRobin(values, 0)).toBe('A');
    expect(weightedRoundRobin(values, 1)).toBe('B');
    expect(weightedRoundRobin(values, 2)).toBe('C');
    expect(weightedRoundRobin(values, 3)).toBe('A');
  });

  it('should cycle based on weights', () => {
    const values = ['A', 'B'];
    const weights = [2, 1]; // A, A, B, A, A, B, ...

    expect(weightedRoundRobin(values, 0, weights)).toBe('A');
    expect(weightedRoundRobin(values, 1, weights)).toBe('A');
    expect(weightedRoundRobin(values, 2, weights)).toBe('B');
    expect(weightedRoundRobin(values, 3, weights)).toBe('A');
    expect(weightedRoundRobin(values, 4, weights)).toBe('A');
    expect(weightedRoundRobin(values, 5, weights)).toBe('B');
  });

  it('should handle three values with weights', () => {
    const values = ['A', 'B', 'C'];
    const weights = [3, 2, 1]; // A,A,A, B,B, C, repeat

    expect(weightedRoundRobin(values, 0, weights)).toBe('A');
    expect(weightedRoundRobin(values, 1, weights)).toBe('A');
    expect(weightedRoundRobin(values, 2, weights)).toBe('A');
    expect(weightedRoundRobin(values, 3, weights)).toBe('B');
    expect(weightedRoundRobin(values, 4, weights)).toBe('B');
    expect(weightedRoundRobin(values, 5, weights)).toBe('C');
    expect(weightedRoundRobin(values, 6, weights)).toBe('A'); // Wraps around
  });

  it('should fall back to simple modulo without weights', () => {
    const values = ['A', 'B'];
    expect(weightedRoundRobin(values, 0)).toBe('A');
    expect(weightedRoundRobin(values, 1)).toBe('B');
    expect(weightedRoundRobin(values, 2)).toBe('A');
  });

  it('should fall back to simple modulo with zero weights', () => {
    const values = ['A', 'B'];
    const weights = [0, 0];
    expect(weightedRoundRobin(values, 0, weights)).toBe('A');
    expect(weightedRoundRobin(values, 1, weights)).toBe('B');
  });
});
