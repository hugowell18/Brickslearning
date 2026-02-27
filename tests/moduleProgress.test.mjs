import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWeekStartMonday,
  calculateModuleWeeklyProgress,
} from '../src/app/utils/weeklyMetrics.js';

function localTs(y, m, d, hh = 0, mm = 0, ss = 0) {
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
}

test('calculateModuleWeeklyProgress: 空模块列表应返回0/0', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const result = calculateModuleWeeklyProgress({
    modules: [],
    nowTs,
  });

  assert.equal(result.thisWeekCompleted, 0);
  assert.equal(result.prevWeekCompleted, 0);
  assert.equal(result.totalModules, 0);
  assert.equal(result.thisWeekPct, 0);
  assert.equal(result.changePct, 0);
});

test('calculateModuleWeeklyProgress: 本周无完成时间的模块应被忽略', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const modules = [
    { id: 'm1', status: 'completed' }, // 无completedAt
    { id: 'm2', status: 'completed' }, // 无completedAt
    { id: 'm3', status: 'in-progress' },
  ];

  const result = calculateModuleWeeklyProgress({
    modules,
    nowTs,
  });

  assert.equal(result.thisWeekCompleted, 0);
  assert.equal(result.prevWeekCompleted, 0);
  assert.equal(result.totalModules, 3);
  assert.equal(result.thisWeekPct, 0);
});

test('calculateModuleWeeklyProgress: 本周有完成，上周无完成 → 正变化', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const weekStart = getWeekStartMonday(nowTs); // 周一00:00

  const modules = [
    { id: 'm1', status: 'completed', completedAt: new Date(weekStart + 2 * 24 * 60 * 60 * 1000).toISOString() }, // 周三
    { id: 'm2', status: 'completed', completedAt: new Date(weekStart + 4 * 24 * 60 * 60 * 1000).toISOString() }, // 周五
    { id: 'm3', status: 'in-progress' },
    { id: 'm4', status: 'not-started' },
  ];

  const result = calculateModuleWeeklyProgress({
    modules,
    nowTs,
  });

  assert.equal(result.thisWeekCompleted, 2);
  assert.equal(result.prevWeekCompleted, 0);
  assert.equal(result.totalModules, 4);
  assert.equal(result.thisWeekPct, 50); // 2/4 = 50%
  assert.equal(result.changePct, 50); // 50% - 0% = 50%
});

test('calculateModuleWeeklyProgress: 本周无完成，上周有完成 → 负变化', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const weekStart = getWeekStartMonday(nowTs); // 本周一
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const prevWeekStart = weekStart - weekMs; // 上周一

  const modules = [
    { id: 'm1', status: 'completed', completedAt: new Date(prevWeekStart + 1 * 24 * 60 * 60 * 1000).toISOString() }, // 上周二
    { id: 'm2', status: 'completed', completedAt: new Date(prevWeekStart + 3 * 24 * 60 * 60 * 1000).toISOString() }, // 上周四
    { id: 'm3', status: 'in-progress' },
    { id: 'm4', status: 'not-started' },
  ];

  const result = calculateModuleWeeklyProgress({
    modules,
    nowTs,
  });

  assert.equal(result.thisWeekCompleted, 0);
  assert.equal(result.prevWeekCompleted, 2);
  assert.equal(result.totalModules, 4);
  assert.equal(result.thisWeekPct, 0);
  assert.equal(result.prevWeekPct, 50);
  assert.equal(result.changePct, -50); // 0% - 50% = -50%
});

test('calculateModuleWeeklyProgress: 本周和上周都有完成 → 计算差异', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const weekStart = getWeekStartMonday(nowTs);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const prevWeekStart = weekStart - weekMs;

  const modules = [
    // 上周
    { id: 'm1', status: 'completed', completedAt: new Date(prevWeekStart + 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm2', status: 'completed', completedAt: new Date(prevWeekStart + 3 * 24 * 60 * 60 * 1000).toISOString() },
    // 本周
    { id: 'm3', status: 'completed', completedAt: new Date(weekStart + 2 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'm4', status: 'completed', completedAt: new Date(weekStart + 4 * 24 * 60 * 60 * 1000).toISOString() },
    // 未完成
    { id: 'm5', status: 'in-progress' },
    { id: 'm6', status: 'in-progress' },
  ];

  const result = calculateModuleWeeklyProgress({
    modules,
    nowTs,
  });

  assert.equal(result.thisWeekCompleted, 2);
  assert.equal(result.prevWeekCompleted, 2);
  assert.equal(result.totalModules, 6);
  // 33.33...% (2/6 * 100)
  assert.equal(Math.round(result.thisWeekPct), 33);
  assert.equal(Math.round(result.prevWeekPct), 33);
  assert.equal(result.changePct, 0); // 无变化
});

test('calculateModuleWeeklyProgress: 时间边界测试 - 周一00:00应包含在当周', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0); // 周五
  const weekStart = getWeekStartMonday(nowTs); // 周一00:00

  const modules = [
    // 周一00:00 - 应包含在本周
    { id: 'm1', status: 'completed', completedAt: new Date(weekStart).toISOString() },
    // 下周一00:00 - 应排除在本周
    { id: 'm2', status: 'completed', completedAt: new Date(weekStart + 7 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  const result = calculateModuleWeeklyProgress({
    modules,
    nowTs,
  });

  assert.equal(result.thisWeekCompleted, 1); // 只有m1
  assert.equal(result.prevWeekCompleted, 0);
});

test('calculateModuleWeeklyProgress: 无效时间格式应被忽略', () => {
  const nowTs = localTs(2026, 2, 27, 12, 0, 0);
  const weekStart = getWeekStartMonday(nowTs);

  const modules = [
    { id: 'm1', status: 'completed', completedAt: 'invalid-date' }, // 无效
    { id: 'm2', status: 'completed', completedAt: new Date(weekStart + 1 * 24 * 60 * 60 * 1000).toISOString() }, // 有效
    { id: 'm3', status: 'completed', completedAt: null }, // null应忽略
    { id: 'm4', status: 'in-progress' },
  ];

  const result = calculateModuleWeeklyProgress({
    modules,
    nowTs,
  });

  assert.equal(result.thisWeekCompleted, 1); // 只有m2被计入
  assert.equal(result.totalModules, 4);
  assert.equal(result.thisWeekPct, 25); // 1/4
});
