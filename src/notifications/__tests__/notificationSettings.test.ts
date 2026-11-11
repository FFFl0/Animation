import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';
import {
  ALL_ON,
  CATEGORY_OF_KIND,
  PUSH_CATEGORIES,
  allows,
  mutedCategories,
  parseSettings,
} from '../notificationSettings';

/**
 * A notification switch is a promise made in the app and kept on the
 * server: the phone only records the choice, and it is the send functions
 * that have to leave a muted device out. Those cannot be run from a test,
 * so what is checked is that all three places — the app, the functions and
 * the database — are talking about the same switches.
 */
const ROOT = join(__dirname, '../../..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

const SCHEMA = read('supabase/schema.sql');
const SHARED = read('supabase/functions/_shared/push.ts');
const SENDERS = ['supabase/functions/send-push/index.ts', 'supabase/functions/tournament/index.ts'];

function quoted(text: string): string[] {
  return [...text.matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]);
}

describe('what was saved', () => {
  it('starts with everything on', () => {
    expect(parseSettings(null)).toEqual(ALL_ON);
    expect(mutedCategories(ALL_ON)).toEqual([]);
  });

  it('keeps a switch that was turned off', () => {
    const settings = parseSettings({ tournament: false });
    expect(settings).toEqual({ friends: true, battles: true, tournament: false });
    expect(mutedCategories(settings)).toEqual(['tournament']);
  });

  it('reads nothing into junk', () => {
    // Anything but an explicit `false` leaves the notice on: a corrupted
    // file must not silence the app, and a made-up category must not reach
    // the server, whose column refuses names it does not know.
    for (const junk of ['nope', 7, [], { friends: 'no' }, { friends: 0 }, { spam: false }]) {
      expect(parseSettings(junk)).toEqual(ALL_ON);
    }
  });

  it('silences exactly the kinds its switch covers', () => {
    const settings = parseSettings({ tournament: false });
    expect(allows(settings, 'tournamentSignups')).toBe(false);
    expect(allows(settings, 'tournamentStarted')).toBe(false);
    expect(allows(settings, 'friendRequest')).toBe(true);
    expect(allows(settings, 'battleInvite')).toBe(true);
  });
});

describe('the server is asked about the same switches', () => {
  it('lists the categories the app lists', () => {
    const block = SHARED.slice(SHARED.indexOf('PUSH-CATEGORIES-BEGIN'), SHARED.indexOf('PUSH-CATEGORIES-END'));
    const list = block.slice(block.indexOf('export const PUSH_CATEGORIES'));
    expect(quoted(list)).toEqual([...PUSH_CATEGORIES]);
  });

  it('lets the database store those and nothing else', () => {
    const at = SCHEMA.lastIndexOf('add constraint push_tokens_muted_known');
    expect(at).toBeGreaterThan(-1);
    expect(quoted(SCHEMA.slice(at, SCHEMA.indexOf(';', at)))).toEqual([...PUSH_CATEGORIES]);
    expect(SCHEMA).toContain("add column if not exists muted text[] not null default '{}'");
  });

  it('leaves a muted device out before sending', () => {
    const body = SHARED.slice(SHARED.indexOf('export async function tokensFor'));
    expect(body).toContain(".not('muted', 'cs', `{${category}}`)");
  });

  it.each(SENDERS)('%s names a category every time it picks recipients', (path) => {
    const source = read(path);
    const calls = [...source.matchAll(/tokensFor\(admin, ([^,)]+)/g)].map((m) => m[1]);
    expect(calls.length).toBeGreaterThan(0);
    for (const argument of calls) {
      // Either a category spelled out, or the lookup by kind checked below.
      if (argument === 'CATEGORY[kind]') continue;
      expect(PUSH_CATEGORIES).toContain(argument.replace(/'/g, ''));
    }
  });

  it('files each kind under the switch the app shows for it', () => {
    // send-push picks the category by kind; the tournament names it outright.
    const sendPush = read(SENDERS[0]);
    const map = sendPush.slice(sendPush.indexOf('const CATEGORY: Record<Kind, PushCategory>'));
    const entries = [...map.slice(0, map.indexOf('};')).matchAll(/(\w+): '(\w+)'/g)].map((m) => [m[1], m[2]]);
    expect(entries.length).toBeGreaterThan(0);
    for (const [kind, category] of entries) {
      expect(CATEGORY_OF_KIND[kind as keyof typeof CATEGORY_OF_KIND]).toBe(category);
    }

    const tournament = read(SENDERS[1]);
    const sends = [...tournament.matchAll(/tokensFor\(admin, '(\w+)'[^;]*\{ kind: '(\w+)' \}/g)].map((m) => [m[2], m[1]]);
    expect(sends.length).toBe(2);
    for (const [kind, category] of sends) {
      expect(CATEGORY_OF_KIND[kind as keyof typeof CATEGORY_OF_KIND]).toBe(category);
    }
  });

  it('has a switch for every kind a function sends', () => {
    const kinds = SENDERS.flatMap((path) => [...read(path).matchAll(/\{ kind: '(\w+)' \}/g)].map((m) => m[1]));
    const declared = [...read(SENDERS[0]).matchAll(/^  (\w+): '(\w+)',$/gm)].map((m) => m[1]);
    for (const kind of [...kinds, ...declared]) {
      expect(Object.keys(CATEGORY_OF_KIND)).toContain(kind);
    }
  });
});

describe('the profile page', () => {
  it.each(['ru', 'en'] as const)('names and explains every switch in %s', (lang) => {
    const t = getT(lang);
    for (const key of ['streak', ...PUSH_CATEGORIES]) {
      expect(t(`profile.notify.${key}`)).not.toContain('profile.notify');
      expect(t(`profile.notify.${key}Hint`)).not.toContain('profile.notify');
    }
  });
});
