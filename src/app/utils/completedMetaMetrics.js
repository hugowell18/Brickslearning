export function getWeekStartMonday(ts) {
  const d = new Date(ts);
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = localMidnight.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const daysSinceMonday = (day + 6) % 7;
  return localMidnight.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000;
}

export function toOneDecimal(v) {
  if (!Number.isFinite(v)) return 0;
  return Number(v.toFixed(1));
}

export function eventsFromCompletedMeta(completedMeta = {}) {
  return Object.entries(completedMeta).map(([uid, at]) => ({ uid, at }));
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

export function calculateWeeklyCoverageFromCompletedMeta({
  completedMeta,
  allowedIds,
  totalQuestions,
  nowTs,
}) {
  const events = eventsFromCompletedMeta(completedMeta);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekStart = getWeekStartMonday(nowTs);
  const prevWeekStart = thisWeekStart - weekMs;
  const thisWeekCount = countUniqueInWindow(events, allowedIds, thisWeekStart, nowTs);
  const prevWeekCount = countUniqueInWindow(events, allowedIds, prevWeekStart, thisWeekStart);
  const thisWeekCoveragePct = totalQuestions > 0 ? toOneDecimal((thisWeekCount / totalQuestions) * 100) : 0;
  const prevWeekCoveragePct = totalQuestions > 0 ? toOneDecimal((prevWeekCount / totalQuestions) * 100) : 0;
  return {
    thisWeekCount,
    prevWeekCount,
    thisWeekCoveragePct,
    prevWeekCoveragePct,
    changePct: toOneDecimal(thisWeekCoveragePct - prevWeekCoveragePct),
    thisWeekStart,
    prevWeekStart,
  };
}

export function buildLearningTrendFromCompletedMeta({
  completedMeta,
  analystIds,
  engineerIds,
  nowTs,
  dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}) {
  const events = eventsFromCompletedMeta(completedMeta);
  const dayMs = 24 * 60 * 60 * 1000;
  const thisWeekStart = getWeekStartMonday(nowTs);
  return dayLabels.map((label, idx) => {
    const dayStart = thisWeekStart + idx * dayMs;
    if (dayStart > nowTs) return { date: label, analyst: null, engineer: null };
    const dayEnd = Math.min(nowTs, dayStart + dayMs);
    return {
      date: label,
      analyst: countUniqueInWindow(events, analystIds, thisWeekStart, dayEnd),
      engineer: countUniqueInWindow(events, engineerIds, thisWeekStart, dayEnd),
    };
  });
}

