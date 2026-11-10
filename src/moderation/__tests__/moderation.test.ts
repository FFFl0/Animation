import { readFileSync } from 'fs';
import { join } from 'path';
import { getT } from '../../i18n/strings';
import { REPORT_COMMENT_MAX, REPORT_REASONS, reportArgs } from '../reports';

/**
 * Blocking and reporting are enforced by the database, and the database
 * cannot be reached from a test — so what is checked here is the SQL as
 * written, and that the app asks for it in the shape it expects.
 *
 * Every one of these is a rule that fails quietly: a block that only hides
 * things in the app, a report that loses its evidence, a table that lets
 * the blocked person see who blocked them.
 */
const SCHEMA = readFileSync(join(__dirname, '../../../supabase/schema.sql'), 'utf8');
const CHAT_ROOM = readFileSync(join(__dirname, '../../chat/ChatRoom.tsx'), 'utf8');

/** The last `create policy "<name>"` in the file — the one that is in force. */
function policy(name: string): string {
  const at = SCHEMA.lastIndexOf(`create policy "${name}"`);
  expect(at).toBeGreaterThan(-1);
  return SCHEMA.slice(at, SCHEMA.indexOf(';', at));
}

function sqlFunction(name: string): string {
  const at = SCHEMA.lastIndexOf(`create or replace function public.${name}(`);
  expect(at).toBeGreaterThan(-1);
  return SCHEMA.slice(at, SCHEMA.indexOf('$$;', at));
}

describe('a block is enforced where it cannot be walked around', () => {
  it.each([
    ['Send messages as yourself', 'sender_id, recipient_id'],
    ['Send friend requests as yourself', 'requester_id, addressee_id'],
    ['Send battle invites as yourself', 'from_user_id, to_user_id'],
    ['Owner adds members', 'auth.uid(), user_id'],
  ])('%s refuses across a block', (name, pair) => {
    expect(policy(name)).toContain(`not public.blocked_between(${pair})`);
  });

  it('answers only somebody who is one of the two', () => {
    // Otherwise anyone could ask about any pair and map out who has
    // blocked whom.
    expect(sqlFunction('blocked_between')).toContain('auth.uid() in (p_a, p_b)');
  });

  it('shows a block to the one who made it and to nobody else', () => {
    expect(policy('See who you have blocked')).toContain('auth.uid() = blocker_id');
    // No insert or delete policy: both go through functions, so the only
    // way to write the table is the way that also ends the friendship.
    expect(SCHEMA).not.toMatch(/on public\.user_blocks\s+for (insert|delete|update|all)/);
  });

  it('ends the friendship and withdraws invites in the same breath', () => {
    const block = sqlFunction('block_user');
    expect(block).toContain('insert into public.user_blocks');
    expect(block).toMatch(/delete from public\.friendships[\s\S]+requester_id = v_me and addressee_id = p_user[\s\S]+requester_id = p_user and addressee_id = v_me/);
    expect(block).toContain('delete from public.battle_invites');
    expect(block).toContain("'cannot block yourself'");
  });
});

describe('a report keeps its evidence and its secrets', () => {
  const table = SCHEMA.slice(
    SCHEMA.indexOf('create table if not exists public.content_reports'),
    SCHEMA.indexOf('create or replace function public.report_content')
  );
  const report = sqlFunction('report_content');

  it('stores what the message said at the time', () => {
    expect(table).toContain('body_snapshot text');
    expect(table).toContain('attachment_snapshot text');
    // No foreign key to the message: the report has to outlive it.
    expect(table).not.toMatch(/message_id uuid[^,\n]*references/);
  });

  it('cannot be read or written by the app directly', () => {
    expect(table).toContain('alter table public.content_reports enable row level security');
    expect(SCHEMA).not.toMatch(/on public\.content_reports\s+for/);
  });

  it('only takes a report on something the reporter can see', () => {
    expect(report).toContain('sender_id = v_me or recipient_id = v_me');
    expect(report).toContain('public.is_group_member(m.group_id, v_me)');
    expect(report).toContain("'cannot report yourself'");
  });

  it('keeps the queue out of players’ reach', () => {
    expect(SCHEMA).toContain('create view public.moderation_queue with (security_invoker = true)');
    expect(SCHEMA).toContain('revoke all on public.moderation_queue from anon, authenticated');
  });

  it('knows exactly the reasons the app offers', () => {
    const inSql = [...table.match(/reason in \(([^)]+)\)/)![1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    expect(inSql.sort()).toEqual([...REPORT_REASONS].sort());
    expect(report).toContain(`p_reason not in (${REPORT_REASONS.map((r) => `'${r}'`).join(', ')})`);
  });

  it('is called with the arguments it declares, and no others', () => {
    const signature = SCHEMA.slice(
      SCHEMA.lastIndexOf('create or replace function public.report_content('),
      SCHEMA.indexOf('returns void', SCHEMA.lastIndexOf('create or replace function public.report_content('))
    );
    const declared = [...signature.matchAll(/(p_[a-z]+)\s+\w+/g)].map((m) => m[1]);
    const sent = Object.keys(reportArgs({ kind: 'user', userId: 'u' }, 'spam', ''));
    expect(declared.sort()).toEqual(sent.sort());
  });
});

describe('what the app sends with a report', () => {
  it('names the message for a message and the person for a person', () => {
    expect(reportArgs({ kind: 'group_message', messageId: 'm1' }, 'abuse', '')).toMatchObject({
      p_kind: 'group_message',
      p_message: 'm1',
      p_user: null,
    });
    expect(reportArgs({ kind: 'user', userId: 'u1' }, 'spam', '')).toMatchObject({
      p_kind: 'user',
      p_message: null,
      p_user: 'u1',
    });
  });

  it('sends no note rather than an empty one, and never one too long', () => {
    expect(reportArgs({ kind: 'user', userId: 'u' }, 'other', '   ').p_comment).toBeNull();
    expect(reportArgs({ kind: 'user', userId: 'u' }, 'other', '  hi  ').p_comment).toBe('hi');
    expect(reportArgs({ kind: 'user', userId: 'u' }, 'other', 'x'.repeat(900)).p_comment).toHaveLength(REPORT_COMMENT_MAX);
  });
});

describe('the screens', () => {
  it('offer a report only on somebody else’s message', () => {
    expect(CHAT_ROOM).toContain('onReport && menuFor.senderId !== meId');
  });

  it.each(['ru', 'en'] as const)('have words for every reason in %s', (language) => {
    const t = getT(language);
    for (const reason of REPORT_REASONS) {
      expect(t(`moderation.reason.${reason}`)).not.toContain('moderation.');
    }
    for (const key of ['report', 'block', 'unblock', 'blockConfirm', 'sentText', 'blockedTitle', 'blockedEmpty', 'failed']) {
      expect(t(`moderation.${key}`)).not.toContain('moderation.');
    }
  });
});
