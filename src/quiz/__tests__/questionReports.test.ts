import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';
import { CATEGORIES } from '../../data/categories';
import { generateQuiz } from '../generateQuiz';
import {
  QUESTION_COMMENT_MAX,
  QUESTION_PROMPT_MAX,
  QUESTION_REPORT_REASONS,
  questionKeyOf,
  questionReportArgs,
} from '../questionReports';

/**
 * A report about a question is written by a database function the tests
 * cannot call, so what is checked is the SQL as written against what the
 * app sends — and that nothing the generator can produce is refused by it.
 */
const SCHEMA = readFileSync(join(__dirname, '../../../supabase/schema.sql'), 'utf8');

function between(start: string, end: string): string {
  const at = SCHEMA.lastIndexOf(start);
  expect(at).toBeGreaterThan(-1);
  return SCHEMA.slice(at, SCHEMA.indexOf(end, at));
}

const FUNCTION = between('create or replace function public.report_question(', '$$;');
const TABLE = between('create table if not exists public.question_reports', ');');

function quotedList(sql: string, before: string): string[] {
  const at = sql.indexOf(before);
  expect(at).toBeGreaterThan(-1);
  const list = sql.slice(sql.indexOf('(', at + before.length - 1), sql.indexOf(')', at + before.length));
  return [...list.matchAll(/'(\w+)'/g)].map((m) => m[1]);
}

/** One round of everything the app can ask, in both languages. */
const EVERY_QUESTION = (['ru', 'en'] as const).flatMap((lang) =>
  CATEGORIES.flatMap((category) => generateQuiz({ categoryId: category.id, questionCount: 30, seed: 7 }, lang))
);

const SAMPLE = EVERY_QUESTION[0];
const report = { language: 'ru', picked: 2, reason: 'typo' as const, comment: '', appVersion: '1.0.0 (12)' };

describe('which question a report is about', () => {
  it('is the same wherever in a round the question fell', () => {
    expect(questionKeyOf({ id: 'naruto-guessQuote-0' })).toBe('naruto-guessQuote');
    expect(questionKeyOf({ id: 'naruto-guessQuote-29' })).toBe('naruto-guessQuote');
  });

  it('keeps a subject whose own name ends in a number', () => {
    // Only the last number is the place in the round.
    expect(questionKeyOf({ id: 'android-18-guessSeries-4' })).toBe('android-18-guessSeries');
  });

  it('names the kind of question as well as its subject', () => {
    // Two questions about one character are two different things to fix.
    for (const question of EVERY_QUESTION) {
      expect(questionKeyOf(question).endsWith(`-${question.type}`)).toBe(true);
    }
    expect(new Set(EVERY_QUESTION.map(questionKeyOf)).size).toBeGreaterThan(20);
  });
});

describe('what the server is sent', () => {
  it('is asked for by the names the function declares', () => {
    const declared = [...FUNCTION.slice(0, FUNCTION.indexOf('returns void')).matchAll(/\b(p_\w+)\b/g)].map((m) => m[1]);
    expect(Object.keys(questionReportArgs(SAMPLE, report))).toEqual(declared);
  });

  it('offers the reasons the function and the table accept', () => {
    expect(quotedList(FUNCTION, 'p_reason not in (')).toEqual([...QUESTION_REPORT_REASONS]);
    expect(quotedList(TABLE, 'reason in (')).toEqual([...QUESTION_REPORT_REASONS]);
  });

  it('cuts the note and the question where the table does', () => {
    expect(TABLE).toContain(`char_length(comment) <= ${QUESTION_COMMENT_MAX}`);
    expect(TABLE).toContain(`char_length(prompt) <= ${QUESTION_PROMPT_MAX}`);
    const long = questionReportArgs(
      { ...SAMPLE, promptText: 'я'.repeat(QUESTION_PROMPT_MAX + 50) },
      { ...report, comment: ` ${'x'.repeat(QUESTION_COMMENT_MAX + 50)} ` }
    );
    expect(long.p_comment).toHaveLength(QUESTION_COMMENT_MAX);
    expect(long.p_prompt).toHaveLength(QUESTION_PROMPT_MAX);
  });

  it('sends no note rather than an empty one', () => {
    expect(questionReportArgs(SAMPLE, { ...report, comment: '   ' }).p_comment).toBeNull();
  });

  it('never builds a question the function would refuse', () => {
    // The limits written into report_question, read back out of it.
    const maxOptions = Number(/jsonb_array_length\(p_options\) > (\d+)/.exec(FUNCTION)![1]);
    const maxOption = Number(/char_length\(o #>> '\{\}'\) > (\d+)/.exec(FUNCTION)![1]);
    const [minKey, maxKey] = /char_length\(p_key\) not between (\d+) and (\d+)/.exec(FUNCTION)!.slice(1).map(Number);

    for (const question of EVERY_QUESTION) {
      const args = questionReportArgs(question, report);
      expect(args.p_key.length).toBeGreaterThanOrEqual(minKey);
      expect(args.p_key.length).toBeLessThanOrEqual(maxKey);
      expect(args.p_options.length).toBeLessThanOrEqual(maxOptions);
      for (const option of args.p_options) expect(option.length).toBeLessThanOrEqual(maxOption);
      expect(args.p_correct).toBeGreaterThanOrEqual(0);
      expect(args.p_correct).toBeLessThan(args.p_options.length);
    }
  });
});

describe('who can write and read reports', () => {
  it('lets only the function write, and only for whoever is signed in', () => {
    expect(SCHEMA).toContain('alter table public.question_reports enable row level security');
    expect(SCHEMA).not.toMatch(/create policy [^;]* on public\.question_reports/);
    expect(FUNCTION).toContain('v_me uuid := auth.uid()');
    expect(FUNCTION).toContain('security definer');
    const signature = 'public.report_question(text, text, text, text, text, jsonb, integer, integer, text)';
    expect(SCHEMA).toContain(`revoke all on function ${signature} from public`);
    expect(SCHEMA).toContain(`grant execute on function ${signature} to authenticated`);
  });

  it('counts a second report from the same player as the same report', () => {
    expect(SCHEMA).toContain('on public.question_reports (reporter_id, question_key, language)');
    expect(FUNCTION).toContain('on conflict (reporter_id, question_key, language) do update');
  });

  it('keeps the review queue away from players', () => {
    expect(SCHEMA).toContain('create view public.question_report_queue with (security_invoker = true)');
    expect(SCHEMA).toContain('revoke all on public.question_report_queue from anon, authenticated');
  });
});

describe('the sheet', () => {
  it.each(['ru', 'en'] as const)('has a line for every reason in %s', (lang) => {
    const t = getT(lang);
    for (const reason of QUESTION_REPORT_REASONS) {
      expect(t(`questionReport.reason.${reason}`)).not.toContain('questionReport');
    }
  });
});
