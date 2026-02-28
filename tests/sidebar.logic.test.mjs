import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/components/Sidebar.tsx', import.meta.url), 'utf8');

test('Sidebar exists and exports default component', () => {
  assert.match(src, /export default function Sidebar\s*\(/);
});

test('Sidebar includes mobile drawer open/close classes', () => {
  assert.match(src, /translate-x-0/);
  assert.match(src, /-translate-x-full/);
  assert.match(src, /opacity-100 pointer-events-auto/);
});

test('Sidebar contains admin entry gating', () => {
  assert.match(src, /isAdmin/);
  assert.match(src, /to="\/admin"/);
});

