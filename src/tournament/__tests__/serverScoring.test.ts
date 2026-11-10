import { readFileSync } from 'fs';
import { join } from 'path';
import { ANSWER_KEY, KEY_POOL, KEY_QUESTIONS } from '../../../supabase/functions/_shared/tournamentKey';
import { generateQuiz } from '../../quiz/generateQuiz';
import { CATEGORIES } from '../../data/categories';
import { TIERS } from '../../data/difficulty';
import { GAME_MODES } from '../../data/modes';
import { getT } from '../../i18n/strings';
import { GAME_QUESTIONS } from '../doubleElim';
import { WEEKLY_MATCH_CONFIG } from '../matchConfig';

/**
 * A tournament game is marked by the server, and these are the promises
 * that makes — checked here because the server itself cannot be run from a
 * test, and every one of them fails silently if it breaks: a player simply
 * loses a game they won, or wins one they never played.
 */
const FUNCTION = readFileSync(join(__dirname, '../../../supabase/functions/tournament/index.ts'), 'utf8');
const SCHEMA = readFileSync(join(__dirname, '../../../supabase/schema.sql'), 'utf8');

/** The server's marking, with the server's own indexing. */
function mark(seed: number, picks: number[]): number {
  let score = 0;
  for (let q = 0; q < KEY_QUESTIONS; q++) {
    if (String(picks[q]) === ANSWER_KEY[(seed - 1) * KEY_QUESTIONS + q]) score++;
  }
  return score;
}

const quizOf = (seed: number) => generateQuiz({ ...WEEKLY_MATCH_CONFIG, seed }, 'ru');

describe('the server marks the quiz the app played', () => {
  it('reads the key the way this test does', () => {
    // If the function's indexing ever differs from mark() above, everything
    // below is testing a marking nobody uses.
    expect(FUNCTION).toContain('ANSWER_KEY[(seed - 1) * KEY_QUESTIONS + q]');
    expect(KEY_QUESTIONS).toBe(GAME_QUESTIONS);
  });

  it.each([1, 2, 777, 1500, KEY_POOL])('gives full marks to a perfect game of seed %i', (seed) => {
    const picks = quizOf(seed).map((question) => question.correctIndex);
    expect(mark(seed, picks)).toBe(GAME_QUESTIONS);
  });

  it('gives nothing for a game where the clock ran out every time', () => {
    expect(mark(42, Array(GAME_QUESTIONS).fill(-1))).toBe(0);
  });

  it('counts exactly the questions that were answered right', () => {
    const quiz = quizOf(321);
    // right, wrong, right, wrong… — a wrong pick is the next option round
    const picks = quiz.map((question, i) => (i % 2 === 0 ? question.correctIndex : (question.correctIndex + 1) % 4));
    expect(mark(321, picks)).toBe(Math.ceil(GAME_QUESTIONS / 2));
  });

  it('does not reward tapping the same option every time', () => {
    // Averaged over the pool, a fixed option is right a quarter of the
    // time: under two of seven, nowhere near enough to win a match.
    let total = 0;
    for (let seed = 1; seed <= KEY_POOL; seed++) total += mark(seed, Array(GAME_QUESTIONS).fill(0));
    expect(total / KEY_POOL).toBeLessThan(2.2);
  });
});

