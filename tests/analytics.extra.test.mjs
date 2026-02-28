import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeekStartMonday,
  calculateWeeklyCoverage,
  buildLearningTrendData,
  buildAccuracyTrendData,
  calculateAccuracyWeeklyChange,
  calculateModuleWeeklyProgress,
} from '../src/app/utils/weeklyMetrics.js';

// helper to build local timestamp
function localTs(y, m, d, hh = 0, mm = 0, ss = 0) {
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

// -- getWeekStartMonday ----------------------------------------------------------------------
test('getWeekStartMonday produces a Monday timestamp within same week', () => {
  // sample dates covering one week plus Sunday
  const dates = [
    localTs(2026, 2, 24), // Mon
    localTs(2026, 2, 25), // Tue
    localTs(2026, 2, 26), // Wed
    localTs(2026, 2, 27), // Thu
    localTs(2026, 2, 28), // Fri
    localTs(2026, 3, 1),  // Sat
    localTs(2026, 3, 2),  // Sun
  ];
  for (const ts of dates) {
    const start = getWeekStartMonday(ts);
    const d = new Date(start).getDay();
    assert.equal(d, 1, 'result should land on a Monday');
    assert.ok(start <= ts, 'week start must be <= timestamp');
    assert.ok(start + 7 * 24 * 60 * 60 * 1000 > ts, 'week start +7d should be after timestamp');
  }
});

// -- calculateWeeklyCoverage duplicates & boundaries ------------------------------------------------
test('calculateWeeklyCoverage ignores duplicate uids and excludes nowTs', () => {
  const nowTs = localTs(2026, 3, 1, 12);
  const weekStart = getWeekStartMonday(nowTs);
  const events = [
    { uid: 'q1', at: new Date(weekStart + 1000).toISOString() },
    { uid: 'q1', at: new Date(weekStart + 2000).toISOString() },
    { uid: 'q2', at: new Date(weekStart + 3000).toISOString() },
    { uid: 'q3', at: new Date(nowTs).toISOString() }, // at nowTs should be excluded
  ];
  const allowed = new Set(['q1', 'q2', 'q3']);
  const res = calculateWeeklyCoverage({ events, allowedIds: allowed, totalQuestions: 3, nowTs });
  // unique in window should be q1 and q2 only (q3 at boundary excluded)
  assert.equal(res.thisWeekUniqueCount, 2);
  assert.equal(res.thisWeekCoveragePct, (2 / 3) * 100);
});

// -- buildLearningTrendData tests -------------------------------------------------------------
test('buildLearningTrendData accumulates counts per day until nowTs', () => {
  const nowTs = localTs(2026, 2, 28, 15); // Sun afternoon
  const weekStart = getWeekStartMonday(nowTs);
  const analystIds = new Set(['a1']);
  const engineerIds = new Set(['e1']);
  const events = [
    { uid: 'a1', at: new Date(weekStart + 2 * 24 * 60 * 60 * 1000).toISOString() }, // Wed
    { uid: 'e1', at: new Date(weekStart + 4 * 24 * 60 * 60 * 1000).toISOString() }, // Fri
    { uid: 'a1', at: new Date(weekStart + 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString() }, // Sun noon
  ];

  const trend = buildLearningTrendData({ events, analystIds, engineerIds, nowTs });
  // expect 7 entries, cumulative counts
  assert.equal(trend.length, 7);
  assert.equal(trend[0].analyst, 0); // Mon
  assert.equal(trend[2].analyst, 1); // Wed
  assert.equal(trend[4].engineer, 1); // Fri
  assert.equal(trend[6].analyst, 1); // Sun still 1
});

// -- buildAccuracyTrendData tests -------------------------------------------------------------
test('buildAccuracyTrendData returns correct number of weeks and clamps rates', () => {
  const nowTs = localTs(2026, 3, 2); // Tue
  const weekStart = getWeekStartMonday(nowTs);
  // create attempts such that first week has 150% (incorrect, but clamp should make 100)
  const attempts = [
    { uid: 'x', correct: true, at: new Date(weekStart - 2 * 7 * 24 * 60 * 60 * 1000 + 1000).toISOString() },
    { uid: 'y', correct: true, at: new Date(weekStart - 2 * 7 * 24 * 60 * 60 * 1000 + 2000).toISOString() },
    { uid: 'x', correct: false, at: new Date(weekStart - 2 * 7 * 24 * 60 * 60 * 1000 + 3000).toISOString() },
  ];
  const trend = buildAccuracyTrendData({ attempts, nowTs, weeks: 3 });
  assert.equal(trend.length, 3);
  // first element corresponds to 3 weeks ago
  // two correct out of three attempts → 66.66%
  assert.equal(trend[0].rate, (2 / 3) * 100);
  // later weeks with no data should be zero
  assert.equal(trend[1].rate, 0);
  assert.equal(trend[2].rate, 0);
});

// -- calculateAccuracyWeeklyChange filtering and invalid -------------------------------------
test('calculateAccuracyWeeklyChange filters by allowedIds and ignores invalid times', () => {
  const nowTs = localTs(2026, 2, 28);
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const prevWeekStart = weekStart - weekMs;
  const allowed = new Set(['q1']);
  const attempts = [
    { uid: 'q1', correct: true, at: new Date(weekStart + 1000).toISOString() },
    { uid: 'q2', correct: false, at: new Date(weekStart + 2000).toISOString() }, // should be ignored
    { uid: 'q1', correct: false, at: 'not-a-date' }, // ignore
    { uid: 'q1', correct: true, at: new Date(prevWeekStart + 1000).toISOString() },
  ];

  const res = calculateAccuracyWeeklyChange({ attempts, allowedIds: allowed, nowTs });
  assert.equal(res.thisWeekTotal, 1);
  assert.equal(res.prevWeekTotal, 1);
  assert.equal(res.thisWeekRate, 100);
  assert.equal(res.prevWeekRate, 100);
  assert.equal(res.changePct, 0);
});

// -- calculateModuleWeeklyProgress invalid timestamps & clamping ---------------------------------
test('calculateModuleWeeklyProgress ignores invalid dates and clamps percentages', () => {
  const nowTs = localTs(2026, 3, 1, 12);
  const weekStart = getWeekStartMonday(nowTs);
  const modules = [
    { id: 'm1', completedAt: 'bad-date' },
    { id: 'm2', completedAt: new Date(weekStart + 1000).toISOString() },
  ];
  const res = calculateModuleWeeklyProgress({ modules, nowTs });
  assert.equal(res.thisWeekCompleted, 1);
  assert.equal(res.totalModules, 2);
  assert.equal(res.thisWeekPct, 50);
});
