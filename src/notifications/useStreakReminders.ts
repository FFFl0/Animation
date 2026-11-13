import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Language } from '../i18n/LanguageContext';
import { syncStreakReminders } from './streakReminder';

/**
 * Keeps the booked streak reminders in step with the streak: again after
 * every round (the streak changes) and whenever the app comes back to the
 * front (a day may have passed while it was away).
 */
export function useStreakReminders(
  streak: { count: number; lastPlayedDate: string | null } | null | undefined,
  language: Language
): void {
  const count = streak?.count ?? 0;
  const lastPlayedDate = streak?.lastPlayedDate ?? null;
  useEffect(() => {
    if (!streak) return;
    const sync = () => {
      syncStreakReminders(language, { count, lastPlayedDate }).catch(() => {
        // Reminders are a courtesy; whatever was booked before still stands.
      });
    };
    sync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, lastPlayedDate, language, !!streak]);
}
