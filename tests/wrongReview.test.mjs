import test from 'node:test';
import assert from 'node:assert/strict';
import { extractWrongQuestionIds, normalizeReviewRequestIds } from '../src/app/utils/wrongReview.js';

test('extractWrongQuestionIds keeps question bank order and only incorrect', () => {
  const ordered = ['q1', 'q2', 'q3', 'q4'];
  const status = {
    q1: 'correct',
    q2: 'incorrect',
    q3: 'incorrect',
    q4: 'correct',
  };
  assert.deepEqual(extractWrongQuestionIds(status, ordered), ['q2', 'q3']);
});

test('extractWrongQuestionIds ignores ids not in ordered list', () => {
  const ordered = ['q1', 'q2'];
  const status = { q1: 'incorrect', q9: 'incorrect' };
  assert.deepEqual(extractWrongQuestionIds(status, ordered), ['q1']);
});

test('normalizeReviewRequestIds removes invalid and duplicate ids while keeping order', () => {
  const requested = ['q2', 'qX', 'q1', 'q2', 'q3', 'q3'];
  const valid = new Set(['q1', 'q2', 'q3']);
  assert.deepEqual(normalizeReviewRequestIds(requested, valid), ['q2', 'q1', 'q3']);
});

test('normalizeReviewRequestIds handles empty and undefined', () => {
  const valid = new Set(['q1']);
  assert.deepEqual(normalizeReviewRequestIds([], valid), []);
  assert.deepEqual(normalizeReviewRequestIds(undefined, valid), []);
});
