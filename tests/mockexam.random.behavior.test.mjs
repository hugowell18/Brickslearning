import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuestionOptionOrder,
  parseAnswerLabels,
  selectedDisplayToOriginal,
} from '../src/app/utils/optionOrder.js';

function calcCorrect(question, optionView, selectedDisplayLabels) {
  const expected = new Set(parseAnswerLabels(question.ans));
  const selectedSet = new Set(
    selectedDisplayToOriginal(selectedDisplayLabels, optionView.labelToOriginalLabel),
  );
  return expected.size === selectedSet.size && [...expected].every((x) => selectedSet.has(x));
}

test('MockExam behavior: per-question option order is deterministic within a single exam session seed', () => {
  const seed = 'mock-20260301-sessionA';
  const q1 = { uid: 'de_1', opts: ['A', 'B', 'C', 'D'], ans: 'A' };
  const q2 = { uid: 'de_2', opts: ['A', 'B', 'C', 'D'], ans: 'B' };

  const q1First = buildQuestionOptionOrder(q1, seed).displayedOptions.map((x) => x.originalIndex);
  const q2First = buildQuestionOptionOrder(q2, seed).displayedOptions.map((x) => x.originalIndex);
  const q1Back = buildQuestionOptionOrder(q1, seed).displayedOptions.map((x) => x.originalIndex);
  const q2Back = buildQuestionOptionOrder(q2, seed).displayedOptions.map((x) => x.originalIndex);

  assert.deepEqual(q1Back, q1First);
  assert.deepEqual(q2Back, q2First);
});

test('MockExam behavior: scoring remains valid with shuffled labels for mixed single/multi questions', () => {
  const single = { uid: 'da_11', opts: ['A', 'B', 'C', 'D'], ans: 'D' };
  const multi = { uid: 'de_16', opts: ['A', 'B', 'C', 'D', 'E'], ans: 'BE' };

  const singleView = buildQuestionOptionOrder(single, 'mock-seed-score');
  const multiView = buildQuestionOptionOrder(multi, 'mock-seed-score');

  const singleCorrectDisplay = singleView.displayedOptions.find((x) => x.originalLabel === 'D')?.displayLabel;
  assert.ok(singleCorrectDisplay);
  assert.equal(calcCorrect(single, singleView, [singleCorrectDisplay]), true);

  const multiCorrectDisplay = multiView.displayedOptions
    .filter((x) => x.originalLabel === 'B' || x.originalLabel === 'E')
    .map((x) => x.displayLabel);
  assert.equal(calcCorrect(multi, multiView, multiCorrectDisplay), true);
  assert.equal(calcCorrect(multi, multiView, [multiCorrectDisplay[0]]), false);
});

