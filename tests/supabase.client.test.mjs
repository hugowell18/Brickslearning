import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/lib/supabaseClient.ts', import.meta.url), 'utf8');

test('supabase client exposes cloud kv functions', () => {
  assert.match(src, /export async function getJson/);
  assert.match(src, /export async function setJson/);
  assert.match(src, /export async function listJsonByPrefix/);
});

test('supabase client exposes profile and avatar functions', () => {
  assert.match(src, /export async function setUserProfile/);
  assert.match(src, /export async function getUserProfile/);
  assert.match(src, /export async function uploadAvatarImages/);
});

test('supabase client points AI assistant calls to edge function endpoint', () => {
  assert.match(src, /functions\/v1\/server/);
  assert.match(src, /export async function askAiAssistant/);
});

