import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLearningTrendFromCompletedMeta, getWeekStartMonday } from '../src/app/utils/completedMetaMetrics.js';

const src = readFileSync(new URL('../src/app/pages/Dashboard.tsx', import.meta.url), 'utf8');

function localTs(y, m, d, hh = 0, mm = 0, ss = 0) {
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

test('Dashboard wires wrong-review state payload into practice link', () => {
  assert.match(src, /mode:\s*'wrong-review'/);
  assert.match(src, /uids:\s*wrongAnalystQuestionIds/);
  assert.match(src, /uids:\s*wrongEngineerQuestionIds/);
});

test('Dashboard trend chart keeps analyst/engineer dual lines', () => {
  assert.match(src, /dataKey="analyst"/);
  assert.match(src, /dataKey="engineer"/);
});

test('completedMetaMetrics can produce 7-day trend with per-track split', () => {
  const nowTs = localTs(2026, 2, 24, 12, 0, 0);
  const weekStart = getWeekStartMonday(nowTs);
  const completedMeta = {
    e1: new Date(weekStart + 1 * 60 * 60 * 1000).toISOString(),
    e2: new Date(weekStart + 2 * 60 * 60 * 1000).toISOString(),
  };
  const analystIds = new Set(['a1', 'a2']);
  const engineerIds = new Set(['e1', 'e2']);
  const trend = buildLearningTrendFromCompletedMeta({
    completedMeta,
    analystIds,
    engineerIds,
    nowTs,
    dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });
  assert.equal(trend.length, 7);
  assert(Math.max(...trend.map((d) => d.engineer)) >= 1);
  assert(trend.every((d) => d.analyst == null || typeof d.analyst === 'number'));
  assert(trend.every((d) => d.engineer == null || typeof d.engineer === 'number'));
});
