import { useEffect } from 'react';
import { Language } from '../i18n/LanguageContext';
import { updateStreakWidget, widgetSupported } from './platform';
import { useHoliday } from '../holidays/HolidayContext';

/**
 * Keeps the home-screen widget in step with the streak: after every round,
 * when a freeze is bought or spent (it decides "saved by a freeze" against
 * "lost"), and when the language changes.
 */
export function useStreakWidget(
  streak: { count: number; lastPlayedDate: string | null } | null | undefined,
  freezes: number,
  language: Language
): void {
  const count = streak?.count ?? 0;
  const lastPlayedDate = streak?.lastPlayedDate ?? null;
  // The hat goes on and comes off with the holiday and the switch.
  const accessory = useHoliday().holiday?.accessory ?? null;
  useEffect(() => {
    if (!widgetSupported || !streak) return;
    updateStreakWidget({ count, lastPlayedDate, freezes, language }, accessory).catch(() => {
      // The widget keeps its last picture; the next redraw tries again.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, lastPlayedDate, freezes, language, accessory, !!streak]);
}
