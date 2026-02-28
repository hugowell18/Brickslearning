import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/pages/Login.tsx', import.meta.url), 'utf8');

test('Login page exists and exports default component', () => {
  assert.match(src, /export default function Login\s*\(/);
});

test('Login page includes login/register mode toggling UI', () => {
  assert.match(src, /isLogin/);
  assert.match(src, /setIsLogin\(!isLogin\)/);
  assert.match(src, /登录|注册/);
});

test('Login page includes password and confirm password fields', () => {
  assert.match(src, /type="password"/);
  assert.match(src, /确认密码/);
});
