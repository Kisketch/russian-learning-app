export function calculateSM2(quality, interval, repetitions, easeFactor) {
  let nextInterval = 0, nextRepetitions = repetitions;
  let nextEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;
  if (quality >= 3) {
    if (repetitions === 0) nextInterval = 1;
    else if (repetitions === 1) nextInterval = 6;
    else nextInterval = Math.round(interval * easeFactor);
    nextRepetitions += 1;
  } else {
    nextRepetitions = 0; nextInterval = 1;
  }
  return { interval: nextInterval, repetitions: nextRepetitions, easeFactor: nextEaseFactor };
}