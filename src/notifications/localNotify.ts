import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/** Presents an immediate local notification (no server push involved — this
 * only fires while the JS runtime is alive, same constraint as the streak
 * reminder). Silently does nothing on web or without notification
 * permission, rather than prompting mid-flow for something this optional. */
export async function presentLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
}
