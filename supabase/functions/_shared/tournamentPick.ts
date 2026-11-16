// Dealing a tournament quiz that does not repeat what a player has already
// been asked this tournament.
//
// Plain TypeScript with no Deno or Supabase imports, so the app's test suite
// can run it as it is (src/tournament/__tests__/tournamentPick.test.ts).

import { SUBJECT_KEY } from './tournamentSubjects.ts';
import { KEY_POOL, KEY_QUESTIONS } from './tournamentKey.ts';

/** The subjects of seed s's quiz, as their two-digit codes, question by question. */
export function subjectsOf(seed: number): string[] {
  const start = (seed - 1) * KEY_QUESTIONS * 2;
  const out: string[] = [];
  for (let q = 0; q < KEY_QUESTIONS; q++) out.push(SUBJECT_KEY.slice(start + q * 2, start + q * 2 + 2));
  return out;
}

/**
 * How much of seed s's quiz the player would have seen before: one for every
 * question about somebody already met this tournament, and one for every
 * question about somebody met earlier in the same quiz.
 */
export function overlapOf(seed: number, seen: Set<string>): number {
  let overlap = 0;
  const inQuiz = new Set<string>();
  for (const subject of subjectsOf(seed)) {
    if (seen.has(subject) || inQuiz.has(subject)) overlap++;
    inQuiz.add(subject);
  }
  return overlap;
}

/**
 * How many quizzes to look at before settling. There are 186 subjects, but
 * quote questions only ever ask about the few characters with a recording
 * and song questions about the few series with an opening, and those run
 * out first: by the eighth game a clean quiz is about one draw in a few
 * hundred. Looking costs a few string reads each, and the search stops at
 * the first clean one.
 */
export const CANDIDATES = 1000;

/**
 * A seed for the player's next game: the first of up to CANDIDATES random
 * ones with nothing they have seen, else the one with the least.
 *
 * Still random — `draw` is the server's own unpredictable draw, and which
 * candidates come up decides the deal — so a player cannot predict or steer
 * the quiz, only no longer meet the same characters round after round.
 */
export function pickSeed(seen: Set<string>, draw: () => number, candidates = CANDIDATES): number {
  let best = draw();
  let bestOverlap = overlapOf(best, seen);
  for (let i = 1; i < candidates && bestOverlap > 0; i++) {
    const seed = draw();
    const overlap = overlapOf(seed, seen);
    if (overlap < bestOverlap) {
      best = seed;
      bestOverlap = overlap;
    }
  }
  return best;
}

/** Every subject of these seeds' quizzes. */
export function seenIn(seeds: number[]): Set<string> {
  const seen = new Set<string>();
  for (const seed of seeds) {
    if (seed >= 1 && seed <= KEY_POOL) for (const subject of subjectsOf(seed)) seen.add(subject);
  }
  return seen;
}
