/**
 * How long answers took, for the line at the end of a round.
 *
 * Kept apart from the screen so the awkward parts — a question nobody
 * answered, a phone that was put down mid-round — are decided once and can
 * be checked without playing a quiz.
 */

/**
 * One question's thinking time, in milliseconds.
 *
 * A question with a clock on it cannot honestly have taken longer than that
 * clock: if the app went to the background the wall clock kept running while
 * the countdown did not, and an hour-long "answer" would wreck the average
 * for the whole round. Without a clock there is nothing to measure against,
 * so the elapsed time stands.
 */
export function answerSample(elapsedMs: number, timerSeconds?: number): number {
  const elapsed = Math.max(0, Math.round(elapsedMs));
  if (!timerSeconds) return elapsed;
  return Math.min(elapsed, timerSeconds * 1000);
}

/**
 * The mean of what was actually answered, or null when nothing was — a round
 * closed on the first question has no average to report, and reporting zero
 * would read as "instant".
 */
export function averageAnswerMs(samples: number[]): number | null {
  if (samples.length === 0) return null;
  const total = samples.reduce((sum, ms) => sum + ms, 0);
  return Math.round(total / samples.length);
}

/**
 * Seconds to one decimal, for display: 4200 -> "4.2".
 *
 * Rounded to tenths before formatting rather than left to `toFixed`, which
 * follows the binary value: 950 ms is held as a hair under 0.95 s and would
 * come out as "0.9".
 */
export function formatSeconds(ms: number): string {
  return (Math.round(ms / 100) / 10).toFixed(1);
}
