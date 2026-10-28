import { hasQuoteAudio } from '../data/quoteAudio';
import { CHARACTERS, Character, characterName, localizeCharacter } from '../data/characters';
import { ANIME_SERIES, AnimeSeries, seriesTitleById } from '../data/animeSeries';
import { openingVideoFor } from '../data/openingVideos';
import { OPENINGS } from '../data/openings';
import { QuestionType, getCategory } from '../data/categories';
import { getTier } from '../data/difficulty';
import { RoundConfig } from './types';
import { Language } from '../i18n/LanguageContext';
import { getT } from '../i18n/strings';

export type PromptKind = 'avatar' | 'silhouette' | 'eyes' | 'text' | 'video' | 'ability';

export type Question = {
  id: string;
  type: QuestionType;
  promptKind: PromptKind;
  promptText: string;
  character?: Character;
  /** The technique a 'ability' prompt draws its card from. */
  ability?: string;
  /** Set on question types that ask about a series rather than a character —
   * the theme clip to play comes from here. */
  seriesId?: string;
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

/** Takes the first n that are not the right answer, keeping the order the
 * pool came in — for a pool that is already sorted by how near each option
 * is to the answer. */
function nearestDistractors<T>(pool: T[], correct: T, n: number): T[] {
  const seen = new Set<T>([correct]);
  const picked: T[] = [];
  for (const candidate of pool) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    picked.push(candidate);
    if (picked.length === n) break;
  }
  return picked;
}

function buildCharacterOptions(
  correct: Character,
  lang: Language,
  rng: Rng,
  close: boolean
): { options: string[]; correctIndex: number } {
  const name = characterName(correct, lang);
  const pool = characterPool(correct, lang, rng, close);
  const distractors = close
    ? nearestDistractors(pool, name, 3)
    : sampleDistractors(pool, name, 3, rng);
  const options = shuffle([name, ...distractors], rng);
  return { options, correctIndex: options.indexOf(name) };
}

function buildOptions(correct: string, pool: string[], rng: Rng): { options: string[]; correctIndex: number } {
  const distractors = sampleDistractors(pool, correct, 3, rng);
  const options = shuffle([correct, ...distractors], rng);
  return { options, correctIndex: options.indexOf(correct) };
}

/**
 * The other characters a question may offer as answers, nearest first.
 *
 * With `close` off this is everybody, which is what the earlier tiers want:
 * part of being a beginner round is that two of the four names are from
 * shows you have heard of. With it on, the wrong answers come from the same
 * series where the catalogue has enough of them, then from the same
 * difficulty tier, and only then from the rest — so the four names on screen
 * are all ones that could plausibly have said it.
 *
 * Ordered rather than filtered because most series here have two or three
 * characters: insisting on same-series answers would leave questions with
 * nothing to fill them.
 */
function characterPool(correct: Character, lang: Language, rng: Rng, close: boolean): string[] {
  const name = (c: Character) => characterName(c, lang);
  if (!close) return CHARACTERS.map(name);

  const others = CHARACTERS.filter((c) => c.id !== correct.id);
  const sameSeries = others.filter((c) => c.seriesId === correct.seriesId);
  const sameTier = others.filter((c) => c.seriesId !== correct.seriesId && c.tier === correct.tier);
  const rest = others.filter((c) => c.seriesId !== correct.seriesId && c.tier !== correct.tier);

  return [
    name(correct),
    ...shuffle(sameSeries, rng).map(name),
    ...shuffle(sameTier, rng).map(name),
    ...shuffle(rest, rng).map(name),
  ];
}

/**
 * The series a theme-clip question may be about.
 *
 * The catalogue has grown past the clips that ship with the app, and a
 * question that asks you to name the opening while the player shows "no clip
 * yet" cannot be answered by watching — only guessed. So the clip-backed
 * series are the pool, and the rest still appear everywhere else: as answer
 * options, and as the series their characters come from.
 *
 * The fallback keeps a round from coming back empty if the clips ever go
 * missing entirely; the catalogue test is what notices that they have.
 */
const SERIES_WITH_CLIPS = ANIME_SERIES.filter((series) => openingVideoFor(series.id) !== undefined);
const VIDEO_SERIES = SERIES_WITH_CLIPS.length > 0 ? SERIES_WITH_CLIPS : ANIME_SERIES;

/**
 * What a question is about. Most types ask about a character; the theme-clip
 * type asks about a series, and the two are drawn from separate cycles so
 * neither repeats within a round.
 */
type Subject = { character: Character; series: AnimeSeries };

