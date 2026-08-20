/** Tests for the profit-table loan calculator. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoan, type LoanInputs } from './loan.ts';

const round = (n: number) => Math.round(n * 100) / 100;
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

const base: LoanInputs = {
  productId: 'HGF', // benchmark 5.5
  years: 8,
  principal: 1_000_000,
  currentShares: 200_000,
  shareRatioPercent: 33.3333,
};

test('total profit and payable use the official (rounded) rate', () => {
  const r = calculateLoan(base);
  // 8 years @ 5.5 → 34% (official)
  assert.equal(r.profitRatePercent, 34);
  assert.equal(round(r.totalProfit), 340_000);
  assert.equal(round(r.totalPayable), 1_340_000);
  assert.equal(r.totalMonths, 96);
});

test('monthly payment = total payable / months', () => {
  const r = calculateLoan(base);
  assert.ok(near(r.monthlyPayment, 1_340_000 / 96, 0.01));
});

test('schedule amortizes principal to zero over the term', () => {
  const r = calculateLoan(base);
  assert.equal(r.schedule.length, 96);
  assert.equal(r.schedule[95].closingBalance, 0);
  const principalSum = r.schedule.reduce((s, row) => s + row.principalPortion, 0);
  assert.ok(Math.abs(principalSum - 1_000_000) < 1);
});

test('MVF benchmark steps for the 8 < years ≤ 10 band', () => {
  const at8 = calculateLoan({ ...base, productId: 'MVF_PERSONAL', years: 8 });
  const at10 = calculateLoan({ ...base, productId: 'MVF_PERSONAL', years: 10 });
  assert.equal(at8.benchmark, 6.0);
  assert.equal(at10.benchmark, 6.5);
  assert.equal(at10.profitRatePercent, 45); // official rounded rate
});

test('shares requirement reports shortfall (one third of 900,000 → 300,000)', () => {
  const r = calculateLoan({ ...base, principal: 900_000 });
  assert.equal(round(r.requiredShares), 300_000);
  assert.equal(round(r.sharesShortfall), 100_000);
  assert.equal(r.sharesMet, false);
});

test('shares requirement met when member holds enough', () => {
  const r = calculateLoan({ ...base, currentShares: 400_000 });
  assert.equal(r.sharesMet, true);
  assert.equal(r.sharesShortfall, 0);
});
