import { CHARACTERS, Character } from '../data/characters';
import { ANIME_SERIES } from '../data/animeSeries';
import { OPENINGS } from '../data/openings';
import { QuestionType, getCategory } from '../data/categories';
import { RoundConfig } from './types';

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

function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sampleDistractors<T>(pool: T[], correct: T, n: number): T[] {
  const candidates = shuffle(pool.filter((v) => v !== correct));
  return candidates.slice(0, n);
}

function seriesTitle(seriesId: string): string {
  return ANIME_SERIES.find((s) => s.id === seriesId)?.title ?? seriesId;
}

function buildOptions(correct: string, pool: string[]): { options: string[]; correctIndex: number } {
  const distractors = sampleDistractors(pool, correct, 3);
  const options = shuffle([correct, ...distractors]);
  return { options, correctIndex: options.indexOf(correct) };
}

function questionFor(type: QuestionType, character: Character, idSuffix: number): Question {
  const id = `${character.id}-${type}-${idSuffix}`;

  switch (type) {
    case 'guessSeries': {
      const pool = ANIME_SERIES.map((s) => s.title);
      const { options, correctIndex } = buildOptions(seriesTitle(character.seriesId), pool);
      return { id, type, promptKind: 'avatar', promptText: 'Из какого аниме этот персонаж?', character, options, correctIndex };
    }
    case 'guessCharacterFull': {
      const pool = CHARACTERS.map((c) => c.name);
      const { options, correctIndex } = buildOptions(character.name, pool);
      return { id, type, promptKind: 'avatar', promptText: 'Кто это?', character, options, correctIndex };
    }
    case 'guessCharacterSilhouette': {
      const pool = CHARACTERS.map((c) => c.name);
      const { options, correctIndex } = buildOptions(character.name, pool);
      return { id, type, promptKind: 'silhouette', promptText: 'Кто скрывается за силуэтом?', character, options, correctIndex };
    }
    case 'guessCharacterEyes': {
      const pool = CHARACTERS.map((c) => c.name);
      const { options, correctIndex } = buildOptions(character.name, pool);
      return { id, type, promptKind: 'eyes', promptText: 'Узнаёшь героя по глазам?', character, options, correctIndex };
    }
    case 'guessQuote': {
      const pool = CHARACTERS.map((c) => c.name);
      const { options, correctIndex } = buildOptions(character.name, pool);
      return {
        id,
        type,
        promptKind: 'text',
        promptText: `«${character.quote}»\n\nКто это сказал?`,
        character,
        options,
        correctIndex,
      };
    }
    case 'guessAbility': {
      const pool = CHARACTERS.map((c) => c.name);
      const { options, correctIndex } = buildOptions(character.name, pool);
      return {
        id,
        type,
        promptKind: 'text',
        promptText: `Способность: «${character.ability}»\n\nКому она принадлежит?`,
        character,
        options,
        correctIndex,
      };
    }
    case 'guessFaction': {
      const pool = Array.from(new Set(CHARACTERS.map((c) => c.faction)));
      const { options, correctIndex } = buildOptions(character.faction, pool);
      return { id, type, promptKind: 'avatar', promptText: 'К какой фракции принадлежит этот персонаж?', character, options, correctIndex };
    }
    case 'openingTrivia': {
      const opening = OPENINGS.find((o) => o.seriesId === character.seriesId) ?? OPENINGS[0];
      const pool = OPENINGS.map((o) => o.songTitle);
      const { options, correctIndex } = buildOptions(opening.songTitle, pool);
      return {
        id,
        type,
        promptKind: 'text',
        promptText: `Какая песня открывает аниме «${seriesTitle(opening.seriesId)}»?`,
        options,
        correctIndex,
      };
    }
  }
}

export function generateQuiz(config: RoundConfig): Question[] {
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
  let cycle = shuffle(pool);
  let cycleIndex = 0;

  for (let i = 0; i < config.questionCount; i++) {
    if (cycleIndex >= cycle.length) {
      cycle = shuffle(pool);
      cycleIndex = 0;
    }
    const character = cycle[cycleIndex++];
    const type = types[Math.floor(Math.random() * types.length)];
    questions.push(questionFor(type, character, i));
  }

  return questions;
}
