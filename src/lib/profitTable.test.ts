/** Validates the profit-rate formula against the society's profit table. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profitRatePercent, marginalRatePercent, getProduct } from './profitTable.ts';

const near = (a: number, b: number, eps = 0.001) => Math.abs(a - b) < eps;

test('benchmark 5.5 (group 1) matches table values', () => {
  assert.ok(near(profitRatePercent(5.5, 1), 5.5));
  assert.ok(near(profitRatePercent(5.5, 3), 16.5));
  assert.ok(near(profitRatePercent(5.5, 4), 20.9)); // 22 × 0.95
  assert.ok(near(profitRatePercent(5.5, 8), 34.0464)); // user's "8 years → 34%"
  assert.ok(near(profitRatePercent(5.5, 11), 40.1369)); // user's "11 years → 40%"
  assert.ok(near(profitRatePercent(5.5, 15), 44.5797));
});

test('MVF benchmark step: personal use 6.0 up to 8 yrs, 6.5 for 9–10', () => {
  const p = getProduct('MVF_PERSONAL')!;
  assert.equal(p.benchmarkFor(8), 6.0);
  assert.equal(p.benchmarkFor(10), 6.5);
  // user's example: MVF (8<Yrs≤10) at 10 years → 45%
  assert.ok(near(profitRatePercent(6.5, 10), 45.3919));
});

test('benchmark 8.5 (office) year 8 = 52.6171', () => {
  assert.ok(near(profitRatePercent(8.5, 8), 52.6171));
});

test('marginal rates sum to the total profit rate', () => {
  const b = 5.5;
  const n = 11;
  let sum = 0;
  for (let y = 1; y <= n; y++) sum += marginalRatePercent(b, y);
  assert.ok(near(sum, profitRatePercent(b, n)));
});

test('first three years are the flat benchmark (ratio = 1)', () => {
  assert.ok(near(marginalRatePercent(5.5, 1), 5.5));
  assert.ok(near(marginalRatePercent(5.5, 2), 5.5));
  assert.ok(near(marginalRatePercent(5.5, 3), 5.5));
});
