/**
 * Unit tests for the rebate calculation logic.
 *
 * Run with:  npm test   (uses node --test with experimental TS stripping)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, resolveTiers, type CalculatorInputs } from './calc.ts';

const round = (n: number) => Math.round(n * 100) / 100;

const workedExample: CalculatorInputs = {
  principal: 900_000,
  tenureYears: 7,
  tiers: [
    { durationYears: 3, ratePercent: 5 },
    { durationYears: 4, ratePercent: 3 }, // last tier: duration is implicit
  ],
  profitMode: 'tiers',
  flatTotalProfit: 0,
  yearsElapsed: 3,
  rebatePercent: 100,
};

test('worked example — total profit is MUR 243,000 (27% of principal)', () => {
  const r = calculate(workedExample);
  assert.equal(round(r.totalProfit), 243_000);
  assert.equal(round(r.totalProfitPercentOfPrincipal), 27);
});

test('worked example — remaining profit falls entirely in the 3% tier', () => {
  const r = calculate(workedExample);
  assert.equal(round(r.yearsRemaining), 4);
  // 900,000 × (4 × 3%) = 108,000 — NOT a blended rate.
  assert.equal(round(r.remainingProfit), 108_000);
});

test('worked example — full rebate, zero profit payable', () => {
  const r = calculate(workedExample);
  assert.equal(round(r.rebateAmount), 108_000);
  assert.equal(round(r.profitStillPayable), 0);
});

test('worked example — outstanding principal ≈ 514,285.71', () => {
  const r = calculate(workedExample);
  assert.equal(round(r.outstandingPrincipal), round(900_000 * (4 / 7)));
  assert.equal(round(r.amountToSettle), round(900_000 * (4 / 7)));
});

test('worked example — Albarakah profit = earned profit (135,000) with full rebate', () => {
  const r = calculate(workedExample);
  assert.equal(round(r.albarakahProfit), 135_000);
});

test('remaining years match original tier position, not counted fresh', () => {
  // Settle after 2 years of a 7-year loan (3y@5%, then 4y@3%).
  // Remaining window [2,7]: 1 year still in the 5% tier + 4 years in the 3% tier.
  const r = calculate({ ...workedExample, yearsElapsed: 2 });
  // 900,000 × (1×5% + 4×3%) = 900,000 × 17% = 153,000
  assert.equal(round(r.remainingProfit), 153_000);
});

test('partial rebate (50%) leaves half the remaining profit payable', () => {
  const r = calculate({ ...workedExample, rebatePercent: 50 });
  assert.equal(round(r.rebateAmount), 54_000);
  assert.equal(round(r.profitStillPayable), 54_000);
  assert.equal(round(r.amountToSettle), round(900_000 * (4 / 7) + 54_000));
});

test('flat mode estimates remaining profit straight-line', () => {
  const r = calculate({
    ...workedExample,
    profitMode: 'flat',
    flatTotalProfit: 243_000,
  });
  assert.equal(r.isApproximation, true);
  // Straight-line: 243,000 × (4/7) = 138,857.14 (approximation, ignores tiers).
  assert.equal(round(r.remainingProfit), round(243_000 * (4 / 7)));
});

test('last tier fills to the tenure even if its stated duration is wrong', () => {
  const tiers = resolveTiers(
    [
      { durationYears: 3, ratePercent: 5 },
      { durationYears: 99, ratePercent: 3 },
    ],
    7,
  );
  assert.equal(tiers[1].startYear, 3);
  assert.equal(tiers[1].endYear, 7);
  assert.equal(tiers[1].effectiveDuration, 4);
});

test('settling at year 0 gives full profit remaining', () => {
  const r = calculate({ ...workedExample, yearsElapsed: 0 });
  assert.equal(round(r.remainingProfit), 243_000);
  assert.equal(round(r.outstandingPrincipal), 900_000);
});

test('settling at full tenure gives nothing remaining', () => {
  const r = calculate({ ...workedExample, yearsElapsed: 7 });
  assert.equal(round(r.remainingProfit), 0);
  assert.equal(round(r.outstandingPrincipal), 0);
  assert.equal(round(r.amountToSettle), 0);
});