function questionFor(
  type: QuestionType,
  subject: Subject,
  idSuffix: number,
  rng: Rng,
  lang: Language,
  /** Whether the wrong answers should be drawn from near the right one. */
  close: boolean
): Question {
  const { character, series } = subject;
  const id = `${character.id}-${type}-${idSuffix}`;
  const t = getT(lang);
  const localized = localizeCharacter(character, lang);

  switch (type) {
    case 'guessSeriesByVideo': {
      const pool = ANIME_SERIES.map((s) => seriesTitleById(s.id, lang));
      const { options, correctIndex } = buildOptions(seriesTitleById(series.id, lang), pool, rng);
      return {
        id: `${series.id}-${type}-${idSuffix}`,
        type,
        promptKind: 'video',
        promptText: t('quiz.promptGuessSeriesByVideo'),
        seriesId: series.id,
        options,
        correctIndex,
      };
    }
    case 'guessSeries': {
      const pool = ANIME_SERIES.map((s) => seriesTitleById(s.id, lang));
      const { options, correctIndex } = buildOptions(seriesTitleById(character.seriesId, lang), pool, rng);
      return { id, type, promptKind: 'avatar', promptText: t('quiz.promptGuessSeries'), character, options, correctIndex };
    }
    case 'guessCharacterFull': {
      const { options, correctIndex } = buildCharacterOptions(character, lang, rng, close);
      return { id, type, promptKind: 'avatar', promptText: t('quiz.promptGuessCharacterFull'), character, options, correctIndex };
    }
    case 'guessCharacterSilhouette': {
      const { options, correctIndex } = buildCharacterOptions(character, lang, rng, close);
      return { id, type, promptKind: 'silhouette', promptText: t('quiz.promptGuessCharacterSilhouette'), character, options, correctIndex };
    }
    case 'guessCharacterEyes': {
      const { options, correctIndex } = buildCharacterOptions(character, lang, rng, close);
      return { id, type, promptKind: 'eyes', promptText: t('quiz.promptGuessCharacterEyes'), character, options, correctIndex };
    }
    case 'guessQuote': {
      const { options, correctIndex } = buildCharacterOptions(character, lang, rng, close);
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
      const { options, correctIndex } = buildCharacterOptions(character, lang, rng, close);
      return {
        id,
        type,
        // Its own kind, not plain text: the card is drawn from the ability
        // and must not be the character's portrait, which would be the
        // answer.
        promptKind: 'ability',
        promptText: t('quiz.promptGuessAbility', localized.ability),
        ability: localized.ability,
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

  // The last tier draws its wrong answers from near the right one; every
  // other round draws them from the whole cast.
  const closeDistractors = config.tier ? getTier(config.tier).rules?.closeDistractors === true : false;

  const questions: Question[] = [];
  const nextCharacter = cycleThrough(pool, rng);
  // Quote questions draw from their own, smaller set: a written quote is
  // meant to be heard as well, and only some characters have a recording.
  // See voicedPool for what happens when the tier's own run out.
  const nextVoiced = cycleThrough(voicedPool(pool, rng), rng);
  // Series get their own cycle: difficulty tiers describe characters, so a
  // tier filter says nothing about which openings to play, and drawing the
  // series from the character just picked would repeat the popular ones.
  const nextSeries = cycleThrough(VIDEO_SERIES, rng);

  for (let i = 0; i < config.questionCount; i++) {
    const type = types[Math.floor(rng() * types.length)];
    const character = type === 'guessQuote' ? nextVoiced() : nextCharacter();
    questions.push(questionFor(type, { character, series: nextSeries() }, i, rng, lang, closeDistractors));
  }

  return questions;
}

/**
 * Hands out one item at a time, shuffled, and starts a fresh shuffle once
 * the list is spent — so a round shows everything available before it shows
 * anything twice.
 */
function cycleThrough<T>(items: T[], rng: Rng): () => T {
  let order = shuffle(items, rng);
  let index = 0;
  return () => {
    if (index >= order.length) {
      order = shuffle(items, rng);
      index = 0;
    }
    return order[index++];
  };
}

/**
 * The characters a quote question may be about: those with a recording, the
 * ones from this round's own pool first.
 *
 * The tier's own voiced characters come first so a round keeps the
 * difficulty it promised; the rest follow for a round longer than that
 * handful, where the alternative is asking about the same person twice.
 * If nothing is voiced at all — no audio shipped — the ordinary pool stands,
 * because a quote question without sound beats no question.
 */
function voicedPool(pool: Character[], rng: Rng): Character[] {
  const fromPool = pool.filter((c) => hasQuoteAudio(c.id));
  const others = CHARACTERS.filter((c) => hasQuoteAudio(c.id) && !fromPool.includes(c));
  const voiced = [...shuffle(fromPool, rng), ...shuffle(others, rng)];
  return voiced.length > 0 ? voiced : pool;
}
