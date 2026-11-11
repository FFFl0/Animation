import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { useOtaUpdate } from './ota';

/**
 * "An update is ready" — shown on the home screen and nowhere else.
 *
 * Home is the one place where nothing is in progress, so a restart from
 * here costs the player a second and loses them nothing. The update would
 * arrive anyway the next time the app is started from cold; this is only
 * for somebody who would rather have it now.
 */
export default function UpdateBanner() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { ready, apply } = useOtaUpdate();

  if (!ready) return null;

  return (
    <View style={styles.card}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{t('update.readyTitle')}</Text>
        <Text style={styles.text}>{t('update.readyText')}</Text>
      </View>
      <SoundTouchable style={styles.button} onPress={apply} accessibilityRole="button" testID="update-apply">
        <Text style={styles.buttonText}>{t('update.restart')}</Text>
      </SoundTouchable>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
      padding: 14,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    textWrap: { flex: 1 },
    title: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily('800'), color: theme.text },
    text: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    button: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: theme.primary },
    buttonText: { fontSize: 13, lineHeight: 17, fontFamily: fontFamily('800'), color: theme.onPrimary },
  });
}
