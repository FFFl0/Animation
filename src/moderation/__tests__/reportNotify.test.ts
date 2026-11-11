import { readFileSync } from 'fs';
import { join } from 'path';
import { REPORT_REASONS } from '../reports';
import { QUESTION_REPORT_REASONS } from '../../quiz/questionReports';

/**
 * Reports are passed to the developer's Telegram by an Edge Function that
 * cannot be run from a test. What is checked is that it agrees with the
 * app and the database on the things that would fail quietly: a reason it
 * has no words for, a column it marks that does not exist, a call the app
 * forgets to make, a function the deploy leaves behind.
 */
const ROOT = join(__dirname, '../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const FN = read('supabase/functions/report-notify/index.ts');
const SCHEMA = read('supabase/schema.sql');

function mapKeys(name: string): string[] {
  const at = FN.indexOf(`const ${name}: Record<string, string> = {`);
  expect(at).toBeGreaterThan(-1);
  const body = FN.slice(at, FN.indexOf('};', at));
  return [...body.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
}

describe('the Telegram message', () => {
  it('has words for every reason a chat report can give', () => {
    expect(mapKeys('CONTENT_REASON').sort()).toEqual([...REPORT_REASONS].sort());
  });

  it('has words for every reason a question report can give', () => {
    expect(mapKeys('QUESTION_REASON').sort()).toEqual([...QUESTION_REPORT_REASONS].sort());
  });

  it('escapes everything a player wrote before it goes into HTML', () => {
    // Every player-written field is passed through escapeHtml; a raw one
    // would let a message rewrite the notice, or break it.
    for (const field of ['r.body_snapshot', 'r.comment', 'r.prompt', 'option', 'r.attachment_snapshot']) {
      const uses = [...FN.matchAll(new RegExp(`[(\\s]${field.replace('.', '\\.')}\\b`, 'g'))].length;
      const escaped = [...FN.matchAll(new RegExp(`escapeHtml\\(cut\\(${field.replace('.', '\\.')}|escapeHtml\\(${field.replace('.', '\\.')}`, 'g'))].length;
      expect(escaped).toBeGreaterThan(0);
      expect(uses).toBeGreaterThanOrEqual(escaped);
    }
  });

  it('keeps the bot token out of the app', () => {
    expect(read('src/moderation/reportNotify.ts')).not.toMatch(/TELEGRAM|api\.telegram\.org/);
    expect(FN).toContain("Deno.env.get('TELEGRAM_BOT_TOKEN')");
  });
});

describe('each report is sent once', () => {
  it.each(['content_reports', 'question_reports'])('%s has the column that remembers it was sent', (table) => {
    expect(SCHEMA).toContain(`alter table public.${table} add column if not exists notified_at timestamptz;`);
  });

  it('claims a report before sending it, and only one nobody else has claimed', () => {
    const claim = FN.slice(FN.indexOf('async function claim'), FN.indexOf('async function release'));
    expect(claim.indexOf(".update({ notified_at:")).toBeGreaterThan(-1);
    // the update itself re-checks, so two calls at once cannot both take a row
    expect(claim.slice(claim.indexOf('.update(')).includes(".is('notified_at', null)")).toBe(true);
  });

  it('puts back a report whose message did not go out', () => {
    expect(FN.match(/else await release\(admin, '(content|question)_reports', r\.id\)/g)?.length).toBe(2);
  });

  it('only answers a signed-in caller', () => {
    const serve = FN.slice(FN.indexOf('Deno.serve'));
    expect(serve.indexOf('auth.getUser()')).toBeLessThan(serve.indexOf('SUPABASE_SERVICE_ROLE_KEY'));
  });
});

describe('the app and the deploy', () => {
  it.each([
    ['src/moderation/moderationApi.ts', "rpc('report_content'"],
    ['src/quiz/questionReportApi.ts', "rpc(\n    'report_question'"],
  ])('%s pokes the function only after the report is in', (path, call) => {
    const source = read(path);
    const at = source.indexOf(call);
    expect(at).toBeGreaterThan(-1);
    const after = source.slice(at);
    expect(after.indexOf('pokeReportNotify()')).toBeGreaterThan(after.indexOf('throw'));
  });

  it('is deployed with the rest', () => {
    expect(read('.github/workflows/deploy-functions.yml')).toMatch(/default: '[^']*\breport-notify\b[^']*'/);
  });
});
