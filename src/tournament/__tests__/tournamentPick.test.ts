import { generateQuiz } from '../../quiz/generateQuiz';
import { WEEKLY_MATCH_CONFIG } from '../matchConfig';
import { overlapOf, pickSeed, seenIn, subjectsOf } from '../../../supabase/functions/_shared/tournamentPick';
import { KEY_POOL } from '../../../supabase/functions/_shared/tournamentKey';

/** A repeatable stand-in for the server's random draw. */
function drawer(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return 1 + (s % KEY_POOL);
  };
}

describe('dealing tournament quizzes', () => {
  it('reads the same subjects the app asks about', () => {
    // Two quizzes share a code exactly where they ask about the same subject.
    for (const [x, y] of [[1, 2], [17, 940], [1999, 2000]]) {
      const qx = generateQuiz({ ...WEEKLY_MATCH_CONFIG, seed: x }, 'ru').map((q) => q.subject);
      const qy = generateQuiz({ ...WEEKLY_MATCH_CONFIG, seed: y }, 'ru').map((q) => q.subject);
      const cx = subjectsOf(x);
      const cy = subjectsOf(y);
      for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) expect(cx[i] === cy[j]).toBe(qx[i] === qy[j]);
    }
  });

  it('counts what was seen, and repeats inside one quiz', () => {
    const codes = subjectsOf(5);
    expect(overlapOf(5, new Set())).toBe(codes.length - new Set(codes).size);
    expect(overlapOf(5, new Set(codes))).toBe(7);
  });

  it('deals eight games without meeting anybody twice, and ten with at most one repeat', () => {
    // By the ninth game nearly every voiced character and every opening has
    // come up, so one repeat in seventy questions is what the pool allows.
    const draw = drawer(42);
    const dealt: number[] = [];
    for (let game = 0; game < 10; game++) dealt.push(pickSeed(seenIn(dealt), draw));
    const eight = dealt.slice(0, 8).flatMap(subjectsOf);
    expect(new Set(eight).size).toBe(eight.length);
    const ten = dealt.flatMap(subjectsOf);
    expect(ten.length - new Set(ten).size).toBeLessThanOrEqual(1);
  });

  it('beats dealing at random by a wide margin', () => {
    // The old way: any seed from the pool, ignoring the past.
    let repeatsBefore = 0;
    let repeatsNow = 0;
    for (let player = 0; player < 30; player++) {
      const draw = drawer(1000 + player);
      const random: number[] = [];
      const picked: number[] = [];
      for (let game = 0; game < 8; game++) {
        random.push(draw());
        picked.push(pickSeed(seenIn(picked), draw));
      }
      const r = random.flatMap(subjectsOf);
      const p = picked.flatMap(subjectsOf);
      repeatsBefore += r.length - new Set(r).size;
      repeatsNow += p.length - new Set(p).size;
    }
    expect(repeatsBefore).toBeGreaterThan(100);
    expect(repeatsNow).toBe(0);
  });

  it('still settles on something when everything has been seen', () => {
    const everything = seenIn(Array.from({ length: KEY_POOL }, (_, i) => i + 1));
    const seed = pickSeed(everything, drawer(7));
    expect(seed).toBeGreaterThanOrEqual(1);
    expect(seed).toBeLessThanOrEqual(KEY_POOL);
  });
});

describe('the tournament function', () => {
  const source = require('fs').readFileSync(
    require('path').join(__dirname, '../../../supabase/functions/tournament/index.ts'),
    'utf8'
  ) as string;

  it('deals with the picker, from what this player has already been dealt', () => {
    expect(source).toContain("from '../_shared/tournamentPick.ts'");
    expect(source).toMatch(/const seen = await seenThisTournament\(admin, tournament\.id, game\.bracket, game\.mySeat\);\s*const seed = pickSeed\(seen, drawSeed\);/);
  });

  it('imports the push helpers it calls', () => {
    // Missing once, which made both tournament notices throw when sent.
    for (const name of ['pushToTokens', 'tokensFor']) {
      if (source.includes(`${name}(`)) expect(source).toMatch(new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from '\\.\\./_shared/push\\.ts'`));
    }
  });
});
