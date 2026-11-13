import AsyncStorage from '@react-native-async-storage/async-storage';

/** Where the "holiday decorations" switch is kept. */
export const HOLIDAY_DECOR_KEY = 'animequiz.holidayDecor';

/**
 * Whether decorations are on, read straight from storage — for the widget,
 * which is drawn with the app closed and no provider to ask.
 */
export async function holidayDecorEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HOLIDAY_DECOR_KEY)) !== '0';
  } catch {
    return true;
  }
}
