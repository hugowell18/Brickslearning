export function getWeekStartMonday(ts) {
  const d = new Date(ts);
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = localMidnight.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const daysSinceMonday = (day + 6) % 7;
  return localMidnight.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000;
}

function countUniqueInWindow(events, allowedIds, startTs, endTs) {
  const hit = new Set();
  for (const evt of events) {
    if (!allowedIds.has(evt.uid)) continue;
    const ts = Date.parse(evt.at);
    if (Number.isNaN(ts)) continue;
    if (ts >= startTs && ts < endTs) hit.add(evt.uid);
  }
  return hit.size;
}

export function calculateWeeklyCoverage({ events, allowedIds, totalQuestions, nowTs }) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekStartTs = getWeekStartMonday(nowTs);
  const prevWeekStartTs = weekStartTs - weekMs;

  const thisWeekUniqueCount = countUniqueInWindow(events, allowedIds, weekStartTs, nowTs);
  const prevWeekUniqueCount = countUniqueInWindow(events, allowedIds, prevWeekStartTs, weekStartTs);

  const thisWeekCoveragePct = totalQuestions > 0 ? (thisWeekUniqueCount / totalQuestions) * 100 : 0;
  const prevWeekCoveragePct = totalQuestions > 0 ? (prevWeekUniqueCount / totalQuestions) * 100 : 0;

  return {
    weekStartTs,
    prevWeekStartTs,
    thisWeekUniqueCount,
    prevWeekUniqueCount,
    thisWeekCoveragePct,
    prevWeekCoveragePct,
    changePct: thisWeekCoveragePct - prevWeekCoveragePct,
  };
}

function clampPct(v) {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function dayLabelZh(ts) {
  const d = new Date(ts).getDay(); // 0=Sun
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return labels[d];
}

export function buildLearningTrendData({
  events,
  analystIds,
  engineerIds,
  nowTs,
}) {
  const weekStart = getWeekStartMonday(nowTs);
  const dayMs = 24 * 60 * 60 * 1000;
  const out = [];

  for (let i = 0; i < 7; i++) {
    const dayStart = weekStart + i * dayMs;
    const dayEnd = Math.min(nowTs, dayStart + dayMs);

    const analystUnique = countUniqueInWindow(events, analystIds, weekStart, dayEnd);
    const engineerUnique = countUniqueInWindow(events, engineerIds, weekStart, dayEnd);

    out.push({
      date: dayLabelZh(dayStart),
      analyst: analystUnique,
      engineer: engineerUnique,
    });
  }
  return out;
}

export function buildAccuracyTrendData({ attempts, nowTs, weeks = 4 }) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = getWeekStartMonday(nowTs);
  const out = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeekStart - i * weekMs;
    const end = start + weekMs;
    let total = 0;
    let correct = 0;

    for (const evt of attempts) {
      const ts = Date.parse(evt.at);
      if (Number.isNaN(ts)) continue;
      if (ts >= start && ts < end) {
        total += 1;
        if (evt.correct) correct += 1;
      }
    }

    const rate = total > 0 ? (correct / total) * 100 : 0;
    out.push({ week: `第${weeks - i}周`, rate: clampPct(rate) });
  }

  return out;
}

export function calculateModuleWeeklyProgress({ modules, nowTs }) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = getWeekStartMonday(nowTs);
  const prevWeekStart = thisWeekStart - weekMs;

  // Count modules completed in this week and previous week
  let thisWeekCompleted = 0;
  let prevWeekCompleted = 0;
  const totalModules = modules.length;

  for (const module of modules) {
    if (!module.completedAt) continue;
    
    const completedTs = Date.parse(module.completedAt);
    if (Number.isNaN(completedTs)) continue;

    if (completedTs >= thisWeekStart && completedTs < thisWeekStart + weekMs) {
      thisWeekCompleted += 1;
    } else if (completedTs >= prevWeekStart && completedTs < thisWeekStart) {
      prevWeekCompleted += 1;
    }
  }

  const thisWeekPct = totalModules > 0 ? (thisWeekCompleted / totalModules) * 100 : 0;
  const prevWeekPct = totalModules > 0 ? (prevWeekCompleted / totalModules) * 100 : 0;

  return {
    thisWeekCompleted,
    prevWeekCompleted,
    totalModules,
    thisWeekPct: clampPct(thisWeekPct),
    prevWeekPct: clampPct(prevWeekPct),
    changePct: thisWeekPct - prevWeekPct,
  };
}

export function buildAccuracyTrendByTrack({ attempts, trackIds, nowTs, weeks = 4, trackName = '' }) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = getWeekStartMonday(nowTs);
  const out = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeekStart - i * weekMs;
    const end = start + weekMs;
    let total = 0;
    let correct = 0;

    for (const evt of attempts) {
      if (!trackIds.has(evt.uid)) continue;
      const ts = Date.parse(evt.at);
      if (Number.isNaN(ts)) continue;
      if (ts >= start && ts < end) {
        total += 1;
        if (evt.correct) correct += 1;
      }
    }

    const rate = total > 0 ? (correct / total) * 100 : 0;
    out.push({
      week: `第${weeks - i}周`,
      rate: clampPct(rate),
      attempt: total,
      correct,
      trackName,
    });
  }

  return out;
}

export function calculateAccuracyWeeklyChange({ attempts, allowedIds, nowTs }) {
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = getWeekStartMonday(nowTs);
  const prevWeekStart = thisWeekStart - weekMs;

  let thisWeekCorrect = 0;
  let thisWeekTotal = 0;
  let prevWeekCorrect = 0;
  let prevWeekTotal = 0;

  for (const evt of attempts) {
    if (!allowedIds.has(evt.uid)) continue;
    const ts = Date.parse(evt.at);
    if (Number.isNaN(ts)) continue;

    if (ts >= thisWeekStart && ts < thisWeekStart + weekMs) {
      thisWeekTotal += 1;
      if (evt.correct) thisWeekCorrect += 1;
    } else if (ts >= prevWeekStart && ts < thisWeekStart) {
      prevWeekTotal += 1;
      if (evt.correct) prevWeekCorrect += 1;
    }
  }

  const thisWeekRate = thisWeekTotal > 0 ? (thisWeekCorrect / thisWeekTotal) * 100 : 0;
  const prevWeekRate = prevWeekTotal > 0 ? (prevWeekCorrect / prevWeekTotal) * 100 : 0;

  return {
    thisWeekCorrect,
    thisWeekTotal,
    thisWeekRate: clampPct(thisWeekRate),
    prevWeekCorrect,
    prevWeekTotal,
    prevWeekRate: clampPct(prevWeekRate),
    changePct: thisWeekRate - prevWeekRate,
  };
}


