import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuestionOptionOrder,
  parseAnswerLabels,
  selectedDisplayToOriginal,
} from '../src/app/utils/optionOrder.js';

test('parseAnswerLabels supports multi-choice like "BE"', () => {
  assert.deepEqual(parseAnswerLabels('BE'), ['B', 'E']);
  assert.deepEqual(parseAnswerLabels(''), []);
  assert.deepEqual(parseAnswerLabels(undefined), []);
});

test('option order is deterministic for same session seed + question uid', () => {
  const q = { uid: 'de_16', opts: ['o1', 'o2', 'o3', 'o4'], ans: 'B' };
  const a = buildQuestionOptionOrder(q, 'sess-1');
  const b = buildQuestionOptionOrder(q, 'sess-1');
  assert.deepEqual(a.displayedOptions.map((x) => x.originalIndex), b.displayedOptions.map((x) => x.originalIndex));
});

test('different session seeds can produce different order', () => {
  const q = { uid: 'de_181', opts: ['a', 'b', 'c', 'd', 'e', 'f'], ans: 'BE' };
  const a = buildQuestionOptionOrder(q, 'sess-A').displayedOptions.map((x) => x.originalIndex).join(',');
  const b = buildQuestionOptionOrder(q, 'sess-B').displayedOptions.map((x) => x.originalIndex).join(',');
  assert.notEqual(a, b);
});

test('expectedDisplay maps original answer labels into shuffled display labels', () => {
  const q = { uid: 'q1', opts: ['A1', 'B1', 'C1', 'D1', 'E1'], ans: 'BE' };
  const { displayedOptions, expectedDisplay } = buildQuestionOptionOrder(q, 'sess-map');
  const back = displayedOptions
    .filter((item) => expectedDisplay.has(item.displayLabel))
    .map((item) => item.originalLabel)
    .sort();
  assert.deepEqual(back, ['B', 'E']);
});

test('selectedDisplayToOriginal converts chosen display labels back to original labels', () => {
  const q = { uid: 'q2', opts: ['A', 'B', 'C', 'D'], ans: 'AC' };
  const { labelToOriginalLabel } = buildQuestionOptionOrder(q, 'sess-convert');
  const selectedOriginal = selectedDisplayToOriginal(['A', 'C'], labelToOriginalLabel);
  assert.equal(selectedOriginal.length, 2);
  assert.ok(selectedOriginal.every((x) => ['A', 'B', 'C', 'D'].includes(x)));
});

