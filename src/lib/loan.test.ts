/**
 * Unit tests for the loan / financing calculator.
 * Run with:  npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoan, type LoanInputs } from './loan.ts';

const round = (n: number) => Math.round(n * 100) / 100;

const base: LoanInputs = {
  principal: 900_000,
  tenureYears: 7,
  tiers: [
    { durationYears: 3, ratePercent: 5 },
    { durationYears: 4, ratePercent: 3 },
  ],
  installmentType: 'equal',
  currentShares: 200_000,
  shareRatioPercent: 33.3333,
};

test('total profit and payable match the flat tier model', () => {
  const r = calculateLoan(base);
  assert.equal(round(r.totalProfit), 243_000); // 900,000 × 27%
  assert.equal(round(r.totalPayable), 1_143_000);
  assert.equal(r.totalMonths, 84);
});

test('equal installment = total payable / months', () => {
  const r = calculateLoan(base);
  // 1,143,000 / 84 = 13,607.142857...
  assert.equal(round(r.averageMonthlyPayment), round(1_143_000 / 84));
  // Equal type → a single payment segment across all 84 months.
  assert.equal(r.segments.length, 1);
  assert.equal(r.segments[0].months, 84);
});

test('equal-installment schedule fully amortizes to zero', () => {
  const r = calculateLoan(base);
  assert.equal(r.schedule.length, 84);
  assert.equal(r.schedule[83].closingBalance, 0);
  const totalPrincipal = r.schedule.reduce((s, row) => s + row.principalPortion, 0);
  const totalProfit = r.schedule.reduce((s, row) => s + row.profitPortion, 0);
  // Per-row figures are rounded to 2dp, so summing them may drift by a few cents.
  assert.ok(Math.abs(totalPrincipal - 900_000) < 1, `principal sum ${totalPrincipal}`);
  assert.ok(Math.abs(totalProfit - 243_000) < 1, `profit sum ${totalProfit}`);
});

test('stepped installment steps down when the rate tier changes', () => {
  const r = calculateLoan({ ...base, installmentType: 'stepped' });
  // Principal straight-line: 900,000 / 84 = 10,714.2857 per month.
  // Months 1–36 @ 5%/yr: profit = 900,000 × 5% / 12 = 3,750 → payment 14,464.29
  // Months 37–84 @ 3%/yr: profit = 900,000 × 3% / 12 = 2,250 → payment 12,964.29
  assert.equal(r.segments.length, 2);
  assert.equal(r.segments[0].fromMonth, 1);
  assert.equal(r.segments[0].toMonth, 36);
  assert.equal(round(r.segments[0].payment), round(900_000 / 84 + 3_750));
  assert.equal(r.segments[1].fromMonth, 37);
  assert.equal(round(r.segments[1].payment), round(900_000 / 84 + 2_250));
});

test('stepped principal schedule matches rebate-tool straight-line outstanding', () => {
  const r = calculateLoan({ ...base, installmentType: 'stepped' });
  // After 36 months (3 years) of a 7-year loan, outstanding principal should be
  // 900,000 × (4/7) ≈ 514,285.71 — same figure the rebate tool quotes.
  assert.equal(round(r.schedule[35].closingBalance), round(900_000 * (4 / 7)));
});

test('shares requirement: shortfall reported when member is under one third', () => {
  const r = calculateLoan(base); // current 200,000, required ≈ 300,000
  assert.equal(round(r.requiredShares), 300_000);
  assert.equal(round(r.sharesShortfall), 100_000);
  assert.equal(r.sharesMet, false);
});

test('shares requirement: met when member holds enough', () => {
  const r = calculateLoan({ ...base, currentShares: 320_000 });
  assert.equal(r.sharesMet, true);
  assert.equal(r.sharesShortfall, 0);
});

test('zero principal produces an empty, safe result', () => {
  const r = calculateLoan({ ...base, principal: 0 });
  assert.equal(r.totalPayable, 0);
  assert.equal(r.requiredShares, 0);
  assert.equal(r.schedule.length, 84);
  assert.equal(r.schedule[0].payment, 0);
});
