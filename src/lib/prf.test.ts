/** Tests for the PRF (yearly insurance premium) calculation. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prfSchedule, totalPrf, prfDueForYears, prfByMonth, PRF_CAP } from './prf.ts';

const round = (n: number) => Math.round(n * 100) / 100;

// Worked example: loan 1,000,000, 10 years, 38% → total payable 1,380,000.
const TP = 1_380_000;
const N = 10;

test('year 1 basis is the full amount to repay, capped at 4,000', () => {
  const rows = prfSchedule(TP, N);
  assert.equal(rows[0].year, 1);
  assert.equal(round(rows[0].basis), 1_380_000);
  assert.equal(rows[0].prf, PRF_CAP); // 1% of 1.38M = 13,800 → capped 4,000
});

test('following years use the remaining balance and stay capped while large', () => {
  const rows = prfSchedule(TP, N);
  // Year 2 basis = 1,380,000 × 9/10 = 1,242,000 → still capped at 4,000.
  assert.equal(round(rows[1].basis), 1_242_000);
  assert.equal(rows[1].prf, PRF_CAP);
});

test('PRF falls below the cap once the balance drops under 400,000', () => {
  const rows = prfSchedule(TP, N);
  // Year 9 basis = 1,380,000 × 2/10 = 276,000 → 1% = 2,760 (< cap).
  assert.equal(round(rows[8].basis), 276_000);
  assert.equal(round(rows[8].prf), 2_760);
  // Year 10 basis = 138,000 → 1,380.
  assert.equal(round(rows[9].prf), 1_380);
});

test('total PRF over the term sums the yearly amounts', () => {
  // 8 × 4,000 + 2,760 + 1,380 = 36,140
  assert.equal(round(totalPrf(TP, N)), 36_140);
});

test('indicative PRF due for years served', () => {
  // First 8 years all capped at 4,000 → 32,000.
  assert.equal(round(prfDueForYears(TP, N, 8)), 32_000);
});

test('PRF maps to the right schedule months (year 1 → month 1, then year K → (K − 1)×12)', () => {
  const map = prfByMonth(TP, N);
  assert.ok(map.has(1)); // year 1 at the beginning
  assert.ok(map.has(12)); // year 2 at month 12
  assert.ok(map.has(24)); // year 3 at month 24
  assert.ok(map.has(108)); // year 10 at month 108
  assert.ok(!map.has(120)); // NOT at month 120
  assert.equal(map.size, 10);
});
