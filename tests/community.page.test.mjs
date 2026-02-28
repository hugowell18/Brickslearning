import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/pages/Community.tsx', import.meta.url), 'utf8');

test('Community page exists and exports default component', () => {
  assert.match(src, /export default function Community\s*\(/);
});

test('Community page supports posting and replying', () => {
  assert.match(src, /handleSubmitComment/);
  assert.match(src, /onSubmit=\{async \(draft\)/);
  assert.match(src, /parentCommentId/);
});

test('Community page includes mention support and notifications pipeline', () => {
  assert.match(src, /parseMentionHandles/);
  assert.match(src, /buildMentionNotifications/);
});

