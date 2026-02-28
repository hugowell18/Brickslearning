import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/supabaseClient.ts', import.meta.url), 'utf8');

test('supabase client exposes askAiAssistant', () => {
  assert.match(src, /export async function askAiAssistant\(/);
});

test('askAiAssistant forwards messages/history/model payload', () => {
  assert.match(src, /body:\s*JSON\.stringify\(\{\s*message,\s*history:\s*normalizedHistory,\s*messages,\s*model\s*\}\)/s);
});

test('askAiAssistant handles empty AI response', () => {
  assert.match(src, /AI returned empty response/);
});

