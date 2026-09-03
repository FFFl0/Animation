import { CHARACTERS, Character } from '../data/characters';

export type QuizMode = 'photo' | 'description' | 'trivia' | 'eyes' | 'series' | 'poster' | 'clip';

export const QUESTIONS_PER_QUIZ = 50;

export type Question = {
  character: Character;
  prompt: string;
  promptKind: 'avatar' | 'text' | 'eyes' | 'poster' | 'clip';
  options: string[];
  correctIndex: number;
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// One character per unique series, for modes where the picture represents
// the show rather than the character — picking straight from CHARACTERS
// could otherwise show the exact same picture twice in one round whenever
// two selected characters share a series.
function uniqueSeriesPool(): Character[] {
  const seen = new Set<string>();
  const representatives: Character[] = [];
  for (const c of shuffle(CHARACTERS)) {
    if (!seen.has(c.series)) {
      seen.add(c.series);
      representatives.push(c);
    }
  }
  return representatives;
}

function nameQuestion(character: Character, promptKind: 'avatar' | 'text', prompt: string): Question {
  const distractors = shuffle(CHARACTERS.filter((c) => c.id !== character.id)).slice(0, 3);
  const options = shuffle([character.name, ...distractors.map((d) => d.name)]);
  return { character, prompt, promptKind, options, correctIndex: options.indexOf(character.name) };
}

function eyesQuestion(character: Character): Question {
  // Many characters share the exact same eye-color swatch, so distractors are
  // drawn only from characters with a visibly different color — otherwise the
  // question could have more than one indistinguishable-looking option.
  const distinctColor = CHARACTERS.filter(
    (c) => c.id !== character.id && c.avatar.eyeColor !== character.avatar.eyeColor
  );
  const distractors = shuffle(distinctColor).slice(0, 3);
  const options = shuffle([character.name, ...distractors.map((d) => d.name)]);
  return {
    character,
    prompt: 'Чьи это глаза?',
    promptKind: 'eyes',
    options,
    correctIndex: options.indexOf(character.name),
  };
}

function seriesGuessQuestion(character: Character, promptKind: 'avatar' | 'poster' | 'clip', prompt: string): Question {
  // Options must be distinct anime titles, not distinct characters — several
  // characters share the same series, so dedupe before sampling distractors.
  const otherSeries = Array.from(new Set(CHARACTERS.map((c) => c.series).filter((s) => s !== character.series)));
  const distractors = shuffle(otherSeries).slice(0, 3);
  const options = shuffle([character.series, ...distractors]);
  return {
    character,
    prompt,
    promptKind,
    options,
    correctIndex: options.indexOf(character.series),
  };
}

function triviaQuestion(character: Character): Question {
  const options = shuffle([character.answer, ...character.distractors]);
  return {
    character,
    prompt: character.question,
    promptKind: 'text',
    options,
    correctIndex: options.indexOf(character.answer),
  };
}

export function generateQuiz(mode: QuizMode, questionCount = QUESTIONS_PER_QUIZ): Question[] {
  const basePool = mode === 'poster' || mode === 'clip' ? uniqueSeriesPool() : CHARACTERS;
  const pool = shuffle(basePool).slice(0, Math.min(questionCount, basePool.length));

  return pool.map((character) => {
    if (mode === 'photo') return nameQuestion(character, 'avatar', 'Кто это?');
    if (mode === 'eyes') return eyesQuestion(character);
    if (mode === 'series') return seriesGuessQuestion(character, 'avatar', 'Из какого аниме этот персонаж?');
    if (mode === 'poster') return seriesGuessQuestion(character, 'poster', 'Какое это аниме?');
    if (mode === 'clip') return seriesGuessQuestion(character, 'clip', 'Какое аниме из этого кадра?');
    if (mode === 'trivia') return triviaQuestion(character);
    return nameQuestion(character, 'text', character.description);
  });
}
