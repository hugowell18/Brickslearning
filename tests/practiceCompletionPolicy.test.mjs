import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldMarkCompletedOnNext, shouldMarkCompletedOnSubmit } from '../src/app/pages/practiceCompletionPolicy.js';

test('submit counts as completed', () => {
  assert.equal(shouldMarkCompletedOnSubmit(), true);
});

test('next counts as completed', () => {
  assert.equal(shouldMarkCompletedOnNext(), true);
});

