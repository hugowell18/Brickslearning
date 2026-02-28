import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');

test('AppContext exports provider and hook', () => {
  assert.match(src, /export const AppProvider/);
  assert.match(src, /export const useApp/);
});

test('AppContext exposes login and logout actions', () => {
  assert.match(src, /\blogin:\s*\(/);
  assert.match(src, /\blogout:\s*\(\)\s*=>\s*void/);
  assert.match(src, /const logout = \(\) =>/);
});

test('AppContext maintains cloud failure and profile sync behaviors', () => {
  assert.match(src, /handleCloudFailure/);
  assert.match(src, /setUserProfile/);
  assert.match(src, /getUserProfile/);
});

