import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';
import { isSupabaseConfigured } from '../auth/supabaseClient';
import { isLayoutCheck } from '../monitoring/layoutCheck';
import { useNotifications } from './NotificationsContext';
import { useAuth } from '../auth/AuthContext';
import { PUSH_CATEGORIES } from './notificationSettings';
import { PushPermission, getPushPermission } from './pushTokens';
import { getReminderEnabled, setReminderEnabled } from './streakReminder';

/**
 * The notification switches on the profile page.
 *
 * One row per thing the app can interrupt with, each saying what it is in
 * a line, so nobody has to switch something off to find out what it was.
 * The streak reminder sits with the rest although the phone schedules it
 * by itself: to the person reading the list it is one more notification.
 *
 * When the phone itself refuses the app, the switches are still shown —
 * they are remembered either way — but the page says plainly that nothing
 * will arrive until that is changed, and offers the way there.
 */
export default function NotificationSettings() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { pushSettings, setPushCategory } = useNotifications();
  const { profile } = useAuth();
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PushPermission>('unsupported');

  const readPermission = useCallback(() => {
    void getPushPermission().then(setPermission);
  }, []);

  useEffect(() => {
    void getReminderEnabled().then(setReminderOn);
    readPermission();
    // Coming back from the phone's settings is the moment the answer changes.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') readPermission();
    });
    return () => subscription.remove();
  }, [readPermission]);

  const toggleReminder = async () => {
    setReminderError(null);
    const next = !reminderOn;
    const result = await setReminderEnabled(next, language, profile?.streak ?? null);
    if (result.ok) setReminderOn(next);
    else {
      setReminderError(
        t(result.reason === 'permissionDenied' ? 'profile.reminderPermissionDenied' : 'profile.reminderFallbackError')
      );
    }
    readPermission();
  };

  const rows = [
    { key: 'streak', on: reminderOn, toggle: toggleReminder },
    // Friends, battles and the tournament only exist with a server behind them.
    ...(isSupabaseConfigured || isLayoutCheck
      ? PUSH_CATEGORIES.map((category) => ({
          key: category,
          on: pushSettings[category],
          toggle: () => setPushCategory(category, !pushSettings[category]),
        }))
      : []),
  ];

  return (
    <View>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <SoundTouchable
            key={row.key}
            style={[styles.row, i > 0 && styles.rowDivider]}
            onPress={row.toggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: row.on }}
            aria-checked={row.on}
            accessibilityLabel={t(`profile.notify.${row.key}`)}
            testID={`notify-${row.key}`}
          >
            <View style={styles.rowText}>
              <Text style={styles.label}>{t(`profile.notify.${row.key}`)}</Text>
              <Text style={styles.hint}>{t(`profile.notify.${row.key}Hint`)}</Text>
            </View>
            <View style={[styles.track, row.on && styles.trackOn]}>
              <View style={[styles.knob, row.on && styles.knobOn]} />
            </View>
          </SoundTouchable>
        ))}
      </View>

      {reminderError && <Text style={styles.error}>{reminderError}</Text>}

      {permission === 'blocked' && (
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>{t('profile.notify.blocked')}</Text>
          <SoundTouchable onPress={() => void Linking.openSettings()} accessibilityRole="button">
            <Text style={styles.blockedLink}>{t('profile.notify.openSettings')}</Text>
          </SoundTouchable>
        </View>
      )}
    </View>
  );
}

const TRACK_WIDTH = 44;
const KNOB = 20;
const TRACK_PAD = 3;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingHorizontal: 16,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
    rowDivider: { borderTopWidth: 1, borderTopColor: theme.border },
    rowText: { flex: 1 },
    label: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily('700'), color: theme.text },
    hint: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    track: {
      width: TRACK_WIDTH,
      height: KNOB + TRACK_PAD * 2,
      borderRadius: radius.pill,
      padding: TRACK_PAD,
      backgroundColor: theme.border,
    },
    trackOn: { backgroundColor: theme.primary },
    knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: theme.card },
    knobOn: { marginLeft: TRACK_WIDTH - KNOB - TRACK_PAD * 2, backgroundColor: theme.onPrimary },
    error: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.danger, marginTop: 8 },
    blocked: {
      marginTop: 10,
      padding: 14,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    blockedText: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.textMuted },
    blockedLink: { fontSize: 13, fontFamily: fontFamily('800'), color: theme.primary, marginTop: 8 },
  });
}
