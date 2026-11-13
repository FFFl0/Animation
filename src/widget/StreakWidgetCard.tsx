import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { isLayoutCheck } from '../monitoring/layoutCheck';
import { pinStreakWidget, widgetSupported } from './platform';

const PREVIEW = require('../../assets/widget-preview/streak.png');

/**
 * The offer to put the streak widget on the home screen, on the profile.
 *
 * The button asks the launcher to place it; where the launcher cannot, or
 * after it has asked, the card says how to do it by hand, because the
 * system prompt is easy to dismiss and nothing comes back to say whether
 * the widget was actually added.
 */
export default function StreakWidgetCard() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [note, setNote] = useState<'added' | 'manual' | null>(null);

  if (!widgetSupported && !isLayoutCheck) return null;

  const add = async () => setNote(await pinStreakWidget());

  return (
    <View style={styles.card} testID="streak-widget-card">
      <View style={styles.top}>
        <Image source={PREVIEW} style={styles.preview} accessibilityIgnoresInvertColors />
        <View style={styles.text}>
          <Text style={styles.title}>{t('profile.widget.title')}</Text>
          <Text style={styles.hint}>{t('profile.widget.hint')}</Text>
        </View>
      </View>
      <SoundTouchable style={styles.button} onPress={() => void add()} accessibilityRole="button" testID="streak-widget-add">
        <Text style={styles.buttonText}>{t('profile.widget.add')}</Text>
      </SoundTouchable>
      {note && <Text style={styles.note}>{t(note === 'added' ? 'profile.widget.confirm' : 'profile.widget.manual')}</Text>}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
    },
    top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    preview: { width: 72, height: 72, borderRadius: 16 },
    text: { flex: 1 },
    title: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily('700'), color: theme.text },
    hint: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    button: {
      marginTop: 14,
      paddingVertical: 11,
      borderRadius: radius.pill,
      backgroundColor: theme.primary,
      alignItems: 'center',
    },
    buttonText: { fontSize: 14, fontFamily: fontFamily('800'), color: theme.onPrimary },
    note: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 10 },
  });
}
