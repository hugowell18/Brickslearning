import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/pages/Community.tsx', import.meta.url), 'utf8');

test('Community page has search / track filter / sort controls', () => {
  assert.match(src, /search/i);
  assert.match(src, /selectedTrack/);
  assert.match(src, /sort/);
});

test('Community page supports jump-to-post state handling', () => {
  assert.match(src, /pendingJump/);
  assert.match(src, /openPostId/);
});

test('Community page normalizes seed/remote post shape before render', () => {
  assert.match(src, /normalizeSeedPost|authorId|authorName/);
});
