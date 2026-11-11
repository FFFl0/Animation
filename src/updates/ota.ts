import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * Over-the-air updates: a new JavaScript bundle fetched by an installed
 * build, without a new build going through the store.
 *
 * What the library does by itself, with nothing here: on every cold start
 * it launches the newest bundle already on the phone, then checks for a
 * newer one in the background and downloads it for the *next* cold start.
 * A phone keeps an app alive for days, though, so "the next cold start"
 * can be a long way off. This module adds the two things that shorten it:
 * a check when the app comes back to the foreground, and a way to tell the
 * player an update is ready and restart into it when they say so.
 *
 * It never restarts by itself. A round, a tournament game or a half-typed
 * message would be lost, and nothing in an update is urgent enough for that.
 */

type UpdatesModule = typeof import('expo-updates');

// Required rather than imported: the native half is absent in Expo Go and
// under Jest, and a missing optional feature must not stop the app loading.
let Updates: UpdatesModule | null = null;
try {
  Updates = require('expo-updates') as UpdatesModule;
} catch {
  Updates = null;
}

/** Only a real build can be updated: not the web, not a dev server. */
export const otaEnabled = Platform.OS !== 'web' && !__DEV__ && !!Updates?.isEnabled;

/** No more often than this, however many times the app is brought forward. */
export const MIN_CHECK_GAP_MS = 30 * 60 * 1000;

/** Whether enough time has passed since the last look at the server. */
export function dueForCheck(now: number, lastCheck: number): boolean {
  return now - lastCheck >= MIN_CHECK_GAP_MS;
}

/** Looks for a newer bundle and downloads it. Quiet on failure: being
 * offline is the common reason, and the next check will be along. */
async function fetchIfAvailable(): Promise<void> {
  if (!Updates) return;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) await Updates.fetchUpdateAsync();
  } catch {
    // Nothing to do — see above.
  }
}

const IDLE = { ready: false, apply: () => {} };

/**
 * Whether a downloaded update is waiting, and the way to restart into it.
 *
 * `ready` turns true whoever downloaded it — the launch check the library
 * runs or the foreground check started here — because both report through
 * the same native state.
 */
export function useOtaUpdate(): { ready: boolean; apply: () => void } {
  // `otaEnabled` is fixed for the life of the process, so the hooks below
  // are called on every render or on none.
  if (!otaEnabled || !Updates) return IDLE;
  const updates = Updates;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isUpdatePending } = updates.useUpdates();

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    // The library has just checked at launch; start counting from there.
    let lastCheck = Date.now();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !dueForCheck(Date.now(), lastCheck)) return;
      lastCheck = Date.now();
      void fetchIfAvailable();
    });
    return () => subscription.remove();
  }, []);

  return {
    ready: isUpdatePending,
    apply: () => {
      void updates.reloadAsync().catch(() => {});
    },
  };
}

export type OtaInfo = {
  /** True while the app is still running the bundle it was built with. */
  embedded: boolean;
  /** When the running bundle was published. */
  publishedAt: Date | null;
  /** Its id, shortened to what fits in a bug report. */
  shortId: string | null;
  channel: string | null;
};

/** What is running right now, or null where updates do not apply. */
export function otaInfo(): OtaInfo | null {
  if (!otaEnabled || !Updates) return null;
  return {
    embedded: Updates.isEmbeddedLaunch,
    publishedAt: Updates.createdAt,
    shortId: Updates.updateId ? Updates.updateId.slice(0, 8) : null,
    channel: Updates.channel,
  };
}
