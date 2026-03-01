import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuestionOptionOrder,
  parseAnswerLabels,
  selectedDisplayToOriginal,
} from '../src/app/utils/optionOrder.js';

function isCorrectSelection(question, optionView, selectedDisplayLabels) {
  const expected = new Set(parseAnswerLabels(question.ans));
  const selected = new Set(
    selectedDisplayToOriginal(selectedDisplayLabels, optionView.labelToOriginalLabel),
  );
  return expected.size === selected.size && [...expected].every((label) => selected.has(label));
}

test('Practice behavior: single-choice scoring remains correct after option shuffle', () => {
  const q = {
    uid: 'da_x',
    opts: ['A option', 'B option', 'C option', 'D option'],
    ans: 'C',
  };
  const optionView = buildQuestionOptionOrder(q, 'practice-session-1');

  const displayCorrect = optionView.displayedOptions.find((x) => x.originalLabel === 'C');
  assert.ok(displayCorrect, 'display label for original C should exist');

  assert.equal(isCorrectSelection(q, optionView, [displayCorrect.displayLabel]), true);
  assert.equal(isCorrectSelection(q, optionView, ['A']), false);
});

test('Practice behavior: multi-choice scoring remains correct after option shuffle', () => {
  const q = {
    uid: 'de_16',
    opts: ['A1', 'B1', 'C1', 'D1', 'E1'],
    ans: 'BE',
  };
  const optionView = buildQuestionOptionOrder(q, 'practice-session-2');

  const correctDisplayLabels = optionView.displayedOptions
    .filter((x) => x.originalLabel === 'B' || x.originalLabel === 'E')
    .map((x) => x.displayLabel);

  assert.equal(isCorrectSelection(q, optionView, correctDisplayLabels), true);
  assert.equal(isCorrectSelection(q, optionView, [correctDisplayLabels[0]]), false);
});

test('Practice behavior: same question in same session keeps stable display order across revisits', () => {
  const q = {
    uid: 'da_99',
    opts: ['o1', 'o2', 'o3', 'o4', 'o5'],
    ans: 'D',
  };
  const first = buildQuestionOptionOrder(q, 'practice-stable-seed').displayedOptions.map((x) => x.originalIndex);
  const revisit = buildQuestionOptionOrder(q, 'practice-stable-seed').displayedOptions.map((x) => x.originalIndex);
  assert.deepEqual(revisit, first);
});

