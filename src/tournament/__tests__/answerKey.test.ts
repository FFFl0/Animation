import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { generateQuiz } from '../../quiz/generateQuiz';
import { GAME_QUESTIONS } from '../doubleElim';
import { WEEKLY_MATCH_CONFIG } from '../matchConfig';
import { TOURNAMENT_KEY_VERSION } from '../keyVersion';

/**
 * The answer key the server scores tournament games against.
 *
 * A tournament game used to end with the app telling the server its own
 * score, and the server believing it — any whole number from nought to
 * seven. Now the server issues a seed, the app plays exactly the quiz that
 * seed produces and sends back which option was tapped on each question,
 * and the server does the marking.
 *
 * To mark, the server has to know the right answers, and it cannot run the
 * generator: that is app code, tangled up with the cast, the artwork and
 * the audio. So the answers are worked out here, ahead of time, by the real
 * generator, for a fixed pool of seeds — one digit per question, the index
 * of the right option — and committed where the function can import them.
 *
 * This test is both the builder and the guard. It rebuilds the key from the
 * generator as it is today and fails if the committed copy differs, which
 * is what happens the moment a character is added or a question type is
 * touched: the app would then be asking questions the server marks against
 * yesterday's answers, and honest players would lose games they won.
 *
 * To refresh after such a change:
 *
 *   UPDATE_TOURNAMENT_KEY=1 npx jest src/tournament/__tests__/answerKey.test.ts
 *
 * then deploy the `tournament` function and ship a build — the two carry a
 * version that has to match, and a build from before the change is told to
 * update rather than being marked wrong.
 */
const POOL = 2000;

const SERVER_FILE = join(__dirname, '../../../supabase/functions/_shared/tournamentKey.ts');
const SUBJECT_FILE = join(__dirname, '../../../supabase/functions/_shared/tournamentSubjects.ts');
const CLIENT_FILE = join(__dirname, '../keyVersion.ts');

function buildKey(lang: 'ru' | 'en'): string {
  let key = '';
  for (let seed = 1; seed <= POOL; seed++) {
    for (const question of generateQuiz({ ...WEEKLY_MATCH_CONFIG, seed }, lang)) {
      key += String(question.correctIndex);
    }
  }
  return key;
}

/**
 * Who each question of each quiz is about, for the server to deal a player
 * quizzes about characters they have not met yet this tournament. Subjects
 * are numbered in sorted order and written two base-36 digits a question —
 * the server only ever compares them, it never needs the names.
 */
function buildSubjects(): { key: string; count: number } {
  const all: string[][] = [];
  for (let seed = 1; seed <= POOL; seed++) {
    all.push(generateQuiz({ ...WEEKLY_MATCH_CONFIG, seed }, 'ru').map((q) => q.subject));
  }
  const names = Array.from(new Set(all.flat())).sort();
  const number = new Map(names.map((name, i) => [name, i]));
  const key = all.flat().map((name) => number.get(name)!.toString(36).padStart(2, '0')).join('');
  return { key, count: names.length };
}

function subjectSource(subjects: { key: string; count: number }): string {
  return `// GENERATED — do not edit by hand.
//
// Who every question of every tournament quiz is about: seed s, question q
// is the two base-36 digits at ((s - 1) * ${GAME_QUESTIONS} + q) * 2. The same
// number is the same character (or the same series' song or clip) in every
// quiz, whatever was asked about them. ${subjects.count} subjects in all.
// Built alongside the answer key by src/tournament/__tests__/answerKey.test.ts.

export const SUBJECT_KEY =
  '${subjects.key}';
`;
}

function versionOf(key: string): string {
  return createHash('sha256').update(`${POOL}|${GAME_QUESTIONS}|${key}`).digest('hex').slice(0, 12);
}

function serverSource(key: string): string {
  return `// GENERATED — do not edit by hand.
//
// The index of the right option for every question of every tournament quiz
// the server may issue: seed s, question q is the digit at (s - 1) * ${GAME_QUESTIONS} + q.
// Built from the app's own generator by
// src/tournament/__tests__/answerKey.test.ts, which also fails the build
// when this file falls behind it.

export const KEY_VERSION = '${versionOf(key)}';
export const KEY_POOL = ${POOL};
export const KEY_QUESTIONS = ${GAME_QUESTIONS};
export const ANSWER_KEY =
  '${key}';
`;
}

