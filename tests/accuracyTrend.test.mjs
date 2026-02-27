import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeekStartMonday,
  buildAccuracyTrendByTrack,
  calculateAccuracyWeeklyChange,
} from '../src/app/utils/weeklyMetrics.js';

function localTs(y, m, d, hh = 0, mm = 0, ss = 0) {
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

test('buildAccuracyTrendByTrack: 空attempts应返回4周且全0', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const analystIds = new Set(['q1', 'q2', 'q3']);

  const data = buildAccuracyTrendByTrack({
    attempts: [],
    trackIds: analystIds,
    nowTs,
    weeks: 4,
    trackName: 'Data Analyst',
  });

  assert.equal(data.length, 4);
  for (const week of data) {
    assert.equal(week.rate, 0);
    assert.equal(week.attempt, 0);
    assert.equal(week.correct, 0);
  }
});

test('buildAccuracyTrendByTrack: Track-specific filtering和准确率计算', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const analystIds = new Set(['q1', 'q2', 'q3', 'q4']);
  const engineerIds = new Set(['q5', 'q6']);

  // 混合analyst和engineer的attempts
  const attempts = [
    // 第1周：analyst 2正确 1错误 = 66.67%, engineer 1正确 1错误 = 50%
    { uid: 'q1', correct: true, at: new Date(weekStart - 3 * weekMs + 1 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: true, at: new Date(weekStart - 3 * weekMs + 2 * 60 * 60 * 1000).toISOString() },
    { uid: 'q3', correct: false, at: new Date(weekStart - 3 * weekMs + 3 * 60 * 60 * 1000).toISOString() },
    { uid: 'q5', correct: true, at: new Date(weekStart - 3 * weekMs + 4 * 60 * 60 * 1000).toISOString() },
    { uid: 'q6', correct: false, at: new Date(weekStart - 3 * weekMs + 5 * 60 * 60 * 1000).toISOString() },

    // 第4周：analyst 2正确 2错误 = 50%, engineer 1正确 = 100%
    { uid: 'q1', correct: true, at: new Date(weekStart + 1 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: true, at: new Date(weekStart + 2 * 60 * 60 * 1000).toISOString() },
    { uid: 'q3', correct: false, at: new Date(weekStart + 3 * 60 * 60 * 1000).toISOString() },
    { uid: 'q4', correct: false, at: new Date(weekStart + 4 * 60 * 60 * 1000).toISOString() },
    { uid: 'q5', correct: true, at: new Date(weekStart + 5 * 60 * 60 * 1000).toISOString() },
  ];

  const analystData = buildAccuracyTrendByTrack({
    attempts,
    trackIds: analystIds,
    nowTs,
    weeks: 4,
    trackName: 'Data Analyst',
  });

  const engineerData = buildAccuracyTrendByTrack({
    attempts,
    trackIds: engineerIds,
    nowTs,
    weeks: 4,
    trackName: 'Data Engineer',
  });

  // Analyst第1周：2/3 = 66.67% → clampPct会返回 66.67（浮点数）
  assert.equal(Math.round(analystData[0].rate), 67);
  assert.equal(analystData[0].attempt, 3);
  assert.equal(analystData[0].correct, 2);

  // Analyst第4周：2/4 = 50%
  assert.equal(analystData[3].rate, 50);
  assert.equal(analystData[3].attempt, 4);
  assert.equal(analystData[3].correct, 2);

  // Engineer第1周：1/2 = 50%
  assert.equal(engineerData[0].rate, 50);
  assert.equal(engineerData[0].attempt, 2);
  assert.equal(engineerData[0].correct, 1);

  // Engineer第4周：1/1 = 100%
  assert.equal(engineerData[3].rate, 100);
  assert.equal(engineerData[3].attempt, 1);
  assert.equal(engineerData[3].correct, 1);
});

test('buildAccuracyTrendByTrack: 无效时间和空周处理', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const trackIds = new Set(['q1', 'q2']);
  const attempts = [
    // 第1周
    { uid: 'q1', correct: true, at: new Date(weekStart - 3 * weekMs).toISOString() },
    { uid: 'q1', correct: false, at: 'invalid-date' }, // 无效时间被忽略
    // 第2周：空
    // 第3周
    { uid: 'q2', correct: true, at: new Date(weekStart - weekMs).toISOString() },
    // 第4周：空
  ];

  const data = buildAccuracyTrendByTrack({
    attempts,
    trackIds,
    nowTs,
    weeks: 4,
  });

  // 第1周：1/1 = 100%
  assert.equal(data[0].rate, 100);
  assert.equal(data[0].attempt, 1);

  // 第2周：空 = 0%
  assert.equal(data[1].rate, 0);
  assert.equal(data[1].attempt, 0);

  // 第3周：1/1 = 100%
  assert.equal(data[2].rate, 100);
  assert.equal(data[2].attempt, 1);

  // 第4周：空 = 0%
  assert.equal(data[3].rate, 0);
  assert.equal(data[3].attempt, 0);
});

test('calculateAccuracyWeeklyChange: 本周无作答，上周无作答', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const trackIds = new Set(['q1', 'q2']);

  const result = calculateAccuracyWeeklyChange({
    attempts: [],
    allowedIds: trackIds,
    nowTs,
  });

  assert.equal(result.thisWeekCorrect, 0);
  assert.equal(result.thisWeekTotal, 0);
  assert.equal(result.thisWeekRate, 0);
  assert.equal(result.prevWeekCorrect, 0);
  assert.equal(result.prevWeekTotal, 0);
  assert.equal(result.prevWeekRate, 0);
  assert.equal(result.changePct, 0);
});

