import { CHARACTERS, Character } from './characters';
import { ANIME_SERIES } from './animeSeries';
import { CategoryId, QuestionType, getCategory } from './categories';
import { TierId } from './difficulty';

/** The tiers a Hard round draws its characters from — the same filter generateQuiz applies. */
export const HARD_TIERS: TierId[] = ['otaku', 'expert', 'legend'];

/** Questions in a round started without a tier — Hard and Mixed. Kept in step with App's startTier by a test. */
export const UNTIERED_ROUND_LENGTH = 15;

/** The characters a round in this category can ask about. */
export function characterPoolOf(categoryId: CategoryId): Character[] {
  return categoryId === 'hard' ? CHARACTERS.filter((c) => HARD_TIERS.includes(c.tier)) : CHARACTERS;
}

/** The kinds of question a round mixes, each once, in the category's order. */
export function questionKindsOf(categoryId: CategoryId): QuestionType[] {
  return [...new Set(getCategory(categoryId).questionTypes)];
}

/** How many series the round's characters come from. */
export function seriesCountOf(categoryId: CategoryId): number {
  if (categoryId !== 'hard') return ANIME_SERIES.length;
  return new Set(characterPoolOf(categoryId).map((c) => c.seriesId)).size;
}

/** A handful of faces to show from the pool, different every visit. */
export function sampleFaces(pool: Character[], count: number, rng: () => number = Math.random): Character[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
