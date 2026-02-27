import test from 'node:test';
import assert from 'node:assert/strict';
import { getPracticeDotClassName, getPracticeDotState } from '../src/app/pages/practiceProgressState.js';

test('correct status wins over completed flag', () => {
  const state = getPracticeDotState('correct', true);
  assert.equal(state, 'correct');
  assert.match(getPracticeDotClassName(state, false), /bg-emerald-500/);
});

test('incorrect status wins over completed flag', () => {
  const state = getPracticeDotState('incorrect', true);
  assert.equal(state, 'incorrect');
  assert.match(getPracticeDotClassName(state, false), /bg-red-500/);
});

test('completed without grading is shown as learned', () => {
  const state = getPracticeDotState(undefined, true);
  assert.equal(state, 'completed');
  assert.match(getPracticeDotClassName(state, false), /bg-emerald-100/);
});

test('unanswered question remains neutral', () => {
  const state = getPracticeDotState(undefined, false);
  assert.equal(state, 'unanswered');
  assert.match(getPracticeDotClassName(state, false), /bg-white/);
});

test('current question includes ring class', () => {
  const state = getPracticeDotState(undefined, false);
  const className = getPracticeDotClassName(state, true);
  assert.match(className, /ring-\[#FF3621\]/);
});

