import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerWidgetTaskHandler, requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';
import { SNAPSHOT_KEY, WIDGET_NAME, WidgetSnapshot } from './streakWidgetState';
import type { FlameAccessory } from '../holidays/holidays';
import { renderStreakWidget, widgetTaskHandler } from './widgetTaskHandler';

export const widgetSupported = true;

/** Called once from index.ts, so Android can redraw the widget with the app closed. */
export function registerStreakWidget(): void {
  registerWidgetTaskHandler(widgetTaskHandler);
}

/**
 * Leaves the streak where the widget can find it, and redraws every copy
 * of the widget on the home screen now rather than at the next half hour.
 */
export async function updateStreakWidget(snapshot: WidgetSnapshot, accessory: FlameAccessory | null = null): Promise<void> {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info) => renderStreakWidget(snapshot, info.width, info.height, accessory),
  });
}

/**
 * Asks the launcher to put the widget on the home screen (Android 8+, and
 * only launchers that support it — most do). Otherwise the person adds it
 * from the launcher's widget list, which the caller explains.
 */
export async function pinStreakWidget(): Promise<'added' | 'manual'> {
  try {
    return (await requestPinWidget({ widgetName: WIDGET_NAME })) ? 'added' : 'manual';
  } catch {
    return 'manual';
  }
}
