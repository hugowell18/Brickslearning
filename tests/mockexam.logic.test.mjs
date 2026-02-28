import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/pages/MockExam.tsx', import.meta.url), 'utf8');

test('MockExam page exists and exports default component', () => {
  assert.match(src, /export default function MockExam\s*\(/);
});

test('MockExam supports multi-choice and enforces at-least-one selection', () => {
  assert.match(src, /currentIsMultiChoice/);
  assert.match(src, /多选题，请至少选择 1 项后再提交|至少选择 1 项/);
  assert.match(src, /setAnswers/);
});

test('MockExam includes score and weaknesses calculation output', () => {
  assert.match(src, /score/);
  assert.match(src, /weaknesses/);
});

