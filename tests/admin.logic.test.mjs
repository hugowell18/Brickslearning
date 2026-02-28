import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/pages/Admin.tsx', import.meta.url), 'utf8');

test('Admin page exists and exports default component', () => {
  assert.match(src, /export default function Admin\s*\(/);
});

test('Admin exam config baseline is 90 minutes / 45 questions', () => {
  assert.match(src, /durationMinutes:\s*90/);
  assert.match(src, /questionCount:\s*45/);
});

test('Admin exam config setters enforce minimum bounds', () => {
  assert.match(src, /Math\.max\(30,\s*Number\(v\)\s*\|\|\s*90\)/);
  assert.match(src, /Math\.max\(10,\s*Number\(v\)\s*\|\|\s*45\)/);
});

