import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Thin wrapper over expo-haptics.
 *
 * Every call is fire-and-forget and swallows its rejection: haptics are pure
 * garnish, and a device without a vibration motor (or a browser, where the
 * module has no implementation at all) must never turn that into an unhandled
 * promise rejection in the middle of a quiz.
 */
function fire(run: () => Promise<void>): void {
  if (Platform.OS === 'web') return;
  run().catch(() => {});
}

/** Every button press — the lightest tick the platform offers. */
export function hapticTap(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A right answer, a level up, a friend request accepted. */
export function hapticSuccess(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A wrong answer, a failed action. */
export function hapticError(): void {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Something momentous — an achievement unlocking, the last life lost. */
export function hapticHeavy(): void {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}
