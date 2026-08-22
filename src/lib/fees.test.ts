/** Tests for the financing application fees. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFees, processingFee } from './fees.ts';

test('processing fee follows the amount bands', () => {
  assert.equal(processingFee(40_000), 500);
  assert.equal(processingFee(100_000), 1_000);
  assert.equal(processingFee(1_000_000), 5_000);
  assert.equal(processingFee(1_200_000), 7_500);
});

test('govt registration fee only for financing above 1,000,000', () => {
  const under = calculateFees('HGF', 900_000);
  assert.ok(!under.lines.some((l) => l.label.includes('Govt')));
  const over = calculateFees('HGF', 1_200_000);
  const govt = over.lines.find((l) => l.label.includes('Govt'));
  assert.equal(govt?.amount, 30_000);
});

test('HGF at 1,000,000: processing fee only', () => {
  const f = calculateFees('HGF', 1_000_000);
  assert.equal(f.total, 5_000);
  assert.equal(f.lines.length, 1);
});

test('MVF adds completion + evaluation fees', () => {
  const f = calculateFees('MVF_PERSONAL_LE8', 800_000);
  // processing 4,000 + completion 1,000 + evaluation 6,500
  assert.equal(f.total, 4_000 + 1_000 + 6_500);
});

test('REF adds notary + assessment + evaluation fees', () => {
  const f = calculateFees('REF', 500_000);
  // processing 2,750 + notary 1,000 + assessment 1,000 + evaluation 6,500
  assert.equal(f.total, 2_750 + 1_000 + 1_000 + 6_500);
});

test('amount above the table is flagged', () => {
  assert.equal(calculateFees('HGF', 2_000_000).aboveTable, true);
  assert.equal(calculateFees('HGF', 900_000).aboveTable, false);
});
