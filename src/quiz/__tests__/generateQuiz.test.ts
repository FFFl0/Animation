import { generateQuiz, seededRng, dateSeed } from '../generateQuiz';
import { CHARACTERS } from '../../data/characters';
import { ANIME_SERIES } from '../../data/animeSeries';
import { OPENING_VIDEOS } from '../../data/openingVideos';
import { QUOTE_AUDIO } from '../../data/quoteAudio';
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

  describe('theme-clip questions', () => {
    const videoConfig = (count: number) => baseConfig({ categoryId: 'openings', questionCount: count });

    it('asks about a series and names a clip to play', () => {
      const questions = generateQuiz(videoConfig(10));
      for (const q of questions) {
        expect(q.type).toBe('guessSeriesByVideo');
        expect(q.promptKind).toBe('video');
        expect(q.seriesId).toBeTruthy();
        expect(OPENING_VIDEOS[q.seriesId!]).toBeDefined();
      }
    });

    it('never repeats a series while unused ones remain', () => {
      const questions = generateQuiz(videoConfig(ANIME_SERIES.length));
      expect(new Set(questions.map((q) => q.seriesId)).size).toBe(ANIME_SERIES.length);
    });

    it('ignores the difficulty tier, which only describes characters', () => {
      const seen = new Set(
        generateQuiz(baseConfig({ categoryId: 'openings', questionCount: 20, tier: 'novice' })).map((q) => q.seriesId)
      );
      expect(seen.size).toBe(ANIME_SERIES.length);
    });
  });

  it('ships a clip for every series', () => {
    for (const series of ANIME_SERIES) {
      expect(OPENING_VIDEOS[series.id]).toBeDefined();
    }
  });

  it('ships a voice line for every character', () => {
    for (const character of CHARACTERS) {
      expect(QUOTE_AUDIO[character.id]).toBeDefined();
    }
  });

  it('keeps the quote itself in the prompt text', () => {
    const questions = generateQuiz(baseConfig({ categoryId: 'quotes', questionCount: 8, forceType: 'guessQuote' }));
    for (const q of questions) {
      expect(q.character).toBeDefined();
      // The audio is an addition, not a replacement: the written line has to
      // still be there for anyone playing with the sound off.
      expect(q.promptText).toContain(q.character!.quote);
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

  it('produces an identical question set for the same seed', () => {
    const seed = dateSeed('2026-09-06');
    const a = generateQuiz(baseConfig({ questionCount: 10, seed: seed }));
    const b = generateQuiz(baseConfig({ questionCount: 10, seed: seed }));
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a.map((q) => q.options)).toEqual(b.map((q) => q.options));
  });

  it('produces different question sets for different seeds', () => {
    const a = generateQuiz(baseConfig({ questionCount: 10, seed: dateSeed('2026-09-06') }));
    const b = generateQuiz(baseConfig({ questionCount: 10, seed: dateSeed('2026-09-07') }));
    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id));
  });

  it('seededRng is deterministic and stays within [0, 1)', () => {
    const rngA = seededRng(42);
    const rngB = seededRng(42);
    const seqA = Array.from({ length: 20 }, () => rngA());
    const seqB = Array.from({ length: 20 }, () => rngB());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
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
