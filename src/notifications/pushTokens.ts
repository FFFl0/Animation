import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { Language } from '../i18n/LanguageContext';
import { reportHandledError } from '../monitoring/sentry';
import { PushCategory } from './notificationSettings';

/**
 * Whether the phone lets this app notify at all.
 *
 * `blocked` is a refusal the app can no longer ask about — only the phone's
 * own settings can undo it. `unsupported` is the web, which has nothing to
 * allow.
 */
export type PushPermission = 'granted' | 'askable' | 'blocked' | 'unsupported';

export async function getPushPermission(): Promise<PushPermission> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    const status = await Notifications.getPermissionsAsync();
    if (status.granted) return 'granted';
    return status.canAskAgain ? 'askable' : 'blocked';
  } catch {
    return 'unsupported';
  }
}

/**
 * Registers this device to receive notifications while the app is closed.
 *
 * A row per device rather than one per account: somebody signed in on a phone
 * and a tablet should be reachable on both. Permission is asked for once and
 * a refusal is final — the app works without it, so there is nothing to nag
 * about.
 *
 * `muted` is this device's switched-off categories. It travels with the
 * token because that is the row the server reads when it decides who to
 * send to.
 */
export async function registerPushToken(
  userId: string,
  language: Language,
  muted: PushCategory[] = []
): Promise<void> {
  // Expo Go has no push credentials of its own since SDK 53, and the web has
  // no concept of this at all.
  if (Platform.OS === 'web' || !isSupabaseConfigured || !supabase) return;

  try {
    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.granted || (existing.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
    if (!granted) return;

    // The project id is what ties a token to this app on Expo's servers; it
    // is written into app.json by `eas init`.
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const row = {
      user_id: userId,
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      language,
      updated_at: new Date().toISOString(),
    };
    const saved = await supabase.from('push_tokens').upsert({ ...row, muted }, { onConflict: 'user_id,token' });
    if (!saved.error) return;

    // A database that has not been given the `muted` column yet refuses the
    // whole row. Registering without it keeps notifications arriving, which
    // is what that database did before the switches existed.
    const plain = await supabase.from('push_tokens').upsert(row, { onConflict: 'user_id,token' });
    if (plain.error) throw plain.error;
  } catch (error) {
    // A device that cannot be registered simply gets no pushes; nothing else
    // in the app depends on this succeeding.
    reportHandledError(error, { where: 'register push token' });
  }
}

/** Called on sign-out so the next person on this device doesn't get the
 * previous one's notifications. */
export async function unregisterPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !isSupabaseConfigured || !supabase) return;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
  } catch {
    // Nothing to do: a token we failed to remove is cleaned up by the send
    // function the first time Expo reports it as dead.
  }
}

export type PushKind = 'friendRequest' | 'battleInvite';

/**
 * Asks the server to notify somebody. The text is not ours to choose — the
 * Edge Function composes it in the recipient's language and refuses outright
 * unless the invitation being announced really exists.
 */
export async function sendPush(kind: PushKind, toUserId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await supabase.functions.invoke('send-push', { body: { kind, toUserId } });
  } catch (error) {
    // The in-app banner and the realtime subscription still work; a push that
    // didn't go out is not worth failing the action the player took.
    reportHandledError(error, { where: 'send push', kind });
  }
}
