import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPracticeDotState, getPracticeDotClassName } from '../src/app/pages/practiceProgressState.js';
import { shouldMarkCompletedOnNext, shouldMarkCompletedOnSubmit } from '../src/app/pages/practiceCompletionPolicy.js';

const src = readFileSync(new URL('../src/app/pages/Practice.tsx', import.meta.url), 'utf8');

test('Practice page exists and exports default component', () => {
  assert.match(src, /export default function Practice\s*\(/);
});

test('Practice page contains multi-choice guard text and selectedAnswers state', () => {
  assert.match(src, /selectedAnswers/);
  assert.match(src, /多选题至少选择 1 项后再提交/);
});

test('Practice progress/policy modules behave as expected', () => {
  assert.equal(getPracticeDotState('correct', false), 'correct');
  assert.equal(getPracticeDotState(undefined, true), 'completed');
  assert.match(getPracticeDotClassName('unanswered', true), /ring-\[?#FF3621\]/);
  assert.equal(shouldMarkCompletedOnSubmit(), true);
  assert.equal(shouldMarkCompletedOnNext(), true);
});

