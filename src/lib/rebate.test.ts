/** Tests for the profit-table rebate (Ibra') calculation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRebate, type RebateInputs } from './rebate.ts';

const round = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

// Worked example: HGF (5.5), 1,000,000 over 10 years (38% → payable 1,380,000),
// settling after paying 3 years. Equal installments of 11,500/mo.
const base: RebateInputs = {
  productId: 'HGF',
  years: 10,
  principal: 1_000_000,
  yearsPaid: 3,
  rebatePercent: 100,
  prfPaid: 0,
};

test('total profit uses the official (rounded) full-term rate', () => {
  const r = calculateRebate(base);
  assert.equal(r.totalProfitPercent, 38);
  assert.equal(round(r.totalProfit), 380_000);
});

test('equal installments: total paid = monthly × months served', () => {
  const r = calculateRebate(base);
  assert.equal(round(r.monthlyInstallment), 11_500); // 1,380,000 / 120
  assert.equal(r.monthsPaid, 36);
  assert.equal(round(r.totalPaid), 414_000); // 11,500 × 36
  assert.equal(round(r.capitalPaid), 300_000);
  assert.equal(round(r.profitPaid), 114_000);
  assert.equal(round(r.remainingBalance), 966_000);
});

test('rebate = unearned profit (profit for the unserved years)', () => {
  const r = calculateRebate(base);
  assert.equal(round(r.earnedProfit), 165_000); // 16.5% of 1,000,000
  assert.equal(round(r.unearnedProfit), 215_000);
  assert.equal(round(r.rebateAmount), 215_000);
});

test('settlement = outstanding capital + earned-but-unpaid profit (+ PRF)', () => {
  const r = calculateRebate(base);
  assert.equal(round(r.outstandingPrincipal), 700_000); // remaining capital
  // Earned 165,000 but only 114,000 paid → 51,000 still payable after full rebate.
  assert.equal(round(r.profitStillPayable), 51_000);
  // PRF due for 3 years = 3 × 4,000 = 12,000; none paid → all outstanding.
  assert.equal(round(r.prfDue), 12_000);
  assert.equal(round(r.prfOutstanding), 12_000);
  // 700,000 + 51,000 + 12,000
  assert.equal(round(r.amountToSettle), 763_000);
});

test('total outstanding = outstanding capital + profit still payable', () => {
  const r = calculateRebate(base);
  assert.equal(round(r.totalOutstanding), round(r.outstandingPrincipal + r.profitStillPayable));
  assert.equal(round(r.totalOutstanding), 751_000); // 700,000 + 51,000
});

test('paying the outstanding PRF removes it from the settlement', () => {
  const r = calculateRebate({ ...base, prfPaid: 12_000 });
  assert.equal(round(r.prfOutstanding), 0);
  assert.equal(round(r.amountToSettle), 751_000); // 700,000 + 51,000
});

test('settlement reconciles: remaining balance − rebate + outstanding PRF', () => {
  const r = calculateRebate(base);
  assert.ok(near(r.amountToSettle, r.remainingBalance - r.rebateAmount + r.prfOutstanding));
});

test('the rebate is explicitly deducted from the settlement', () => {
  const r = calculateRebate(base);
  // Balance to settle before the rebate = remaining balance + outstanding PRF.
  assert.equal(round(r.settleBeforeRebate), round(r.remainingBalance + r.prfOutstanding));
  // Amount to settle = that, minus the rebate.
  assert.equal(round(r.amountToSettle), round(r.settleBeforeRebate - r.rebateAmount));
  // The rebate genuinely lowers what the member pays.
  assert.ok(r.amountToSettle < r.settleBeforeRebate);
});

test('settling at full term leaves nothing to pay', () => {
  const r = calculateRebate({ ...base, yearsPaid: 10, prfPaid: 1_000_000 });
  assert.equal(round(r.rebateAmount), 0);
  assert.equal(round(r.outstandingPrincipal), 0);
  assert.equal(round(r.profitStillPayable), 0);
  assert.equal(round(r.amountToSettle), 0);
});

test('per-year rows mark served years and the unserved ones sum to the rebate', () => {
  const r = calculateRebate(base);
  assert.equal(r.yearRows.length, 10);
  assert.equal(r.yearRows.filter((y) => y.served).length, 3);
  const unserved = r.yearRows.filter((y) => !y.served).reduce((s, y) => s + y.marginalAmount, 0);
  assert.ok(near(unserved, r.unearnedProfit, 1));
});

test('net rebate to member = rebate − outstanding PRF', () => {
  const r = calculateRebate(base);
  assert.ok(near(r.netRebate, r.rebateAmount - r.prfOutstanding));
});
