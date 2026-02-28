import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/components/AIAssistant.tsx', import.meta.url), 'utf8');

test('AIAssistant exists and exports default component', () => {
  assert.match(src, /export default function AIAssistant\s*\(/);
});

test('AIAssistant contains required model options', () => {
  assert.match(src, /Qwen\/Qwen3\.5-27B/);
  assert.match(src, /deepseek-ai\/DeepSeek-V3\.2/);
  assert.match(src, /MiniMax\/MiniMax-M2\.5/);
});

test('AIAssistant uses persistent model storage key', () => {
  assert.match(src, /db_ai_model/);
});

