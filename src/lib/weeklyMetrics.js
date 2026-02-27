/**
 * Weekly metrics calculations for learning analytics.
 * File: src/lib/weeklyMetrics.js
 */

/**
 * Extracts the Monday 00:00 of the week containing `date`.
 */
function getWeekStart(date) {
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay();
  const diff = d.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.getUTCFullYear(), d.getUTCMonth(), diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * Gets the ISO week number (1-based) of a date.
 */
function getISOWeekNumber(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const dayNum = d.getUTCDay() || 7; // Sunday = 0, convert to 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(d.getUTCFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Builds 7-day trend data from review events.
 * Returns [mon, tue, wed, thu, fri, sat, sun] with unique question count for each day.
 *
 * @param {Array<{uid: string, at: string}>} reviewEvents
 * @param {Record<string, string>} questionCategoryMap - Maps uid -> category
 * @returns {Object} { analyst: [...], engineer: [...], dates: [...] }
 */
export function buildLearningTrendData(reviewEvents = [], questionCategoryMap = {}) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const weekStart = getWeekStart(today);

  // Initialize 7 days
  const data = {
    analyst: [],
    engineer: [],
    dates: [],
  };

  const dayMap = {
    analyst: {},
    engineer: {},
  };

  // Group events by day and track unique questions per category
  reviewEvents.forEach(event => {
    try {
      const eventDate = new Date(event.at);
      if (isNaN(eventDate.getTime())) return;

      const eventDayStart = new Date(eventDate);
      eventDayStart.setUTCHours(0, 0, 0, 0);

      // Check if within current week
      if (eventDayStart < weekStart) return;

      const dayIndex = Math.floor((eventDayStart - weekStart) / 86400000);
      if (dayIndex >= 7) return;

      const category = questionCategoryMap[event.uid] || 'analyst';
      const trackKey = category === 'Data Engineer' ? 'engineer' : 'analyst';

      if (!dayMap[trackKey][dayIndex]) {
        dayMap[trackKey][dayIndex] = new Set();
      }
      dayMap[trackKey][dayIndex].add(event.uid);
    } catch {
      // ignore invalid events
    }
  });

  // Build 7-day arrays
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 7; i++) {
    data.analyst.push((dayMap.analyst[i] || new Set()).size);
    data.engineer.push((dayMap.engineer[i] || new Set()).size);
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + i);
    data.dates.push(`${days[i]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`);
  }

  return data;
}

/**
 * Builds 4-week accuracy trend from attempt events.
 * Returns weekly correct rates [W1, W2, W3, W4] (newest last).
 *
 * @param {Array<{uid: string, correct: boolean, at: string}>} attemptEvents
 * @returns {Array<{week: string, rate: number}>}
 */
export function buildAccuracyTrendData(attemptEvents = []) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Collect events by (ISO) week number, track (correct, total) per week
  const weekStats = {};

  attemptEvents.forEach(event => {
    try {
      const eventDate = new Date(event.at);
      if (isNaN(eventDate.getTime())) return;

      const weekNum = getISOWeekNumber(eventDate);
      const year = eventDate.getUTCFullYear();
      const key = `${year}-W${String(weekNum).padStart(2, '0')}`;

      if (!weekStats[key]) {
        weekStats[key] = { correct: 0, total: 0 };
      }
      weekStats[key].total += 1;
      if (event.correct) {
        weekStats[key].correct += 1;
      }
    } catch {
      // ignore invalid events
    }
  });

  // Get last 4 weeks (including current week)
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const weekNum = getISOWeekNumber(d);
    const year = d.getUTCFullYear();
    const key = `${year}-W${String(weekNum).padStart(2, '0')}`;
    const stats = weekStats[key] || { correct: 0, total: 0 };
    const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    weeks.push({
      week: `W${weekNum}`,
      rate,
    });
  }

  return weeks;
}
