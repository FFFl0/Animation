import { RoundConfig } from '../quiz/types';
import { GAME_QUESTIONS } from './doubleElim';

/**
 * The round every tournament game is.
 *
 * It lives here rather than in the screen because it is half of a contract:
 * the server scores a game against an answer key that was built from
 * exactly this config, so a change to it is a change to the key as well —
 * and the test that guards the key has to be able to import it without
 * dragging a screen, and the audio module behind it, in with it.
 */
export const WEEKLY_MATCH_CONFIG: RoundConfig = {
  categoryId: 'mixed',
  questionCount: GAME_QUESTIONS,
  timerSeconds: 15,
};
