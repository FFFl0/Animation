import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationKind } from './notificationRoute';

/**
 * What a player can switch off, and what each switch covers.
 *
 * The switches are per device, like the phone's own notification settings:
 * they are kept here and copied onto this device's row in `push_tokens`,
 * where the server reads them before it sends. Nothing is stored against
 * the account, so muting the tablet does not silence the phone.
 *
 * The streak reminder is not in this list. It is scheduled by the phone
 * itself and never passes through the server — see streakReminder.
 */
export const PUSH_CATEGORIES = ['friends', 'battles', 'tournament'] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

export type PushSettings = Record<PushCategory, boolean>;

/** Everything on: a notice nobody asked to stop is one they still want. */
export const ALL_ON: PushSettings = { friends: true, battles: true, tournament: true };

/** Which switch a notification answers to. The streak reminder has its own. */
export const CATEGORY_OF_KIND: Record<Exclude<NotificationKind, 'streak'>, PushCategory> = {
  friendRequest: 'friends',
  battleInvite: 'battles',
  tournamentSignups: 'tournament',
  tournamentStarted: 'tournament',
};

/** Whether a notification of this kind may be shown on this device. */
export function allows(settings: PushSettings, kind: keyof typeof CATEGORY_OF_KIND): boolean {
  return settings[CATEGORY_OF_KIND[kind]];
}

/** The categories switched off, in the order the server's column lists them. */
export function mutedCategories(settings: PushSettings): PushCategory[] {
  return PUSH_CATEGORIES.filter((category) => !settings[category]);
}

/**
 * Reads whatever was saved, keeping only what this version understands.
 *
 * A category that is missing counts as on — that is what it was before the
 * switch existed, and what a category added later should be for somebody
 * who saved their settings before it did.
 */
export function parseSettings(raw: unknown): PushSettings {
  const saved = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const settings = { ...ALL_ON };
  for (const category of PUSH_CATEGORIES) {
    if (saved[category] === false) settings[category] = false;
  }
  return settings;
}

const KEY = 'animequiz.pushSettings';

export async function loadPushSettings(): Promise<PushSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return parseSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...ALL_ON };
  }
}

export async function savePushSettings(settings: PushSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // The switch still holds until the app is closed; the server copy is
    // written separately.
  }
}
