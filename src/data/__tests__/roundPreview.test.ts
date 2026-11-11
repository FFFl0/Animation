import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';
import { generateQuiz } from '../../quiz/generateQuiz';
import { CATEGORIES } from '../categories';
import { HARD_TIERS, UNTIERED_ROUND_LENGTH, characterPoolOf, questionKindsOf, sampleFaces } from '../roundPreview';

/**
 * The Hard and Mixed pages describe a round before it is played. What they
 * say has to be what the round then does, so it is checked against the
 * generator itself rather than restated.
 */
const many = (categoryId: 'hard' | 'mixed') =>
  Array.from({ length: 20 }, (_, seed) =>
    generateQuiz({ categoryId, questionCount: UNTIERED_ROUND_LENGTH, seed: seed + 1 })
  ).flat();

describe('what the page promises', () => {
  it('shows Hard faces only from the tiers a Hard round asks about', () => {
    const pool = new Set(characterPoolOf('hard').map((c) => c.id));
    for (const c of characterPoolOf('hard')) expect(HARD_TIERS).toContain(c.tier);
    const outside = many('hard').filter((q) => q.character && !pool.has(q.character.id));
    // Quote questions are the one exception, on purpose: they need a voice
    // recording, and when a round runs out of recorded Hard characters the
    // generator borrows recorded ones from other tiers (see voicedPool).
    for (const q of outside) expect(q.type).toBe('guessQuote');
    // About one question in fifteen, which is why the page says "the tricky
    // characters" and not "only".
    expect(outside.length).toBeLessThan(many('hard').length / 5);
  });

  it.each(['hard', 'mixed'] as const)('lists exactly the kinds of question a %s round asks', (id) => {
    const asked = new Set(many(id).map((q) => q.type));
    expect(new Set(questionKindsOf(id))).toEqual(asked);
  });

  it('gives the round the length the page shows', () => {
    const app = readFileSync(join(__dirname, '../../../App.tsx'), 'utf8');
    expect(app).toContain('getTier(tier).questionsPerRound : UNTIERED_ROUND_LENGTH');
  });

  it('draws different faces without repeating one', () => {
    const faces = sampleFaces(characterPoolOf('mixed'), 6);
    expect(new Set(faces.map((c) => c.id)).size).toBe(6);
  });

  it.each(['ru', 'en'] as const)('names every kind of question in %s', (lang) => {
    const t = getT(lang);
    for (const kind of new Set(CATEGORIES.flatMap((c) => c.questionTypes))) {
      expect(t(`categoryDetail.kind.${kind}`)).not.toContain('categoryDetail');
    }
  });
});
