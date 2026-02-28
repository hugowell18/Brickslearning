/**
 * @param {Record<string, 'correct'|'incorrect'>} statusMap
 * @param {string[]} orderedQuestionIds
 */
export function extractWrongQuestionIds(statusMap, orderedQuestionIds) {
  if (!statusMap || !Array.isArray(orderedQuestionIds)) return [];
  return orderedQuestionIds.filter((uid) => statusMap[uid] === 'incorrect');
}

/**
 * @param {string[] | undefined} requestedIds
 * @param {Set<string>} validQuestionIds
 */
export function normalizeReviewRequestIds(requestedIds, validQuestionIds) {
  if (!Array.isArray(requestedIds) || requestedIds.length === 0) return [];
  const seen = new Set();
  const normalized = [];
  for (const uid of requestedIds) {
    if (!validQuestionIds.has(uid)) continue;
    if (seen.has(uid)) continue;
    seen.add(uid);
    normalized.push(uid);
  }
  return normalized;
}
