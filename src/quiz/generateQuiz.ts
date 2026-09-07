import { CHARACTERS, Character, characterName, localizeCharacter } from '../data/characters';
import { ANIME_SERIES, seriesTitleById } from '../data/animeSeries';
import { OPENINGS } from '../data/openings';
import { QuestionType, getCategory } from '../data/categories';
import { RoundConfig } from './types';
import { Language } from '../i18n/LanguageContext';
import { getT } from '../i18n/strings';

export type PromptKind = 'avatar' | 'silhouette' | 'eyes' | 'text';

export type Question = {
  id: string;
  type: QuestionType;
  promptKind: PromptKind;
  promptText: string;
  character?: Character;
  options: string[];
  correctIndex: number;
};

type Rng = () => number;

/** Deterministic PRNG (mulberry32) — same seed always produces the same sequence. */
export function seededRng(seed: number): Rng {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a YYYY-MM-DD string into a stable numeric seed for the daily challenge. */
export function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function shuffle<T>(list: T[], rng: Rng): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleDistractors<T>(pool: T[], correct: T, n: number, rng: Rng): T[] {
  const candidates = shuffle(pool.filter((v) => v !== correct), rng);
  return candidates.slice(0, n);
}

function buildOptions(correct: string, pool: string[], rng: Rng): { options: string[]; correctIndex: number } {
  const distractors = sampleDistractors(pool, correct, 3, rng);
  const options = shuffle([correct, ...distractors], rng);
  return { options, correctIndex: options.indexOf(correct) };
}

function questionFor(type: QuestionType, character: Character, idSuffix: number, rng: Rng, lang: Language): Question {
  const id = `${character.id}-${type}-${idSuffix}`;
  const t = getT(lang);
  const localized = localizeCharacter(character, lang);

  switch (type) {
    case 'guessSeries': {
      const pool = ANIME_SERIES.map((s) => seriesTitleById(s.id, lang));
      const { options, correctIndex } = buildOptions(seriesTitleById(character.seriesId, lang), pool, rng);
      return { id, type, promptKind: 'avatar', promptText: t('quiz.promptGuessSeries'), character, options, correctIndex };
    }
    case 'guessCharacterFull': {
      const pool = CHARACTERS.map((c) => characterName(c, lang));
      const { options, correctIndex } = buildOptions(localized.name, pool, rng);
      return { id, type, promptKind: 'avatar', promptText: t('quiz.promptGuessCharacterFull'), character, options, correctIndex };
    }
    case 'guessCharacterSilhouette': {
      const pool = CHARACTERS.map((c) => characterName(c, lang));
      const { options, correctIndex } = buildOptions(localized.name, pool, rng);
      return { id, type, promptKind: 'silhouette', promptText: t('quiz.promptGuessCharacterSilhouette'), character, options, correctIndex };
    }
    case 'guessCharacterEyes': {
      const pool = CHARACTERS.map((c) => characterName(c, lang));
      const { options, correctIndex } = buildOptions(localized.name, pool, rng);
      return { id, type, promptKind: 'eyes', promptText: t('quiz.promptGuessCharacterEyes'), character, options, correctIndex };
    }
    case 'guessQuote': {
      const pool = CHARACTERS.map((c) => characterName(c, lang));
      const { options, correctIndex } = buildOptions(localized.name, pool, rng);
      return {
        id,
        type,
        promptKind: 'text',
        promptText: t('quiz.promptGuessQuote', localized.quote),
        character,
        options,
        correctIndex,
      };
    }
    case 'guessAbility': {
      const pool = CHARACTERS.map((c) => characterName(c, lang));
      const { options, correctIndex } = buildOptions(localized.name, pool, rng);
      return {
        id,
        type,
        promptKind: 'text',
        promptText: t('quiz.promptGuessAbility', localized.ability),
        character,
        options,
        correctIndex,
      };
    }
    case 'guessFaction': {
      const pool = Array.from(new Set(CHARACTERS.map((c) => localizeCharacter(c, lang).faction)));
      const { options, correctIndex } = buildOptions(localized.faction, pool, rng);
      return { id, type, promptKind: 'avatar', promptText: t('quiz.promptGuessFaction'), character, options, correctIndex };
    }
    case 'openingTrivia': {
      const opening = OPENINGS.find((o) => o.seriesId === character.seriesId) ?? OPENINGS[0];
      const pool = OPENINGS.map((o) => o.songTitle);
      const { options, correctIndex } = buildOptions(opening.songTitle, pool, rng);
      return {
        id,
        type,
        promptKind: 'text',
        promptText: t('quiz.promptOpeningTrivia', seriesTitleById(opening.seriesId, lang)),
        options,
        correctIndex,
      };
    }
  }
}

export function generateQuiz(config: RoundConfig, lang: Language = 'ru'): Question[] {
  const rng: Rng = config.seed !== undefined ? seededRng(config.seed) : Math.random;

  let pool = config.tier ? CHARACTERS.filter((c) => c.tier === config.tier) : CHARACTERS;
  if (config.categoryId === 'hard' && !config.tier) {
    pool = CHARACTERS.filter((c) => c.tier === 'otaku' || c.tier === 'expert' || c.tier === 'legend');
  }
  if (pool.length === 0) pool = CHARACTERS;

  const types: QuestionType[] = config.forceType
    ? [config.forceType]
    : config.categoryId === 'hard'
      ? ['guessCharacterFull', 'guessQuote', 'guessAbility', 'guessFaction', 'guessSeries']
      : config.categoryId === 'mixed'
        ? ['guessSeries', 'guessCharacterFull', 'guessQuote', 'guessAbility', 'guessFaction', 'openingTrivia']
        : getCategory(config.categoryId).questionTypes;

  const questions: Question[] = [];
  let cycle = shuffle(pool, rng);
  let cycleIndex = 0;

  for (let i = 0; i < config.questionCount; i++) {
    if (cycleIndex >= cycle.length) {
      cycle = shuffle(pool, rng);
      cycleIndex = 0;
    }
    const character = cycle[cycleIndex++];
    const type = types[Math.floor(rng() * types.length)];
    questions.push(questionFor(type, character, i, rng, lang));
  }

  return questions;
}
