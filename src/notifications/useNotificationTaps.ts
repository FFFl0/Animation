import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationTarget, targetOf } from './notificationRoute';

/**
 * Calls back with the screen a tapped notification asks for.
 *
 * There are two ways a tap arrives. The app was already running, and the
 * listener fires; or the tap is what started the app, in which case the
 * response is sitting there to be asked for. The second is read once on
 * mount, because it keeps being returned for the rest of the process's
 * life and would otherwise fire again on every re-render that re-ran it.
 *
 * `onOpen` has to be stable — a state setter is.
 */
export function useNotificationTaps(onOpen: (target: NotificationTarget) => void): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;

    // The tap that opened the app, if that is how it opened.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (cancelled || !response) return;
        const target = targetOf(response.notification.request.content.data);
        if (target) onOpen(target);
      })
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = targetOf(response.notification.request.content.data);
      if (target) onOpen(target);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [onOpen]);
}
