import { Question } from './generateQuiz';

/**
 * What a "this question is wrong" report is, with nothing attached to the
 * network — so the shape the server is asked in can be held to the SQL by a
 * test without loading the rest of the app.
 */
export const QUESTION_REPORT_REASONS = ['wrongAnswer', 'ambiguous', 'typo', 'media', 'other'] as const;

export type QuestionReportReason = (typeof QUESTION_REPORT_REASONS)[number];

/** Longest note a report can carry; the server refuses anything past it. */
export const QUESTION_COMMENT_MAX = 500;

/** How much of the question's own text is sent along. */
export const QUESTION_PROMPT_MAX = 600;

/**
 * What the question is, whichever round it turned up in.
 *
 * A question's id ends in its place in the round (`naruto-guessQuote-3`),
 * which is different every time it is asked. Without that suffix it names
 * the subject and the kind of question — the same for everybody who meets
 * it, which is what lets ten reports of one mistake be counted as ten.
 */
export function questionKeyOf(question: Pick<Question, 'id'>): string {
  return question.id.replace(/-\d+$/, '');
}

/**
 * The arguments report_question takes.
 *
 * The question travels as it was shown — its text, the answers offered and
 * which one the app counted as right — because the questions are built on
 * the phone from a catalogue that changes between versions. A key alone
 * would say which question; only the snapshot says what was wrong with it.
 */
export function questionReportArgs(
  question: Pick<Question, 'id' | 'promptText' | 'options' | 'correctIndex'>,
  report: {
    language: string;
    /** What the player tapped; -1 when the clock ran out. */
    picked: number;
    reason: QuestionReportReason;
    comment: string;
    appVersion: string;
  }
) {
  return {
    p_key: questionKeyOf(question),
    p_language: report.language,
    p_reason: report.reason,
    p_comment: report.comment.trim().slice(0, QUESTION_COMMENT_MAX) || null,
    p_prompt: question.promptText.slice(0, QUESTION_PROMPT_MAX),
    p_options: question.options,
    p_correct: question.correctIndex,
    p_picked: report.picked,
    p_version: report.appVersion,
  };
}
