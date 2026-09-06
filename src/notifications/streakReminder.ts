import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const ENABLED_KEY = 'animequiz.streakReminderEnabled';
const REMINDER_HOUR = 20; // 20:00 local time

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function getReminderEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

export async function setReminderEnabled(enabled: boolean): Promise<{ ok: boolean; reason?: string }> {
  if (Platform.OS === 'web') {
    // expo-notifications has no local-scheduling backend on web; treat the
    // toggle as a no-op there rather than failing.
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    return { ok: true };
  }

  if (!enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.setItem(ENABLED_KEY, '0');
    return { ok: true };
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    await AsyncStorage.setItem(ENABLED_KEY, '0');
    return { ok: false, reason: 'Уведомления запрещены в настройках устройства' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('streak-reminder', {
      name: 'Напоминание о серии',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔥 Не теряй серию!',
      body: 'Сыграй хотя бы один раунд сегодня, чтобы серия ответов не сгорела.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: 0,
    },
  });

  await AsyncStorage.setItem(ENABLED_KEY, '1');
  return { ok: true };
}
