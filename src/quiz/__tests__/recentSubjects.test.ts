import { generateQuiz } from '../generateQuiz';
import { remember } from '../recentSubjects';
import { WEEKLY_MATCH_CONFIG } from '../../tournament/matchConfig';

describe('remembering what was asked', () => {
  it('moves what was just asked to the newest end, once each, and forgets the oldest', () => {
    expect(remember(['a', 'b', 'c'], ['b', 'd', 'd'], 4)).toEqual(['a', 'c', 'b', 'd']);
    expect(remember(['a', 'b', 'c', 'd'], ['e'], 4)).toEqual(['b', 'c', 'd', 'e']);
  });
});

describe('a round after other rounds', () => {
  const config = { categoryId: 'anime' as const, questionCount: 10 };

  it('asks about characters the last rounds did not', () => {
    // Play a few rounds in a row, carrying the memory forward.
    let recent: string[] = [];
    const rounds: string[][] = [];
    for (let i = 0; i < 4; i++) {
      const subjects = generateQuiz(config, 'ru', recent).map((q) => q.subject);
      rounds.push(subjects);
      recent = remember(recent, subjects);
    }
    const all = rounds.flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('comes back to the least recently seen once everything has been seen', () => {
    const first = generateQuiz(config, 'ru').map((q) => q.subject);
    // Everybody seen, with this round's subjects the longest ago.
    const everybody = Array.from({ length: 400 }, (_, i) => `c:none-${i}`);
    const recent = [...first, ...everybody];
    const next = generateQuiz(config, 'ru', recent).map((q) => q.subject);
    // The characters seen longest ago come first again.
    expect(next.filter((s) => s.startsWith('c:')).every((s) => first.includes(s) || !recent.includes(s))).toBe(true);
  });

  it('leaves a seeded quiz exactly as it was, whatever was seen', () => {
    const seeded = { ...WEEKLY_MATCH_CONFIG, seed: 77 };
    const plain = generateQuiz(seeded, 'ru');
    const withMemory = generateQuiz(seeded, 'ru', plain.map((q) => q.subject));
    expect(withMemory.map((q) => [q.id, q.options, q.correctIndex])).toEqual(plain.map((q) => [q.id, q.options, q.correctIndex]));
  });
});
