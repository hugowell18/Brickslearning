import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLearningTrendFromCompletedMeta,
  calculateWeeklyCoverageFromCompletedMeta,
  eventsFromCompletedMeta,
  getWeekStartMonday,
} from '../src/app/utils/completedMetaMetrics.js';

function localTs(y, m, d, hh = 0, mm = 0, ss = 0) {
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

test('completed_meta empty baseline', () => {
  const nowTs = localTs(2026, 3, 1, 12); // Sunday
  const all = new Set(['a1', 'a2', 'e1', 'e2']);
  const analyst = new Set(['a1', 'a2']);
  const engineer = new Set(['e1', 'e2']);

  const cov = calculateWeeklyCoverageFromCompletedMeta({
    completedMeta: {},
    allowedIds: all,
    totalQuestions: all.size,
    nowTs,
  });

  assert.equal(cov.thisWeekCount, 0);
  assert.equal(cov.prevWeekCount, 0);
  assert.equal(cov.thisWeekCoveragePct, 0);
  assert.equal(cov.prevWeekCoveragePct, 0);
  assert.equal(cov.changePct, 0);

  const trend = buildLearningTrendFromCompletedMeta({
    completedMeta: {},
    analystIds: analyst,
    engineerIds: engineer,
    nowTs,
    dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });
  assert.equal(trend.length, 7);
  assert.deepEqual(trend[0], { date: 'Mon', analyst: 0, engineer: 0 });
  assert.deepEqual(trend[6], { date: 'Sun', analyst: 0, engineer: 0 });
});

test('weekly coverage uses unique uid and computes week-over-week delta', () => {
  const nowTs = localTs(2026, 3, 1, 12); // Sunday
  const weekStart = getWeekStartMonday(nowTs);
  const prevWeekStart = weekStart - 7 * 24 * 60 * 60 * 1000;
  const all = new Set(['a1', 'a2', 'e1', 'e2']);

  const completedMeta = {
    // previous week only
    a1: new Date(prevWeekStart + 1000).toISOString(),
    // this week
    a2: new Date(weekStart + 2000).toISOString(),
    e1: new Date(weekStart + 3000).toISOString(),
  };

  const cov = calculateWeeklyCoverageFromCompletedMeta({
    completedMeta,
    allowedIds: all,
    totalQuestions: all.size,
    nowTs,
  });

  // prev: 1/4 => 25%, this: 2/4 => 50%
  assert.equal(cov.prevWeekCount, 1);
  assert.equal(cov.thisWeekCount, 2);
  assert.equal(cov.prevWeekCoveragePct, 25);
  assert.equal(cov.thisWeekCoveragePct, 50);
  assert.equal(cov.changePct, 25);
});

test('learning trend is cumulative in current week and split by track', () => {
  const nowTs = localTs(2026, 3, 1, 12); // Sunday
  const weekStart = getWeekStartMonday(nowTs);
  const analyst = new Set(['a1', 'a2']);
  const engineer = new Set(['e1', 'e2']);

  const completedMeta = {
    // Monday analyst
    a1: new Date(weekStart + 2 * 60 * 60 * 1000).toISOString(),
    // Wednesday engineer
    e1: new Date(weekStart + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    // Saturday analyst
    a2: new Date(weekStart + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  };

  const trend = buildLearningTrendFromCompletedMeta({
    completedMeta,
    analystIds: analyst,
    engineerIds: engineer,
    nowTs,
    dayLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });

  assert.deepEqual(trend[0], { date: 'Mon', analyst: 1, engineer: 0 });
  assert.deepEqual(trend[1], { date: 'Tue', analyst: 1, engineer: 0 });
  assert.deepEqual(trend[2], { date: 'Wed', analyst: 1, engineer: 1 });
  assert.deepEqual(trend[5], { date: 'Sat', analyst: 2, engineer: 1 });
  assert.deepEqual(trend[6], { date: 'Sun', analyst: 2, engineer: 1 });
});

test('invalid timestamps are ignored and do not pollute metrics', () => {
  const nowTs = localTs(2026, 3, 1, 12);
  const weekStart = getWeekStartMonday(nowTs);
  const all = new Set(['a1', 'a2']);

  const completedMeta = {
    a1: 'not-a-date',
    a2: new Date(weekStart + 1000).toISOString(),
  };

  const events = eventsFromCompletedMeta(completedMeta);
  assert.equal(events.length, 2); // conversion keeps raw values

  const cov = calculateWeeklyCoverageFromCompletedMeta({
    completedMeta,
    allowedIds: all,
    totalQuestions: all.size,
    nowTs,
  });
  assert.equal(cov.thisWeekCount, 1);
  assert.equal(cov.thisWeekCoveragePct, 50);
});

