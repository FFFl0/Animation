import { generateQuiz } from '../generateQuiz';
import { CHARACTERS } from '../../data/characters';
import { RoundConfig } from '../types';

function baseConfig(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return { categoryId: 'mixed', questionCount: 20, ...overrides };
}

describe('generateQuiz', () => {
  it('produces exactly questionCount questions', () => {
    const questions = generateQuiz(baseConfig({ questionCount: 12 }));
    expect(questions).toHaveLength(12);
  });

  it('gives every question exactly 4 unique options containing the correct answer once', () => {
    const questions = generateQuiz(baseConfig({ questionCount: 30 }));
    for (const q of questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    }
  });

  it('respects forceType', () => {
    const questions = generateQuiz(baseConfig({ categoryId: 'characters', questionCount: 10, forceType: 'guessCharacterEyes' }));
    expect(questions.every((q) => q.type === 'guessCharacterEyes')).toBe(true);
    expect(questions.every((q) => q.promptKind === 'eyes')).toBe(true);
  });

  it('restricts the character pool to the requested tier', () => {
    const questions = generateQuiz(baseConfig({ categoryId: 'characters', tier: 'novice', questionCount: 15, forceType: 'guessCharacterFull' }));
    const noviceIds = new Set(CHARACTERS.filter((c) => c.tier === 'novice').map((c) => c.id));
    for (const q of questions) {
      expect(q.character).toBeDefined();
      expect(noviceIds.has(q.character!.id)).toBe(true);
    }
  });

  it('produces a correct option that matches the subject character for guessCharacterFull', () => {
    const questions = generateQuiz(baseConfig({ categoryId: 'characters', questionCount: 10, forceType: 'guessCharacterFull' }));
    for (const q of questions) {
      expect(q.options[q.correctIndex]).toBe(q.character!.name);
    }
  });

  it('produces a correct option that matches the quote speaker for guessQuote', () => {
    const questions = generateQuiz(baseConfig({ categoryId: 'quotes', questionCount: 10, forceType: 'guessQuote' }));
    for (const q of questions) {
      expect(q.options[q.correctIndex]).toBe(q.character!.name);
    }
  });

  it('handles a round longer than the available pool by cycling with repeats', () => {
    const questions = generateQuiz(baseConfig({ categoryId: 'characters', tier: 'legend', questionCount: 25, forceType: 'guessCharacterFull' }));
    expect(questions).toHaveLength(25);
    const legendCount = CHARACTERS.filter((c) => c.tier === 'legend').length;
    expect(legendCount).toBeGreaterThan(0);
    expect(legendCount).toBeLessThan(25);
  });
});
