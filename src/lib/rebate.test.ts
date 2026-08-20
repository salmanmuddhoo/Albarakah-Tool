/** Tests for the profit-table rebate (Ibra') calculation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRebate, type RebateInputs } from './rebate.ts';
import { profitRatePercent } from './profitTable.ts';

const round = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

const base: RebateInputs = {
  productId: 'HGF', // benchmark 5.5
  years: 11,
  principal: 1_000_000,
  yearsPaid: 8,
  rebatePercent: 100,
};

test('total profit uses the full-term table rate', () => {
  const r = calculateRebate(base);
  // 11 years @ 5.5 benchmark → 40.1369%
  assert.ok(near(r.totalProfitPercent, 40.1369));
  assert.ok(near(r.totalProfit, 1_000_000 * 0.401369, 5));
});

test('rebate = profit for the unserved years (ProfitRate(N) − ProfitRate(k))', () => {
  const r = calculateRebate(base);
  const expectedPct = profitRatePercent(5.5, 11) - profitRatePercent(5.5, 8); // 40.1369 − 34.0464
  assert.ok(near(r.unearnedProfitPercent, expectedPct));
  assert.ok(near(r.rebateAmount, (1_000_000 * expectedPct) / 100, 1));
  assert.ok(near(r.earnedProfitPercent, 34.0464));
});

test('full rebate leaves zero profit payable; settle = outstanding principal', () => {
  const r = calculateRebate(base);
  assert.equal(round(r.profitStillPayable), 0);
  // Outstanding principal = 1,000,000 × 3/11
  assert.ok(near(r.outstandingPrincipal, 1_000_000 * (3 / 11), 0.5));
  assert.ok(near(r.amountToSettle, r.outstandingPrincipal, 0.01));
});

test('partial rebate (50%) leaves half the unearned profit payable', () => {
  const r = calculateRebate({ ...base, rebatePercent: 50 });
  assert.ok(near(r.rebateAmount, r.unearnedProfit / 2, 0.01));
  assert.ok(near(r.profitStillPayable, r.unearnedProfit / 2, 0.01));
});

test('settling at full term gives no rebate', () => {
  const r = calculateRebate({ ...base, yearsPaid: 11 });
  assert.equal(round(r.rebateAmount), 0);
  assert.equal(round(r.outstandingPrincipal), 0);
  assert.equal(round(r.amountToSettle), 0);
});

test('per-year rows mark served years and sum to total profit', () => {
  const r = calculateRebate(base);
  assert.equal(r.yearRows.length, 11);
  assert.equal(r.yearRows.filter((y) => y.served).length, 8);
  const sum = r.yearRows.reduce((s, y) => s + y.marginalAmount, 0);
  assert.ok(near(sum, r.totalProfit, 1));
  // Unearned = sum of unserved years' marginal amounts.
  const unserved = r.yearRows.filter((y) => !y.served).reduce((s, y) => s + y.marginalAmount, 0);
  assert.ok(near(unserved, r.unearnedProfit, 1));
});

test('albarakah profit = earned profit with full rebate', () => {
  const r = calculateRebate(base);
  assert.ok(near(r.albarakahProfit, r.earnedProfit, 0.01));
});
