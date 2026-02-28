import test from 'node:test';
import assert from 'node:assert/strict';
import { getPracticeDotState, getPracticeDotClassName } from '../src/app/pages/practiceProgressState.js';
import { shouldMarkCompletedOnNext, shouldMarkCompletedOnSubmit } from '../src/app/pages/practiceCompletionPolicy.js';
import { normalizeReviewRequestIds, extractWrongQuestionIds } from '../src/app/utils/wrongReview.js';

test('getPracticeDotState returns correct states', () => {
  assert.equal(getPracticeDotState('correct', false), 'correct');
  assert.equal(getPracticeDotState('incorrect', false), 'incorrect');
  assert.equal(getPracticeDotState(undefined, true), 'completed');
  assert.equal(getPracticeDotState(undefined, false), 'unanswered');
});

test('getPracticeDotClassName includes expected classes and ring when current', () => {
  const correct = getPracticeDotClassName('correct', false);
  assert.ok(correct.includes('bg-emerald-500'));
  const incorrect = getPracticeDotClassName('incorrect', true);
  assert.ok(incorrect.includes('bg-red-500'));
  assert.ok(incorrect.includes('ring-2'));
  const completed = getPracticeDotClassName('completed', false);
  assert.ok(completed.includes('bg-emerald-100'));
  const unanswered = getPracticeDotClassName('unanswered', false);
  assert.ok(unanswered.includes('bg-white'));
});

test('practice completion policy functions return booleans', () => {
  assert.equal(shouldMarkCompletedOnSubmit(), true);
  assert.equal(shouldMarkCompletedOnNext(), true);
});

test('normalizeReviewRequestIds filters invalid and duplicates preserving order', () => {
  const valid = new Set(['a', 'b', 'c']);
  const result = normalizeReviewRequestIds(['a', 'x', 'b', 'a', 'c'], valid);
  assert.deepEqual(result, ['a', 'b', 'c']);
  assert.deepEqual(normalizeReviewRequestIds([], valid), []);
  assert.deepEqual(normalizeReviewRequestIds(undefined, valid), []);
});

test('extractWrongQuestionIds returns only incorrect ids in order', () => {
  const statusMap = { a: 'correct', b: 'incorrect', c: 'incorrect', d: 'correct' };
  const ordered = ['a', 'b', 'c', 'd'];
  const wrong = extractWrongQuestionIds(statusMap, ordered);
  assert.deepEqual(wrong, ['b', 'c']);
  assert.deepEqual(extractWrongQuestionIds(null, ordered), []);
  assert.deepEqual(extractWrongQuestionIds(statusMap, null), []);
});
