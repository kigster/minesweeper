import { describe, expect, test } from 'bun:test';
import { mulberry32 } from '../../src/engine/rng';

const take = (n: number, rng: () => number) => Array.from({ length: n }, rng);

describe('mulberry32', () => {
  test('the same seed yields the same sequence', () => {
    expect(take(50, mulberry32(42))).toEqual(take(50, mulberry32(42)));
  });

  test('different seeds yield different sequences', () => {
    expect(take(10, mulberry32(1))).not.toEqual(take(10, mulberry32(2)));
  });

  test('values stay in [0, 1) and are spread out', () => {
    const values = take(10_000, mulberry32(7));
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
    expect(new Set(values).size).toBeGreaterThan(9_900);
  });
});
