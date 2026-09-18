/** Tests for the financing application fees. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFees, calculateFees, processingFee, FEE_ID } from './fees.ts';

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

test('the processing fee is fixed and the rest are optional', () => {
  const f = calculateFees('REF', 500_000);
  const processing = f.lines.find((l) => l.id === FEE_ID.processing);
  assert.equal(processing?.fixed, true);
  // Every other catalogue line is tickable.
  assert.ok(f.lines.filter((l) => l.id !== FEE_ID.processing).every((l) => !l.fixed));
});

test('year-1 PRF is added to the fees and to the total', () => {
  const withoutPrf = calculateFees('HGF', 1_000_000);
  const withPrf = calculateFees('HGF', 1_000_000, 4_000);
  assert.equal(withPrf.total, withoutPrf.total + 4_000);
  const prf = withPrf.lines.find((l) => l.id === FEE_ID.prfYear1);
  assert.equal(prf?.amount, 4_000);
  assert.equal(prf?.computed, true);
  // A zero PRF (e.g. no term) adds no line.
  assert.ok(!calculateFees('HGF', 1_000_000, 0).lines.some((l) => l.id === FEE_ID.prfYear1));
});

test('applyFees includes every fee by default', () => {
  const a = applyFees({ productId: 'REF', amount: 500_000, firstYearPrf: 4_000 });
  // processing 2,750 + notary 1,000 + assessment 1,000 + evaluation 6,500 + PRF 4,000
  assert.equal(a.total, 2_750 + 1_000 + 1_000 + 6_500 + 4_000);
  assert.ok(a.lines.every((l) => l.included));
});

test('unticked fees drop out of the total', () => {
  const a = applyFees({
    productId: 'REF',
    amount: 500_000,
    firstYearPrf: 4_000,
    overrides: {
      [FEE_ID.evaluation]: { included: false },
      [FEE_ID.prfYear1]: { included: false },
    },
  });
  assert.equal(a.total, 2_750 + 1_000 + 1_000);
  assert.equal(a.lines.find((l) => l.id === FEE_ID.evaluation)?.included, false);
  assert.ok(!a.includedLines.some((l) => l.label.includes('Evaluation')));
});

test('the fixed processing fee cannot be unticked or edited', () => {
  const a = applyFees({
    productId: 'HGF',
    amount: 1_000_000,
    overrides: { [FEE_ID.processing]: { included: false, amount: 1 } },
  });
  const processing = a.lines.find((l) => l.id === FEE_ID.processing);
  assert.equal(processing?.included, true);
  assert.equal(processing?.amount, 5_000);
  assert.equal(a.total, 5_000);
});

test('an optional fee amount can be overridden', () => {
  const a = applyFees({
    productId: 'REF',
    amount: 500_000,
    overrides: { [FEE_ID.evaluation]: { amount: 2_000 } },
  });
  const evaluation = a.lines.find((l) => l.id === FEE_ID.evaluation);
  assert.equal(evaluation?.amount, 2_000);
  assert.equal(evaluation?.edited, true);
  assert.equal(a.total, 2_750 + 1_000 + 1_000 + 2_000);
});

test('"Others" lines add to the total only while ticked', () => {
  const a = applyFees({
    productId: 'HGF',
    amount: 1_000_000,
    customLines: [
      { id: 'o1', label: 'Courier', amount: 250, included: true },
      { id: 'o2', label: 'Site visit', amount: 900, included: false },
    ],
  });
  assert.equal(a.total, 5_000 + 250);
  assert.equal(a.customLines.length, 2);
  assert.ok(a.includedLines.some((l) => l.label === 'Courier'));
  assert.ok(!a.includedLines.some((l) => l.label === 'Site visit'));
});

test('an unnamed "Others" line still prints with a label', () => {
  const a = applyFees({
    productId: 'HGF',
    amount: 1_000_000,
    customLines: [{ id: 'o1', label: '  ', amount: 100, included: true }],
  });
  assert.equal(a.includedLines.at(-1)?.label, 'Other fee');
});
