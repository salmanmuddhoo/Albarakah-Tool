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

test('schedule opening balance is the total payable and amortizes to zero', () => {
  const r = calculateLoan(base);
  assert.equal(r.schedule.length, 96);
  // Opening balance of month 1 is the total amount payable (not the principal).
  assert.equal(r.schedule[0].openingBalance, round(r.totalPayable));
  assert.equal(r.schedule[95].closingBalance, 0);
  const paymentSum = r.schedule.reduce((s, row) => s + row.payment, 0);
  assert.ok(Math.abs(paymentSum - r.totalPayable) < 1);
});

test('MVF benchmark comes from the vehicle-age band, independent of term', () => {
  const le8 = calculateLoan({ ...base, productId: 'MVF_PERSONAL_LE8', years: 10 });
  const b8to10 = calculateLoan({ ...base, productId: 'MVF_PERSONAL_8_10', years: 10 });
  assert.equal(le8.benchmark, 6.0);
  assert.equal(b8to10.benchmark, 6.5);
  // Vehicle aged 8–10, financed over 10 years → 45% (benchmark 6.5).
  assert.equal(b8to10.profitRatePercent, 45);
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

test('PRF: year 1 at month 1, year 2 at month 12, capped at 4,000', () => {
  // 1,000,000 over 10 years @ 38% → payable 1,380,000 (matches the example).
  const r = calculateLoan({ ...base, productId: 'HGF', years: 10 });
  assert.equal(round(r.totalPayable), 1_380_000);
  assert.equal(r.prfByYear.length, 10);
  assert.equal(r.prfByYear[0].prf, 4_000); // capped
  assert.equal(r.schedule[0].prf, 4_000); // month 1 = year 1
  assert.equal(r.schedule[11].prf, 4_000); // month 12 = year 2
  assert.equal(r.schedule[23].prf, 4_000); // month 24 = year 3
  assert.equal(r.schedule[35].prf, 4_000); // month 36 = year 4
  assert.equal(round(r.totalPrf), 36_140);
});

test('shares ratio of 25% is supported', () => {
  const r = calculateLoan({ ...base, principal: 1_000_000, shareRatioPercent: 25 });
  assert.equal(r.requiredShares, 250_000);
});
