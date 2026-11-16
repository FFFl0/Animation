import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * What the player has been asked about lately, oldest first — the subjects
 * (Question.subject) of the last several rounds, so the next one can ask
 * about somebody new.
 *
 * Kept in memory for the round being built right now and copied to storage
 * so it survives the app closing; reading it never waits on storage, and
 * losing it costs nothing worse than an ordinary random round.
 */
const KEY = 'animequiz.recentSubjects';

/**
 * How many to remember: about eight rounds' worth. Enough that a run of
 * rounds keeps finding new faces, few enough that a small pool (one
 * difficulty tier) still turns over instead of being all "seen".
 */
export const RECENT_LIMIT = 80;

let recent: string[] = [];
let loaded = false;

/** Reads what was saved, once. Safe to call any number of times. */
export async function loadRecentSubjects(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(saved)) {
      // Anything already noted this session is newer than what was saved.
      recent = remember(saved.filter((s): s is string => typeof s === 'string'), recent);
    }
  } catch {
    // An empty memory is a fine memory.
  }
}

export function recentSubjects(): string[] {
  return recent;
}

/**
 * The list after these subjects have just been asked: they move to the
 * newest end (once each), and the oldest fall off past the limit.
 */
export function remember(list: string[], asked: string[], limit = RECENT_LIMIT): string[] {
  const fresh = new Set(asked);
  const kept = list.filter((s) => !fresh.has(s));
  return [...kept, ...Array.from(fresh)].slice(-limit);
}

export function noteAsked(subjects: string[]): void {
  recent = remember(recent, subjects);
  AsyncStorage.setItem(KEY, JSON.stringify(recent)).catch(() => {});
}
