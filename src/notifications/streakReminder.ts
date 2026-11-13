import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Language } from '../i18n/LanguageContext';
import { PlannedReminder, REMINDER_ID_PREFIX, planStreakReminders } from './streakSchedule';

const ENABLED_KEY = 'animequiz.streakReminderEnabled';
const CHANNEL_ID = 'streak-reminder';

type Streak = { count: number; lastPlayedDate: string | null } | null;

/** 1 день, 2 дня, 5 дней. */
function daysRu(n: number): string {
  const inTeens = n % 100 >= 11 && n % 100 <= 14;
  const last = n % 10;
  if (inTeens || last === 0 || last >= 5) return `${n} дней`;
  return last === 1 ? `${n} день` : `${n} дня`;
}

const REMINDER_TEXT: Record<
  Language,
  { channelName: string; noon: (atRisk: number | null) => [string, string]; evening: (atRisk: number | null) => [string, string] }
> = {
  ru: {
    channelName: 'Напоминание о серии',
    noon: (n) => [
      '🔥 Время для квиза',
      n ? `Серия ${daysRu(n)} ждёт продолжения — сыграй раунд.` : 'Сыграй хотя бы один раунд, чтобы продлить серию.',
    ],
    evening: (n) => [
      '🔥 Не теряй серию!',
      n
        ? `Серия ${daysRu(n)} ещё не продлена. Сыграй раунд, пока она не сгорела.`
        : 'Серия ещё не продлена — сыграй раунд, пока она не сгорела.',
    ],
  },
  en: {
    channelName: 'Streak reminder',
    noon: (n) => [
      '🔥 Quiz time',
      n ? `Your ${n}-day streak is waiting — play a round.` : 'Play at least one round to keep your streak going.',
    ],
    evening: (n) => [
      "🔥 Don't lose your streak!",
      n
        ? `Your ${n}-day streak is not extended yet. Play a round before it burns out.`
        : 'Your streak is not extended yet — play a round before it burns out.',
    ],
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

/**
 * Takes back every streak reminder this app has booked, and nothing else.
 *
 * The old daily 20:00 reminder carried no identifier of ours, only its
 * `kind`, so that is matched too — it goes the first time the new ones are
 * booked.
 */
async function cancelStreakReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX) || n.content.data?.kind === 'streak')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

async function book(reminders: PlannedReminder[], lang: Language): Promise<void> {
  const text = REMINDER_TEXT[lang];
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: text.channelName,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await cancelStreakReminders();
  for (const reminder of reminders) {
    const [title, body] = text[reminder.slot](reminder.atRisk);
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title, body, data: { kind: 'streak' } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.at,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export async function setReminderEnabled(
  enabled: boolean,
  lang: Language = 'ru',
  streak: Streak = null
): Promise<{ ok: boolean; reason?: string }> {
  if (Platform.OS === 'web') {
    // expo-notifications has no local-scheduling backend on web; treat the
    // toggle as a no-op there rather than failing.
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    return { ok: true };
  }

  if (!enabled) {
    await cancelStreakReminders();
    await AsyncStorage.setItem(ENABLED_KEY, '0');
    return { ok: true };
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    await AsyncStorage.setItem(ENABLED_KEY, '0');
    return { ok: false, reason: 'permissionDenied' };
  }

  await book(planStreakReminders(new Date(), streak), lang);
  await AsyncStorage.setItem(ENABLED_KEY, '1');
  return { ok: true };
}

/**
 * Books the reminders again from what is true now: called when the app
 * comes to the front and after every round, so a day that has just been
 * played loses its reminders and the two-week window moves on.
 *
 * Asks for nothing — with the switch off, or permission taken away in the
 * phone's settings, it only clears what is there.
 */
export async function syncStreakReminders(lang: Language, streak: Streak): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!(await getReminderEnabled())) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await cancelStreakReminders();
    return;
  }
  await book(planStreakReminders(new Date(), streak), lang);
}