function clientSource(key: string): string {
  return `// GENERATED — do not edit by hand.
//
// Which answer key this build's question generator agrees with. The server
// holds the key itself; the app only says which one it would produce, so a
// build from before the cast changed is told to update instead of having
// its games marked against answers to different questions.
// See src/tournament/__tests__/answerKey.test.ts.

export const TOURNAMENT_KEY_VERSION = '${versionOf(key)}';
`;
}

describe('tournament answer key', () => {
  const key = buildKey('ru');
  const subjects = buildSubjects();

  if (process.env.UPDATE_TOURNAMENT_KEY === '1') {
    writeFileSync(SERVER_FILE, serverSource(key));
    writeFileSync(CLIENT_FILE, clientSource(key));
    writeFileSync(SUBJECT_FILE, subjectSource(subjects));
  }

  it('names who every question is about, in two digits each', () => {
    expect(subjects.key).toHaveLength(POOL * GAME_QUESTIONS * 2);
    expect(subjects.count).toBeLessThanOrEqual(36 * 36);
    expect(readFileSync(SUBJECT_FILE, 'utf8')).toBe(subjectSource(subjects));
  });

  it('has one digit per question, each naming one of four options', () => {
    expect(key).toHaveLength(POOL * GAME_QUESTIONS);
    expect(key).toMatch(/^[0-3]+$/);
  });

  it('does not depend on the language the quiz is read in', () => {
    // One key serves both: the right option sits at the same index whether
    // the names around it are Russian or English. If this ever stops being
    // true the server would need to be told the language of every game.
    expect(buildKey('en')).toBe(key);
  });

  it('is the same quiz every time for the same seed', () => {
    const once = generateQuiz({ ...WEEKLY_MATCH_CONFIG, seed: 1234 }, 'ru');
    const twice = generateQuiz({ ...WEEKLY_MATCH_CONFIG, seed: 1234 }, 'ru');
    expect(twice.map((q) => [q.id, q.promptText, q.options, q.correctIndex])).toEqual(
      once.map((q) => [q.id, q.promptText, q.options, q.correctIndex])
    );
  });

  it('is not a key anybody could guess their way through', () => {
    // Four options, so each should be right about a quarter of the time. A
    // generator that drifted into always putting the answer first would
    // make "tap the top one" a winning strategy.
    for (const digit of ['0', '1', '2', '3']) {
      const share = key.split(digit).length - 1;
      expect(share / key.length).toBeGreaterThan(0.2);
      expect(share / key.length).toBeLessThan(0.3);
    }
  });

  it('matches the copy the server marks against', () => {
    expect(existsSync(SERVER_FILE)).toBe(true);
    expect(readFileSync(SERVER_FILE, 'utf8')).toBe(serverSource(key));
  });

  it('matches the version this build claims', () => {
    expect(readFileSync(CLIENT_FILE, 'utf8')).toBe(clientSource(key));
    expect(TOURNAMENT_KEY_VERSION).toBe(versionOf(key));
  });
});

describe('the cast, read in either language', () => {
  it('names each faction once in Russian and once in English', () => {
    // A faction question draws its wrong answers from every faction there is.
    // If one Russian name had two English ones (or the other way round) the
    // two languages would have different-sized pools, the quiz would come
    // out differently in each, and one answer key could not mark both.
    const { CHARACTERS, localizeCharacter } = require('../../data/characters');
    const pairs = new Map<string, string>();
    const back = new Map<string, string>();
    for (const c of CHARACTERS) {
      const ru = localizeCharacter(c, 'ru').faction;
      const en = localizeCharacter(c, 'en').faction;
      expect(pairs.get(ru) ?? en).toBe(en);
      expect(back.get(en) ?? ru).toBe(ru);
      pairs.set(ru, en);
      back.set(en, ru);
    }
  });
});
