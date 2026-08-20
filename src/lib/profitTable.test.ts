/** Validates the profit-rate formula against the society's printed profit table. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profitRatePercent, marginalRatePercent, getProduct } from './profitTable.ts';

const near = (a: number, b: number, eps = 0.001) => Math.abs(a - b) < eps;

// Rows exactly as printed in the profit table (years 1..15).
const TABLE: Record<number, number[]> = {
  5.5: [5.5, 11, 16.5, 21, 25, 28, 31, 34, 36, 38, 40, 42, 43, 44, 45],
  6.0: [6, 12, 18, 23, 27, 31, 34, 37, 40, 42, 44, 45, 47, 48, 49],
  6.5: [6.5, 13, 19.5, 25, 29, 33, 37, 40, 43, 45, 47, 49, 51, 52, 53],
};

test('official profit rates match the printed table (rounded whole numbers)', () => {
  for (const [b, row] of Object.entries(TABLE)) {
    const benchmark = Number(b);
    row.forEach((expected, i) => {
      const got = profitRatePercent(benchmark, i + 1);
      assert.ok(near(got, expected), `benchmark ${b} year ${i + 1}: got ${got}, expected ${expected}`);
    });
  }
});

test("user's headline examples", () => {
  assert.equal(profitRatePercent(5.5, 8), 34); // "8 years → 34%"
  assert.equal(profitRatePercent(5.5, 11), 40); // "11 years → 40%"
  assert.equal(profitRatePercent(6.5, 10), 45); // MVF (8<Yrs≤10) at 10 years → 45%
});

test('MVF benchmark step: personal use 6.0 up to 8 yrs, 6.5 for 9–10', () => {
  const p = getProduct('MVF_PERSONAL')!;
  assert.equal(p.benchmarkFor(8), 6.0);
  assert.equal(p.benchmarkFor(10), 6.5);
});

test('years 1–3 keep the exact flat rate (not rounded)', () => {
  assert.equal(profitRatePercent(5.5, 1), 5.5);
  assert.equal(profitRatePercent(5.5, 3), 16.5);
  assert.equal(profitRatePercent(6.5, 3), 19.5);
});

test('marginal rates sum to the total profit rate', () => {
  const b = 5.5;
  const n = 11;
  let sum = 0;
  for (let y = 1; y <= n; y++) sum += marginalRatePercent(b, y);
  assert.ok(near(sum, profitRatePercent(b, n)));
});
