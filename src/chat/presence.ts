import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';

/** How long a "typing" ping keeps the indicator up before it fades by itself.
 * Longer than the throttle below, so a steady typist never flickers. */
const TYPING_TTL_MS = 4500;
/** Pings are throttled rather than sent per keystroke — one every couple of
 * seconds is enough to hold the indicator up, and costs one tiny broadcast. */
const TYPING_THROTTLE_MS = 2000;

/** How fresh `last_seen_at` has to be to read as "online right now". The
 * heartbeat below runs well inside this, so a live app is always within it. */
const ONLINE_WINDOW_MS = 75_000;
const HEARTBEAT_MS = 45_000;

/**
 * Who is typing in one conversation, and a way to say that you are.
 *
 * Carried on a Realtime broadcast channel instead of a table: "typing" is
 * true for two seconds and interesting to nobody afterwards, so writing it
 * to Postgres would mean a row per keystroke for state that is never read
 * again. Nothing is persisted — a device that goes away simply stops pinging
 * and its entry expires.
 *
 * `key` identifies the conversation (a friend id, or a group id); both sides
 * of a direct chat have to derive the same one, which is why the caller
 * passes it rather than having it built from "me and them" here.
 */
export function useTyping(key: string, meId: string, myName: string) {
  const [typing, setTyping] = useState<Map<string, { name: string; at: number }>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !key || !meId) return;

    // Shared topic on purpose, unlike the postgres_changes channels, which
    // each get a unique one: broadcast only reaches people on the same topic,
    // so both sides of a conversation have to name it the same way.
    //
    // self: false — the sender already knows they are typing, and echoing it
    // back would put the indicator up in their own header.
    const channel = supabase.channel(`typing-${key}`, { config: { broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const ping = payload as { userId?: string; name?: string } | null;
        if (!ping?.userId || ping.userId === meId) return;
        setTyping((prev) => new Map(prev).set(ping.userId!, { name: ping.name ?? '', at: Date.now() }));
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase!.removeChannel(channel);
    };
  }, [key, meId]);

  // Expiry is swept on a timer rather than scheduled per ping: one interval
  // that only exists while somebody is typing beats a timeout per sender.
  useEffect(() => {
    if (typing.size === 0) return;
    const timer = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next = new Map([...prev].filter(([, v]) => now - v.at < TYPING_TTL_MS));
        return next.size === prev.size ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [typing.size]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_THROTTLE_MS) return;
    lastSentRef.current = now;
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: meId, name: myName } });
  }, [meId, myName]);

  const typingNames = useMemo(() => [...typing.values()].map((v) => v.name).filter(Boolean), [typing]);

  return { typingNames, notifyTyping };
}

/** Marks the current user as present. RLS already limits profile updates to
 * your own row, so this needs no server function. */
export async function touchLastSeen(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId);
}

/**
 * Keeps `last_seen_at` fresh while the app is open, so other people see
 * "online" instead of a stale timestamp. Pauses in the background: a phone in
 * a pocket is not online, and a sleeping device should not be writing rows.
 */
export function useLastSeenHeartbeat(userId: string | null) {
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = () => {
      void touchLastSeen(userId);
    };

    const start = () => {
      if (timer) return;
      beat();
      timer = setInterval(beat, HEARTBEAT_MS);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));

    return () => {
      stop();
      sub.remove();
    };
  }, [userId]);
}

/** The other side's presence stamp, read through the same safe view that
 * already serves names and avatars — `profiles` itself is readable only for
 * your own row. */
export async function fetchLastSeen(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  const { data } = await supabase.from('leaderboard').select('last_seen_at').eq('id', userId).maybeSingle();
  return (data as { last_seen_at: string | null } | null)?.last_seen_at ?? null;
}

export type Presence = { online: boolean; lastSeenAt: string | null };

/**
 * Keeps one person's presence current while their chat is open.
 *
 * Polled rather than subscribed: a Realtime subscription on `profiles` would
 * deliver every heartbeat of every player the publication carries, which is a
 * lot of traffic to learn one thing about one person. The extra `tick` state
 * exists because presence also goes stale on its own — nobody writes a row
 * when somebody stops being online, so the window has to be re-measured as
 * time passes, not only when the stamp changes.
 */
export function usePeerPresence(userId: string, initialLastSeen: string | null): Presence {
  const [lastSeen, setLastSeen] = useState<string | null>(initialLastSeen);
  const [, setTick] = useState(0);

  useEffect(() => {
    setLastSeen(initialLastSeen);
  }, [userId, initialLastSeen]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let alive = true;
    const poll = () => {
      void fetchLastSeen(userId).then((value) => {
        if (alive && value) setLastSeen(value);
      });
    };
    poll();
    const timer = setInterval(() => {
      poll();
      setTick((n) => n + 1);
    }, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [userId]);

  return presenceOf(lastSeen);
}

/** Turns a raw timestamp into the two cases a header shows: online now, or
 * last seen at some point. Kept out of the components so both the chat
 * header and the chat list read it the same way. */
export function presenceOf(lastSeenAt: string | null | undefined, now = Date.now()): Presence {
  if (!lastSeenAt) return { online: false, lastSeenAt: null };
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return { online: false, lastSeenAt: null };
  return { online: now - seen < ONLINE_WINDOW_MS, lastSeenAt };
}