test('calculateAccuracyWeeklyChange: 本周100%，上周50% → +50%提升', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const prevWeekStart = weekStart - weekMs;

  const trackIds = new Set(['q1', 'q2', 'q3']);
  const attempts = [
    // 上周：2正确 2错误 = 50%
    { uid: 'q1', correct: true, at: new Date(prevWeekStart + 1 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: true, at: new Date(prevWeekStart + 2 * 60 * 60 * 1000).toISOString() },
    { uid: 'q1', correct: false, at: new Date(prevWeekStart + 3 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: false, at: new Date(prevWeekStart + 4 * 60 * 60 * 1000).toISOString() },

    // 本周：3正确 = 100%
    { uid: 'q1', correct: true, at: new Date(weekStart + 1 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: true, at: new Date(weekStart + 2 * 60 * 60 * 1000).toISOString() },
    { uid: 'q3', correct: true, at: new Date(weekStart + 3 * 60 * 60 * 1000).toISOString() },
  ];

  const result = calculateAccuracyWeeklyChange({
    attempts,
    allowedIds: trackIds,
    nowTs,
  });

  assert.equal(result.thisWeekCorrect, 3);
  assert.equal(result.thisWeekTotal, 3);
  assert.equal(result.thisWeekRate, 100);
  assert.equal(result.prevWeekCorrect, 2);
  assert.equal(result.prevWeekTotal, 4);
  assert.equal(result.prevWeekRate, 50);
  assert.equal(result.changePct, 50);
});

test('calculateAccuracyWeeklyChange: 本周0%，上周100% → -100%下降', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const prevWeekStart = weekStart - weekMs;

  const trackIds = new Set(['q1', 'q2']);
  const attempts = [
    // 上周：2正确 = 100%
    { uid: 'q1', correct: true, at: new Date(prevWeekStart + 1 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: true, at: new Date(prevWeekStart + 2 * 60 * 60 * 1000).toISOString() },

    // 本周：0正确 2错误 = 0%
    { uid: 'q1', correct: false, at: new Date(weekStart + 1 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: false, at: new Date(weekStart + 2 * 60 * 60 * 1000).toISOString() },
  ];

  const result = calculateAccuracyWeeklyChange({
    attempts,
    allowedIds: trackIds,
    nowTs,
  });

  assert.equal(result.thisWeekCorrect, 0);
  assert.equal(result.thisWeekTotal, 2);
  assert.equal(result.thisWeekRate, 0);
  assert.equal(result.prevWeekCorrect, 2);
  assert.equal(result.prevWeekTotal, 2);
  assert.equal(result.prevWeekRate, 100);
  assert.equal(result.changePct, -100);
});

test('calculateAccuracyWeeklyChange: Track过滤和时间边界', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const analystIds = new Set(['q1', 'q2']);
  const attempts = [
    // 本周analyst：2正确 = 100%
    { uid: 'q1', correct: true, at: new Date(weekStart + 1 * 60 * 60 * 1000).toISOString() },
    { uid: 'q2', correct: true, at: new Date(weekStart + 2 * 60 * 60 * 1000).toISOString() },
    // 本周engineer（应被过滤）
    { uid: 'q5', correct: false, at: new Date(weekStart + 3 * 60 * 60 * 1000).toISOString() },
    { uid: 'q6', correct: false, at: new Date(weekStart + 4 * 60 * 60 * 1000).toISOString() },
  ];

  const result = calculateAccuracyWeeklyChange({
    attempts,
    allowedIds: analystIds,
    nowTs,
  });

  // 只计入analyst的2个，100%
  assert.equal(result.thisWeekCorrect, 2);
  assert.equal(result.thisWeekTotal, 2);
  assert.equal(result.thisWeekRate, 100);
});

test('calculateAccuracyWeeklyChange: 时间边界 - 周一00:00 inclusive，下周一 exclusive', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const trackIds = new Set(['q1']);
  const attempts = [
    // 周一00:00 - 本周
    { uid: 'q1', correct: true, at: new Date(weekStart).toISOString() },
    // 下周一00:00 - 不属于本周
    { uid: 'q1', correct: true, at: new Date(weekStart + weekMs).toISOString() },
  ];

  const result = calculateAccuracyWeeklyChange({
    attempts,
    allowedIds: trackIds,
    nowTs,
  });

  // 只有第一个在本周
  assert.equal(result.thisWeekCorrect, 1);
  assert.equal(result.thisWeekTotal, 1);
  assert.equal(result.thisWeekRate, 100);
});

test('calculateAccuracyWeeklyChange: 无效时间被忽略', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const weekStart = getWeekStartMonday(nowTs);

  const trackIds = new Set(['q1', 'q2']);
  const attempts = [
    { uid: 'q1', correct: true, at: new Date(weekStart).toISOString() },
    { uid: 'q2', correct: false, at: 'invalid-date' }, // 被忽略
    { uid: 'q2', correct: true, at: null }, // 被忽略
  ];

  const result = calculateAccuracyWeeklyChange({
    attempts,
    allowedIds: trackIds,
    nowTs,
  });

  // 只计入有效的q1
  assert.equal(result.thisWeekCorrect, 1);
  assert.equal(result.thisWeekTotal, 1);
  assert.equal(result.thisWeekRate, 100);
});
