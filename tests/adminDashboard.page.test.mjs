import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/app/pages/AdminDashboard.tsx', import.meta.url), 'utf8');

test('AdminDashboard page exists and exports default component', () => {
  assert.match(src, /export default function AdminDashboard\s*\(/);
});

test('AdminDashboard contains student selector and cloud data loading', () => {
  assert.match(src, /selectedStudentId/);
  assert.match(src, /listJsonByPrefix<ProfileLite>\('db_profile:'\)/);
  assert.match(src, /candidateIds\.map\(\(id\) => getJson<CompletedMeta>\(`db_progress:completed_meta:\$\{id\}`/);
  assert.match(src, /candidateIds\.map\(\(id\) => getJson<AttemptEvent\[]>\(`db_progress:attempt_events:\$\{id\}`/);
  assert.match(src, /toLegacyUserId/);
});

test('AdminDashboard includes trend charts for learning and accuracy', () => {
  assert.match(src, /LineChart/);
  assert.match(src, /BarChart/);
  assert.match(src, /dataKey="analyst"/);
  assert.match(src, /dataKey="engineer"/);
});

test('AdminDashboard uses month-week labels for 4-week accuracy axis', () => {
  assert.match(src, /week:\s*`\$\{month\}月W\$\{weekOfMonth\}`/);
  assert.match(src, /dataKey="week"/);
});
