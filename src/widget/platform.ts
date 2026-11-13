import { WidgetSnapshot } from './streakWidgetState';
import type { FlameAccessory } from '../holidays/holidays';

/**
 * The home-screen widget outside Android: there is none. iOS widgets are
 * a separate native extension; on web there is no home screen.
 * The Android version is platform.android.ts, which Metro picks instead.
 */
export const widgetSupported = false;

export function registerStreakWidget(): void {}

export async function updateStreakWidget(_snapshot: WidgetSnapshot, _accessory: FlameAccessory | null = null): Promise<void> {}

/** 'added': the launcher showed its prompt; 'manual': the person has to add it themselves. */
export async function pinStreakWidget(): Promise<'added' | 'manual'> {
  return 'manual';
}
