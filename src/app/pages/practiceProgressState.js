/**
 * @typedef {'correct'|'incorrect'|undefined} QuestionStatus
 * @typedef {'correct'|'incorrect'|'completed'|'unanswered'} DotState
 */

/**
 * Determine visual state for a practice question in the sidebar grid.
 * Completed-but-ungraded questions should still be marked as learned.
 *
 * @param {QuestionStatus} status
 * @param {boolean} isCompleted
 * @returns {DotState}
 */
export function getPracticeDotState(status, isCompleted) {
  if (status === 'correct') return 'correct';
  if (status === 'incorrect') return 'incorrect';
  if (isCompleted) return 'completed';
  return 'unanswered';
}

/**
 * @param {DotState} state
 * @param {boolean} isCurrent
 * @returns {string}
 */
export function getPracticeDotClassName(state, isCurrent) {
  const base =
    state === 'correct'
      ? 'bg-emerald-500 border-emerald-500 text-white'
      : state === 'incorrect'
      ? 'bg-red-500 border-red-500 text-white'
      : state === 'completed'
      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
      : 'bg-white border-slate-200 text-slate-400';
  const current = isCurrent ? 'ring-2 ring-offset-1 ring-[#FF3621]' : 'hover:border-slate-300';
  return `${base} ${current}`;
}

