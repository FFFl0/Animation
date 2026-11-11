// Supabase Edge Function: tells the developer about new reports in Telegram.
//
// The app calls this, with no arguments, right after a report has been
// filed. It does not take the report from the request: it looks in the
// database for every report nobody has been told about yet — the one just
// filed, and any that an earlier call missed because the app was closed
// too soon — claims them, and sends one message each. A caller can make it
// send nothing but real reports, and no more often than reports are filed,
// which the database already limits per player.
//
// Needs two function secrets (the deploy workflow copies them from the
// repository's secrets of the same names):
//   TELEGRAM_BOT_TOKEN  from @BotFather
//   TELEGRAM_CHAT_ID    who receives the messages — a person or a group
// Without them it answers { sent: 0, configured: false } and touches nothing,
// so the reports wait in the database until it is set up.
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// by the Edge Function runtime.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** At most this many messages per call; the rest go out with the next one. */
const BATCH = 10;

/** Telegram refuses a message over 4096 characters; quoted text is cut well short of that. */
const SNIPPET = 600;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Text from players goes into HTML mode, so it is escaped — a name like <b> stays a name. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cut(text: string | null | undefined, max = SNIPPET): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const CONTENT_REASON: Record<string, string> = {
  spam: 'спам или реклама',
  abuse: 'оскорбления или угрозы',
  inappropriate: 'неприемлемый контент',
  other: 'другое',
};

const CONTENT_KIND: Record<string, string> = {
  direct_message: 'личное сообщение',
  group_message: 'сообщение в группе',
  user: 'игрок',
};

const QUESTION_REASON: Record<string, string> = {
  wrongAnswer: 'засчитан не тот ответ',
  ambiguous: 'подходит больше одного ответа',
  typo: 'опечатка',
  media: 'не та картинка, звук или видео',
  other: 'другое',
};

type ContentReport = {
  id: string;
  kind: string;
  reason: string;
  comment: string | null;
  body_snapshot: string | null;
  attachment_snapshot: string | null;
  reporter_id: string;
  target_user_id: string;
};

type QuestionReport = {
  id: string;
  question_key: string;
  language: string;
  reason: string;
  comment: string | null;
  prompt: string | null;
  options: unknown;
  correct_index: number | null;
  picked_index: number | null;
  app_version: string | null;
};

export function contentMessage(
  r: ContentReport,
  names: Record<string, string>,
  reportsOnTarget: number,
  queueUrl: string
): string {
  const lines = [
    '🚩 <b>Жалоба</b>: ' + escapeHtml(CONTENT_KIND[r.kind] ?? r.kind),
    'Причина: ' + escapeHtml(CONTENT_REASON[r.reason] ?? r.reason),
    'На кого: <b>' + escapeHtml(names[r.target_user_id] ?? r.target_user_id) + '</b>' +
      (reportsOnTarget > 1 ? ` (жалоб на него всего: ${reportsOnTarget})` : ''),
    'От кого: ' + escapeHtml(names[r.reporter_id] ?? r.reporter_id),
  ];
  if (r.body_snapshot) lines.push('', 'Сообщение:', '<blockquote>' + escapeHtml(cut(r.body_snapshot)) + '</blockquote>');
  if (r.attachment_snapshot) lines.push('Вложение: ' + escapeHtml(r.attachment_snapshot));
  if (r.comment) lines.push('', 'Комментарий: ' + escapeHtml(cut(r.comment)));
  lines.push('', `<a href="${queueUrl}">Открыть SQL Editor</a> · <code>select * from moderation_queue;</code>`);
  return lines.join('\n');
}

