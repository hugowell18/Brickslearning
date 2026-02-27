/**
 * Practice completion policy:
 * - Submitting explanation counts as completed.
 * - Moving to next question also counts as completed.
 */
export function shouldMarkCompletedOnSubmit() {
  return true;
}

export function shouldMarkCompletedOnNext() {
  return true;
}

