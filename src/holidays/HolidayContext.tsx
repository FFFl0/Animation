import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLayoutCheck } from '../monitoring/layoutCheck';
import { HOLIDAYS, Holiday, holidayOn } from './holidays';
import { HOLIDAY_DECOR_KEY as ENABLED_KEY } from './holidayDecor';


type HolidayContextValue = {
  /** The holiday the app is dressed for now: null outside one, or with decorations off. */
  holiday: Holiday | null;
  /** The holiday by the calendar, whether or not decorations are on. */
  current: Holiday | null;
  today: Date;
  enabled: boolean;
  setEnabled: (on: boolean) => void;
};

const HolidayContext = createContext<HolidayContextValue | null>(null);

/**
 * The layout check can ask for a holiday in the address (`?holiday=halloween`)
 * to see how it looks out of season. Nothing else can.
 */
function previewHoliday(): Holiday | null {
  if (!isLayoutCheck || Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('holiday');
  return HOLIDAYS.find((h) => h.id === id) ?? null;
}

function msToMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime() + 1000;
}

export function HolidayProvider({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(() => new Date());
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ENABLED_KEY)
      .then((saved) => {
        if (saved === '0') setEnabledState(false);
      })
      .catch(() => {});
  }, []);

  // A holiday starts and ends at local midnight, and the app may be left
  // open across it or brought back days later.
  useEffect(() => {
    const timer = setTimeout(() => setToday(new Date()), msToMidnight(today));
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && new Date().toDateString() !== today.toDateString()) setToday(new Date());
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [today]);

  const setEnabled = (on: boolean) => {
    setEnabledState(on);
    AsyncStorage.setItem(ENABLED_KEY, on ? '1' : '0').catch(() => {});
  };

  const current = previewHoliday() ?? holidayOn(today);
  const value = useMemo<HolidayContextValue>(
    () => ({ holiday: enabled ? current : null, current, today, enabled, setEnabled }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, today, enabled]
  );
  return <HolidayContext.Provider value={value}>{children}</HolidayContext.Provider>;
}

const OUTSIDE: HolidayContextValue = {
  holiday: null,
  current: null,
  today: new Date(),
  enabled: false,
  setEnabled: () => {},
};

/** Outside the provider (tests, a crash screen) there is simply no holiday. */
export function useHoliday(): HolidayContextValue {
  return useContext(HolidayContext) ?? OUTSIDE;
}
