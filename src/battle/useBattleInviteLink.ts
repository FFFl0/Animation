import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { parseBattleInviteUrl } from './battleLink';

/**
 * Calls back with a room code whenever the app is opened by a battle invite
 * link — both the link that launched it from cold and any that arrive while
 * it is already running.
 *
 * The callback is kept in a ref so the listener is attached once: re-running
 * it on every render would mean missing a link that lands between a
 * teardown and the next attach. Links that are not invites are ignored
 * rather than reported, because password recovery and the Google sign-in
 * callback come through this same event.
 */
export function useBattleInviteLink(onInvite: (roomCode: string) => void): void {
  const callback = useRef(onInvite);
  callback.current = onInvite;

  useEffect(() => {
    let cancelled = false;

    const handle = (url: string | null) => {
      if (cancelled || !url) return;
      const code = parseBattleInviteUrl(url);
      if (code) callback.current(code);
    };

    Linking.getInitialURL().then(handle).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => handle(url));

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
