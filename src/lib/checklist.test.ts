/** Tests for the loan-application document checklists. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChecklist } from './checklist.ts';

test('checklist has the four sections', () => {
  const c = buildChecklist('HGF', 'salaried');
  assert.equal(c.length, 4);
  assert.match(c[0].title, /Common/);
  assert.match(c[1].title, /Income/);
  assert.match(c[2].title, /Product/);
  assert.match(c[3].title, /Sureties/);
});

test('income documents depend on the applicant type', () => {
  const sal = buildChecklist('HGF', 'salaried')[1].items.join(' ');
  const self = buildChecklist('HGF', 'self_employed')[1].items.join(' ');
  const pen = buildChecklist('HGF', 'pensioner')[1].items.join(' ');
  assert.match(sal, /pay slip/i);
  assert.match(self, /Business Registration|BRN/i);
  assert.match(pen, /pension/i);
});

test('product documents follow the financing product', () => {
  assert.match(buildChecklist('HF', 'salaried')[2].items.join(' '), /Building Permit/i);
  assert.match(buildChecklist('REF', 'salaried')[2].items.join(' '), /Title Deed/i);
  // MCF and all MVF variants share the motor-vehicle checklist.
  assert.match(buildChecklist('MCF', 'salaried')[2].items.join(' '), /Registration Book/i);
  assert.match(buildChecklist('MVF_TRADE_8_10', 'salaried')[2].items.join(' '), /Registration Book/i);
});
