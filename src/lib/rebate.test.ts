/** Tests for the profit-table rebate (Ibra') calculation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRebate, type RebateInputs } from './rebate.ts';

const round = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

const base: RebateInputs = {
  productId: 'HGF', // benchmark 5.5
  years: 11,
  principal: 1_000_000,
  yearsPaid: 8,
  rebatePercent: 100,
};

test('total profit uses the official (rounded) full-term rate', () => {
  const r = calculateRebate(base);
  // 11 years @ 5.5 benchmark → 40% (official, not 40.14%)
  assert.equal(r.totalProfitPercent, 40);
  assert.equal(round(r.totalProfit), 400_000);
});

test('rebate = profit for the unserved years (rate(N) − rate(k))', () => {
  const r = calculateRebate(base);
  // 40% − 34% = 6% of principal
  assert.equal(r.earnedProfitPercent, 34);
  assert.equal(r.unearnedProfitPercent, 6);
  assert.equal(round(r.rebateAmount), 60_000);
});

test('full rebate leaves zero profit payable; settle = outstanding principal', () => {
  const r = calculateRebate(base);
  assert.equal(round(r.profitStillPayable), 0);
  assert.ok(near(r.outstandingPrincipal, 1_000_000 * (3 / 11), 0.5));
  assert.ok(near(r.amountToSettle, r.outstandingPrincipal, 0.01));
});

test('partial rebate (50%) leaves half the unearned profit payable', () => {
  const r = calculateRebate({ ...base, rebatePercent: 50 });
  assert.equal(round(r.rebateAmount), 30_000);
  assert.equal(round(r.profitStillPayable), 30_000);
});

test('settling at full term gives no rebate', () => {
  const r = calculateRebate({ ...base, yearsPaid: 11 });
  assert.equal(round(r.rebateAmount), 0);
  assert.equal(round(r.outstandingPrincipal), 0);
  assert.equal(round(r.amountToSettle), 0);
});

test('per-year rows mark served years and the unserved ones sum to the rebate', () => {
  const r = calculateRebate(base);
  assert.equal(r.yearRows.length, 11);
  assert.equal(r.yearRows.filter((y) => y.served).length, 8);
  const total = r.yearRows.reduce((s, y) => s + y.marginalAmount, 0);
  assert.ok(near(total, r.totalProfit, 1));
  const unserved = r.yearRows.filter((y) => !y.served).reduce((s, y) => s + y.marginalAmount, 0);
  assert.ok(near(unserved, r.unearnedProfit, 1));
});

test('albarakah profit = earned profit with full rebate', () => {
  const r = calculateRebate(base);
  assert.equal(round(r.albarakahProfit), round(r.earnedProfit));
  assert.equal(round(r.albarakahProfit), 340_000);
});