export function questionMessage(r: QuestionReport, reportsOnQuestion: number, queueUrl: string): string {
  const options = Array.isArray(r.options) ? (r.options as unknown[]).map(String) : [];
  const lines = [
    '❓ <b>Ошибка в вопросе</b>: <code>' + escapeHtml(r.question_key) + '</code> (' + escapeHtml(r.language) + ')',
    'Что не так: ' + escapeHtml(QUESTION_REASON[r.reason] ?? r.reason) +
      (reportsOnQuestion > 1 ? ` (жалоб на этот вопрос: ${reportsOnQuestion})` : ''),
  ];
  if (r.prompt) lines.push('', '<blockquote>' + escapeHtml(cut(r.prompt, 300)) + '</blockquote>');
  options.forEach((option, i) => {
    const marks = (i === r.correct_index ? ' ✅' : '') + (i === r.picked_index && i !== r.correct_index ? ' ← выбрал' : '');
    lines.push(`${i + 1}. ${escapeHtml(cut(option, 120))}${marks}`);
  });
  if (r.picked_index === -1) lines.push('(время вышло)');
  if (r.comment) lines.push('', 'Комментарий: ' + escapeHtml(cut(r.comment)));
  if (r.app_version) lines.push('Версия: ' + escapeHtml(r.app_version));
  lines.push('', `<a href="${queueUrl}">Открыть SQL Editor</a> · <code>select * from question_report_queue;</code>`);
  return lines.join('\n');
}

async function sendTelegram(token: string, chatId: string, text: string): Promise<boolean> {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  return response.ok;
}

/**
 * Takes the oldest reports nobody has been told about, marking them as told
 * in the same statement. Two calls at once cannot both take the same row:
 * the update only returns rows it changed, and a row already marked is not
 * changed again.
 */
async function claim<T>(admin: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const { data: waiting } = await admin
    .from(table)
    .select('id')
    .is('notified_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH);
  const ids = (waiting ?? []).map((row: { id: string }) => row.id);
  if (ids.length === 0) return [];
  const { data } = await admin
    .from(table)
    .update({ notified_at: new Date().toISOString() })
    .in('id', ids)
    .is('notified_at', null)
    .select(columns);
  return (data ?? []) as T[];
}

/** A report whose message did not go out is put back for the next call. */
async function release(admin: SupabaseClient, table: string, id: string): Promise<void> {
  await admin.from(table).update({ notified_at: null }).eq('id', id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'not signed in' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const asCaller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'not signed in' }, 401);

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!botToken || !chatId) return json({ sent: 0, configured: false });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const projectRef = new URL(url).hostname.split('.')[0];
  const queueUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
  let sent = 0;

  const content = await claim<ContentReport>(
    admin,
    'content_reports',
    'id, kind, reason, comment, body_snapshot, attachment_snapshot, reporter_id, target_user_id'
  );
  if (content.length > 0) {
    const people = [...new Set(content.flatMap((r) => [r.reporter_id, r.target_user_id]))];
    const { data: profiles } = await admin.from('profiles').select('id, username').in('id', people);
    const names: Record<string, string> = {};
    for (const p of profiles ?? []) names[p.id] = p.username;
    for (const r of content) {
      const { count } = await admin
        .from('content_reports')
        .select('id', { count: 'exact', head: true })
        .eq('target_user_id', r.target_user_id);
      if (await sendTelegram(botToken, chatId, contentMessage(r, names, count ?? 1, queueUrl))) sent++;
      else await release(admin, 'content_reports', r.id);
    }
  }

  const questions = await claim<QuestionReport>(
    admin,
    'question_reports',
    'id, question_key, language, reason, comment, prompt, options, correct_index, picked_index, app_version'
  );
  for (const r of questions) {
    const { count } = await admin
      .from('question_reports')
      .select('id', { count: 'exact', head: true })
      .eq('question_key', r.question_key)
      .eq('language', r.language)
      .eq('status', 'open');
    if (await sendTelegram(botToken, chatId, questionMessage(r, count ?? 1, queueUrl))) sent++;
    else await release(admin, 'question_reports', r.id);
  }

  return json({ sent, configured: true });
});