describe('the server never takes the app’s word for a score', () => {
  const submit = FUNCTION.slice(
    FUNCTION.indexOf("if (payload.action === 'submit')"),
    FUNCTION.indexOf("if (payload.action === 'previous')")
  );

  it('finds the hand-in at all', () => {
    expect(submit).toContain('scorePicks(dealt.seed, picks)');
  });

  it('has no score in what it accepts', () => {
    // The hole this closes: `score` used to arrive in the request and go
    // straight into the bracket.
    expect(FUNCTION).not.toMatch(/payload\.score/);
    expect(FUNCTION).not.toMatch(/score\?: number/);
  });

  it('refuses a build whose questions the key does not belong to', () => {
    const versionCheck = submit.indexOf('payload.keyVersion !== KEY_VERSION');
    expect(versionCheck).toBeGreaterThan(-1);
    expect(versionCheck).toBeLessThan(submit.indexOf('scorePicks('));
  });

  it('marks only a quiz that was dealt, inside its window', () => {
    for (const refusal of ["'noTicket'", "'tooFast'", "'ticketExpired'"]) {
      const at = submit.indexOf(refusal);
      expect(at).toBeGreaterThan(-1);
      expect(at).toBeLessThan(submit.indexOf('scorePicks('));
    }
  });

  it('lets only the first hand-in land', () => {
    expect(submit).toMatch(/\.is\(game\.side === 'a' \? 'score_a' : 'score_b', null\)/);
  });

  it('limits how many times a game can be dealt', () => {
    const start = FUNCTION.slice(FUNCTION.indexOf("if (payload.action === 'start')"), FUNCTION.indexOf("if (payload.action === 'submit')"));
    expect(start).toContain('used >= MAX_ATTEMPTS');
    expect(start.indexOf('used >= MAX_ATTEMPTS')).toBeLessThan(start.indexOf('drawSeed()'));
  });

  it('keeps the dealt seeds where only the function can reach them', () => {
    const table = SCHEMA.slice(SCHEMA.indexOf('create table if not exists public.tournament_tickets'));
    expect(table).toContain('alter table public.tournament_tickets enable row level security');
    // Row level security with no policy at all means no app can read or
    // write it — which is the intent, so a policy appearing here is a leak.
    expect(SCHEMA).not.toMatch(/on public\.tournament_tickets\s+for/);
  });
});

describe('every refusal a game can meet has words', () => {
  const block = FUNCTION.slice(
    FUNCTION.indexOf("if (payload.action === 'start')"),
    FUNCTION.indexOf("if (payload.action === 'previous')")
  );
  const codes = [...new Set([...block.matchAll(/error: '([a-zA-Z]+)'/g)].map((m) => m[1]))];

  it('finds them', () => {
    expect(codes).toEqual(expect.arrayContaining(['updateRequired', 'noAttemptsLeft', 'ticketExpired', 'tooFast']));
  });

  it.each(['ru', 'en'] as const)('says all of them in %s', (language) => {
    const t = getT(language);
    for (const code of [...codes, 'generic', 'network']) {
      expect(t(`tournament.playError.${code}`)).not.toContain('tournament.playError');
    }
  });
});

describe('what a seat is decided on is bounded by what the game allows', () => {
  const block = FUNCTION.slice(FUNCTION.indexOf('// SEATING-BEGIN'), FUNCTION.indexOf('// SEATING-END'));
  const longestRound = Math.max(...GAME_MODES.map((mode) => mode.config.questionCount));

  it('counts exactly the categories that exist', () => {
    const ids = [...block.match(/CATEGORY_IDS = \[([^\]]+)\]/)![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(ids.sort()).toEqual(CATEGORIES.map((category) => category.id).sort());
  });

  it('holds every tier to the length of its round', () => {
    const tiers = Object.fromEntries(
      [...block.match(/TIER_LENGTH[^{]+\{([^}]+)\}/)![1].matchAll(/(\w+): (\d+)/g)].map((m) => [m[1], Number(m[2])])
    );
    expect(tiers).toEqual(Object.fromEntries(TIERS.map((tier) => [tier.id, tier.questionsPerRound])));
  });

  it('holds everything else to the longest round there is', () => {
    expect(Number(block.match(/MAX_ROUND = (\d+)/)![1])).toBe(longestRound);
  });

  it('seats from the bounded count, not from the sum the profile claims', () => {
    expect(FUNCTION).toContain('rating: seatingScore(r.stats)');
    expect(FUNCTION).not.toMatch(/rating: r\.total_score/);
  });

  it('holds a logged round to the same longest round, and to the server’s clock', () => {
    const checks = [...SCHEMA.matchAll(/round_results_bounds check \(total between 1 and (\d+) and score between 0 and total\)/g)];
    expect(checks.length).toBeGreaterThan(0);
    expect(Number(checks[checks.length - 1][1])).toBe(longestRound);

    const guard = SCHEMA.slice(SCHEMA.indexOf('create or replace function public.round_results_guard'));
    // Without this a round could be logged into a week that is over.
    expect(guard).toContain('new.created_at := now();');
    expect(SCHEMA).toMatch(/create trigger round_results_guard\s+before insert on public\.round_results/);
  });
});
