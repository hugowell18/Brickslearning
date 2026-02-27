import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeekStartMonday,
  calculateWeeklyCoverage,
  calculateModuleWeeklyProgress,
} from '../src/app/utils/weeklyMetrics.js';

function localTs(y, m, d, hh = 0, mm = 0, ss = 0) {
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

function examStats(exams, nowTs) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekStart = getWeekStartMonday(nowTs);
  const prevWeekStart = weekStart - weekMs;
  let thisCount = 0;
  let prevCount = 0;
  for (const ts of exams) {
    if (ts >= weekStart && ts < nowTs) thisCount++;
    else if (ts >= prevWeekStart && ts < weekStart) prevCount++;
  }
  let changePct;
  if (prevCount === 0) {
    changePct = thisCount === 0 ? 0 : 100;
  } else {
    changePct = ((thisCount - prevCount) / prevCount) * 100;
  }
  return { thisCount, prevCount, changePct };
}

// fixed question ids for categories
const allQ = ['a1', 'a2', 'e1', 'e2'];
const analystQ = new Set(['a1', 'a2']);
const engineerQ = new Set(['e1', 'e2']);

// events have uid and at


test('dashboard metrics baseline all zero', () => {
  const nowTs = localTs(2026, 3, 1, 12); // Sun
  // modules none
  const modules = [];
  const moduleRes = calculateModuleWeeklyProgress({ modules, nowTs });
  assert.equal(moduleRes.thisWeekPct, 0);
  assert.equal(moduleRes.changePct, 0);

  const events = [];
  const totalCov = calculateWeeklyCoverage({ events, allowedIds: new Set(allQ), totalQuestions: allQ.length, nowTs });
  assert.equal(totalCov.thisWeekCoveragePct, 0);
  assert.equal(totalCov.changePct, 0);

  const anCov = calculateWeeklyCoverage({ events, allowedIds: analystQ, totalQuestions: analystQ.size, nowTs });
  assert.equal(anCov.thisWeekCoveragePct, 0);
  assert.equal(anCov.changePct, 0);

  const enCov = calculateWeeklyCoverage({ events, allowedIds: engineerQ, totalQuestions: engineerQ.size, nowTs });
  assert.equal(enCov.thisWeekCoveragePct, 0);
  assert.equal(enCov.changePct, 0);

  const exams = [];
  const examRes = examStats(exams, nowTs);
  assert.equal(examRes.thisCount, 0);
  assert.equal(examRes.prevCount, 0);
  assert.equal(examRes.changePct, 0);
});

// ... more tests
test('modules progress boundaries and change directions', () => {
  const nowTs = localTs(2026, 3, 1, 12); // Sun
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  // prev: 2 completed, this:1
  const modules = [
    { id: 'm1', completedAt: new Date(weekStart - weekMs + 1).toISOString() },
    { id: 'm2', completedAt: new Date(weekStart - weekMs + 2).toISOString() },
    { id: 'm3', completedAt: new Date(weekStart + 1).toISOString() },
    { id: 'm4' },
  ];
  const res = calculateModuleWeeklyProgress({ modules, nowTs });
  // total 4 modules
  assert.equal(res.thisWeekPct, 25); // 1/4
  assert.equal(res.prevWeekPct, 50); //2/4
  assert.equal(res.changePct, -25);
});

test('question coverage with boundary times & change', () => {
  const nowTs = localTs(2026, 3, 1, 12);
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const events = [
    // prev week a1
    { uid: 'a1', at: new Date(weekStart - weekMs + 1000).toISOString() },
    // this week a2 and e1
    { uid: 'a2', at: new Date(weekStart + 2000).toISOString() },
    { uid: 'e1', at: new Date(weekStart + 3000).toISOString() },
  ];

  const totalCov = calculateWeeklyCoverage({ events, allowedIds: new Set(allQ), totalQuestions: allQ.length, nowTs });
  // prev unique 1, this unique 2 => prev 25%, this 50% change 25
  assert.equal(totalCov.prevWeekCoveragePct, 25);
  assert.equal(totalCov.thisWeekCoveragePct, 50);
  assert.equal(totalCov.changePct, 25);

  const anCov = calculateWeeklyCoverage({ events, allowedIds: analystQ, totalQuestions: analystQ.size, nowTs });
  assert.equal(anCov.prevWeekCoveragePct, 50); // a1/2
  assert.equal(anCov.thisWeekCoveragePct, 50); // a2/2
  assert.equal(anCov.changePct, 0);

  const enCov = calculateWeeklyCoverage({ events, allowedIds: engineerQ, totalQuestions: engineerQ.size, nowTs });
  assert.equal(enCov.prevWeekCoveragePct, 0);
  assert.equal(enCov.thisWeekCoveragePct, 50); // e1/2
  assert.equal(enCov.changePct, 50);
});

test('mock exam change calculations including +100 and -100 and zero prev', () => {
  const nowTs = localTs(2026, 3, 1, 12);
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  // case1: prev0 this2 -> change100
  let exams = [weekStart + 1 * 60 * 60 * 1000, weekStart + 2 * 60 * 60 * 1000];
  let st = examStats(exams, nowTs);
  assert.equal(st.thisCount, 2);
  assert.equal(st.prevCount, 0);
  assert.equal(st.changePct, 100);

  // case2: prev2 this1 -> -50
  exams = [weekStart - weekMs + 1000, weekStart - weekMs + 2000, weekStart + 5000];
  st = examStats(exams, nowTs);
  assert.equal(st.prevCount, 2);
  assert.equal(st.thisCount, 1);
  assert.equal(st.changePct, -50);

  // case3: both zero ->0
  exams = [];
  st = examStats(exams, nowTs);
  assert.equal(st.changePct, 0);
});
