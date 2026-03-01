/**
 * Build a deterministic seeded PRNG from string seed.
 * xmur3 + mulberry32 combination.
 */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a) {
  return function next() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function labelFromIndex(index) {
  return String.fromCharCode(65 + index);
}

export function parseAnswerLabels(ans) {
  return (ans || '')
    .toUpperCase()
    .split('')
    .filter((ch) => ch >= 'A' && ch <= 'Z');
}

/**
 * Build display order and label mapping for one question.
 * @param {{uid?: string, opts?: string[], ans?: string}} question
 * @param {string} sessionSeed
 */
export function buildQuestionOptionOrder(question, sessionSeed) {
  const opts = Array.isArray(question?.opts) ? question.opts : [];
  const key = `${sessionSeed || 'default'}::${question?.uid || 'unknown'}::${opts.length}`;
  const seed = xmur3(key)();
  const rand = mulberry32(seed);

  const originalIndices = opts.map((_, i) => i);
  for (let i = originalIndices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [originalIndices[i], originalIndices[j]] = [originalIndices[j], originalIndices[i]];
  }

  const labelToOriginalLabel = {};
  const displayedOptions = originalIndices.map((originalIndex, displayIndex) => {
    const displayLabel = labelFromIndex(displayIndex);
    const originalLabel = labelFromIndex(originalIndex);
    labelToOriginalLabel[displayLabel] = originalLabel;
    return {
      displayIndex,
      displayLabel,
      originalIndex,
      originalLabel,
      text: opts[originalIndex],
    };
  });

  const expectedOriginal = new Set(parseAnswerLabels(question?.ans));
  const expectedDisplay = new Set(
    displayedOptions
      .filter((item) => expectedOriginal.has(item.originalLabel))
      .map((item) => item.displayLabel),
  );

  return {
    displayedOptions,
    labelToOriginalLabel,
    expectedDisplay,
  };
}

/**
 * Convert selected display labels into original labels for scoring.
 * @param {string[]} selectedDisplayLabels
 * @param {{[k: string]: string}} labelToOriginalLabel
 */
export function selectedDisplayToOriginal(selectedDisplayLabels, labelToOriginalLabel) {
  if (!Array.isArray(selectedDisplayLabels) || !labelToOriginalLabel) return [];
  return selectedDisplayLabels
    .map((label) => labelToOriginalLabel[label])
    .filter(Boolean);
}

