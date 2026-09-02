import { CHARACTERS, Character } from '../data/characters';

export type QuizMode = 'photo' | 'description' | 'trivia';

export type Question = {
  character: Character;
  prompt: string;
  promptKind: 'avatar' | 'text';
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

function nameQuestion(character: Character, promptKind: 'avatar' | 'text', prompt: string): Question {
  const distractors = shuffle(CHARACTERS.filter((c) => c.id !== character.id)).slice(0, 3);
  const options = shuffle([character.name, ...distractors.map((d) => d.name)]);
  return { character, prompt, promptKind, options, correctIndex: options.indexOf(character.name) };
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

export function generateQuiz(mode: QuizMode, questionCount = 10): Question[] {
  const pool = shuffle(CHARACTERS).slice(0, Math.min(questionCount, CHARACTERS.length));

  return pool.map((character) => {
    if (mode === 'photo') return nameQuestion(character, 'avatar', 'Кто это?');
    if (mode === 'trivia') return triviaQuestion(character);
    return nameQuestion(character, 'text', character.description);
  });
}
