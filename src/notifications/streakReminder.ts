import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Language } from '../i18n/LanguageContext';

const ENABLED_KEY = 'animequiz.streakReminderEnabled';
const REMINDER_HOUR = 20; // 20:00 local time

const REMINDER_TEXT: Record<Language, { channelName: string; title: string; body: string }> = {
  ru: {
    channelName: 'Напоминание о серии',
    title: '🔥 Не теряй серию!',
    body: 'Сыграй хотя бы один раунд сегодня, чтобы серия ответов не сгорела.',
  },
  en: {
    channelName: 'Streak reminder',
    title: "🔥 Don't lose your streak!",
    body: 'Play at least one round today to keep your answer streak alive.',
  },
};

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

export async function setReminderEnabled(enabled: boolean, lang: Language = 'ru'): Promise<{ ok: boolean; reason?: string }> {
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
    return { ok: false, reason: 'permissionDenied' };
  }

  const text = REMINDER_TEXT[lang];

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('streak-reminder', {
      name: text.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: text.title,
      body: text.body,
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
