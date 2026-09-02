import { CHARACTERS, Character } from '../data/characters';

export type Question = {
  character: Character;
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

export function generateQuiz(questionCount = 10): Question[] {
  const pool = shuffle(CHARACTERS).slice(0, Math.min(questionCount, CHARACTERS.length));

  return pool.map((character) => {
    const distractors = shuffle(
      CHARACTERS.filter((c) => c.id !== character.id)
    ).slice(0, 3);

    const options = shuffle([character.name, ...distractors.map((d) => d.name)]);
    const correctIndex = options.indexOf(character.name);

    return { character, options, correctIndex };
  });
}
