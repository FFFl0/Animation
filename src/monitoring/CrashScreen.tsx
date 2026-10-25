import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import SoundTouchable from '../sound/SoundTouchable';
import Icon from '../components/Icon';
import { useT } from '../i18n/strings';
import { isCrashReportingEnabled } from './sentry';

type Props = {
  error: Error;
  onRetry: () => void;
};

/**
 * What a player sees instead of the app disappearing.
 *
 * Deliberately plain: it says what happened, what it means for their
 * progress, and offers the one action that helps. The error text itself is
 * only shown in development — to a player it is noise, and the same text has
 * already gone to the crash report, where it is useful.
 */
export default function CrashScreen({ error, onRetry }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Icon name="heartOutline" size={34} color={theme.primary} />
        </View>

        <Text style={styles.title}>{t('crash.title')}</Text>
        <Text style={styles.text}>{t('crash.body')}</Text>
        <Text style={styles.text}>{t('crash.progressSafe')}</Text>

        <SoundTouchable style={styles.button} onPress={onRetry} accessibilityRole="button">
          <Icon name="arrowPath" size={17} color={theme.onPrimary} />
          <Text style={styles.buttonText}>{t('crash.retry')}</Text>
        </SoundTouchable>

        <Text style={styles.note}>
          {isCrashReportingEnabled ? t('crash.reportSent') : t('crash.reportOff')}
        </Text>

        {__DEV__ && (
          <View style={styles.devBox}>
            <Text style={styles.devTitle}>{error.name}</Text>
            <Text style={styles.devText}>{error.message}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
    badge: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    title: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text, textAlign: 'center' },
    text: {
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 14,
      backgroundColor: theme.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 26,
      paddingVertical: 14,
    },
    buttonText: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.onPrimary },
    note: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', marginTop: 8 },
    devBox: {
      marginTop: 22,
      alignSelf: 'stretch',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.md,
      padding: 14,
      gap: 6,
    },
    devTitle: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.danger },
    devText: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.text },
  });
}
