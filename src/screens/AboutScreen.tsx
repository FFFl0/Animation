import { useMemo } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { ToriiHero } from '../components/SakuraDecor';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { isSupabaseConfigured } from '../auth/supabaseClient';
import { useT } from '../i18n/strings';

const REPO_URL = 'https://github.com/FFFl0/Animation';

type Props = {
  onBack: () => void;
  onOpenPrivacy: () => void;
};

/**
 * Version, build and where the data lives. Mostly here so a bug report can
 * say which build it came from — "the latest one" is never true for long.
 */
export default function AboutScreen({ onBack, onOpenPrivacy }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();

  const version = Constants.expoConfig?.version ?? '—';
  // The build number is assigned by EAS and is what actually distinguishes
  // two installs of the same version; it is absent in Expo Go and on web.
  const build = Application.nativeBuildVersion ?? t('about.buildUnavailable');

  const rows = [
    { label: t('about.version'), value: version },
    { label: t('about.build'), value: build },
    { label: t('about.platform'), value: `${Platform.OS} ${Platform.Version}` },
    { label: t('about.sync'), value: isSupabaseConfigured ? t('about.syncOn') : t('about.syncOff') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <SoundTouchable onPress={onBack} accessibilityRole="button" style={styles.back}>
          <Text style={styles.backText}>{`‹ ${t('chat.back')}`}</Text>
        </SoundTouchable>

        <View style={styles.hero}>
          <ToriiHero size={150} accent={theme.primaryLight} ink={theme.text} />
          <Text style={styles.name}>AnimeQuiz</Text>
          <Text style={styles.tagline}>{t('about.tagline')}</Text>
        </View>

        <View style={styles.card}>
          {rows.map((row, i) => (
            <View key={row.label} style={[styles.row, i > 0 && styles.rowDivided]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </View>

        <SoundTouchable style={styles.link} onPress={onOpenPrivacy} accessibilityRole="button">
          <Icon name="lock" size={16} color={theme.primary} />
          <Text style={styles.linkText}>{t('legal.privacyTitle')}</Text>
          <Icon name="chevronRight" size={15} color={theme.textMuted} />
        </SoundTouchable>

        <SoundTouchable style={styles.link} onPress={() => Linking.openURL(REPO_URL)} accessibilityRole="link">
          <Icon name="globe" size={16} color={theme.primary} />
          <Text style={styles.linkText}>{t('about.sourceCode')}</Text>
          <Icon name="chevronRight" size={15} color={theme.textMuted} />
        </SoundTouchable>

        <Text style={styles.credits}>{t('about.credits')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
    back: { marginBottom: 4 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    hero: { alignItems: 'center', marginBottom: 22 },
    name: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginTop: 4 },
    tagline: {
      fontSize: 13,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      marginTop: 4,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 13 },
    rowDivided: { borderTopWidth: 1, borderTopColor: theme.border },
    rowLabel: { fontSize: 13, fontFamily: fontFamily('600'), color: theme.textMuted },
    rowValue: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text, flexShrink: 1 },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    linkText: { flex: 1, fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    credits: {
      fontSize: 12,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 24,
    },
  });
}
