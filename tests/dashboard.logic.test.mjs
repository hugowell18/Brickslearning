import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toOneDecimal, calculateWeeklyCoverageFromCompletedMeta } from '../src/app/utils/completedMetaMetrics.js';

const src = readFileSync(new URL('../src/app/pages/Dashboard.tsx', import.meta.url), 'utf8');

test('Dashboard stat cards include module/questions/tracks/mock exam metrics', () => {
  assert.match(src, /title="学习模块"/);
  assert.match(src, /title="已完成题目"/);
  assert.match(src, /title="分析师进度"/);
  assert.match(src, /title="工程师进度"/);
  assert.match(src, /title="模拟考试"/);
});

test('toOneDecimal rounds as expected', () => {
  assert.equal(toOneDecimal(66.666), 66.7);
  assert.equal(toOneDecimal(0), 0);
});

test('coverage from completed_meta handles empty + non-empty', () => {
  const nowTs = Date.UTC(2026, 1, 28, 12, 0, 0);
  const empty = calculateWeeklyCoverageFromCompletedMeta({
    completedMeta: {},
    allowedIds: new Set(['q1']),
    totalQuestions: 1,
    nowTs,
  });
  assert.equal(empty.thisWeekCoveragePct, 0);

  const nonEmpty = calculateWeeklyCoverageFromCompletedMeta({
    completedMeta: { q1: new Date(nowTs - 1000).toISOString() },
    allowedIds: new Set(['q1']),
    totalQuestions: 1,
    nowTs,
  });
  assert.equal(nonEmpty.thisWeekCoveragePct, 100);
});

