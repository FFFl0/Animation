import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { PlayerSummary } from '../friends/friendsApi';
import { levelFromStats, levelFromTotalCorrect, sumTotalCorrect } from '../data/level';
import AnimeAvatar from '../components/AnimeAvatar';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  friend: PlayerSummary;
  onBack: () => void;
  onChallenge: () => void;
};

export default function CompareScreen({ friend, onBack, onChallenge }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();

  if (!profile) return null;

  const myGames = Object.values(profile.stats).reduce((sum, s) => sum + s.gamesPlayed, 0);
  const myQuestions = Object.values(profile.stats).reduce((sum, s) => sum + s.totalQuestions, 0);
  const myCorrect = sumTotalCorrect(profile.stats);
  const myAccuracy = myQuestions > 0 ? Math.round((myCorrect / myQuestions) * 100) : 0;
  const myXp = levelFromStats(profile.stats).xp;

  const theirAccuracy = friend.totalQuestions > 0 ? Math.round((friend.totalCorrect / friend.totalQuestions) * 100) : 0;
  const theirXp = levelFromTotalCorrect(friend.totalCorrect, language).xp;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SoundTouchable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('compare.back')} style={{ marginBottom: 12 }}>
          <Text style={styles.backText}>{`‹ ${t('compare.back')}`}</Text>
        </SoundTouchable>

        <Text style={styles.title}>{t('compare.title')}</Text>
        <Text style={styles.subtitle}>{t('compare.subtitle', friend.username)}</Text>

        <View style={styles.vsRow}>
          <View style={styles.vsSide}>
            <AnimeAvatar avatar={profile.avatar} size={72} />
            <Text style={styles.vsName}>{t('compare.you')}</Text>
          </View>
          <Text style={styles.vsLabel}>{t('compare.vs')}</Text>
          <View style={styles.vsSide}>
            <AnimeAvatar avatar={friend.avatar} size={72} />
            <Text style={styles.vsName}>{friend.username}</Text>
          </View>
        </View>

        <CompareRow label={t('compare.xp')} mine={myXp} theirs={theirXp} theme={theme} styles={styles} />
        <CompareRow label={t('compare.accuracy')} mine={myAccuracy} theirs={theirAccuracy} theme={theme} styles={styles} suffix="%" />
        <CompareRow label={t('compare.quizzesCompleted')} mine={myGames} theirs={friend.totalGames} theme={theme} styles={styles} />
        <CompareRow label={t('compare.dayStreak')} mine={profile.streak.count} theirs={friend.streakCount} theme={theme} styles={styles} />

        <PillButton title={t('compare.challenge')} variant="primary" icon="⚔" onPress={onChallenge} style={{ marginTop: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function CompareRow({
  label,
  mine,
  theirs,
  suffix = '',
  theme,
  styles,
}: {
  label: string;
  mine: number;
  theirs: number;
  suffix?: string;
  theme: Theme;
  styles: Styles;
}) {
  const total = mine + theirs;
  let minePct = total > 0 ? (mine / total) * 100 : 50;
  let theirPct = total > 0 ? (theirs / total) * 100 : 50;
  // Keep the trailing side visible as a sliver instead of vanishing entirely
  // at 0 — the bar should always read as "two sides", not "one solid bar".
  const MIN_PCT = 6;
  if (total > 0 && minePct < MIN_PCT) {
    theirPct -= MIN_PCT - minePct;
    minePct = MIN_PCT;
  } else if (total > 0 && theirPct < MIN_PCT) {
    minePct -= MIN_PCT - theirPct;
    theirPct = MIN_PCT;
  }
  return (
    <View style={styles.compareRow}>
      <View style={styles.compareValuesRow}>
        <Text style={styles.compareValueMine}>{mine}{suffix}</Text>
        <Text style={styles.compareLabel}>{label}</Text>
        <Text style={styles.compareValueTheirs}>{theirs}{suffix}</Text>
      </View>
      <View style={styles.compareBarsRow}>
        <View style={[styles.compareBarFill, { width: `${minePct}%`, backgroundColor: theme.textMuted }]} />
        <View style={[styles.compareBarFill, { width: `${theirPct}%`, backgroundColor: theme.primary }]} />
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    title: { fontSize: 24, fontFamily: fontFamily('800'), color: theme.text },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginBottom: 20 },
    vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 28 },
    vsSide: { alignItems: 'center', gap: 6 },
    vsName: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text },
    vsLabel: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.primary },
    compareRow: { marginBottom: 18 },
    compareValuesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    compareValueMine: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.textMuted, width: 60 },
    compareLabel: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.textMuted, flex: 1, textAlign: 'center' },
    compareValueTheirs: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.primary, width: 60, textAlign: 'right' },
    compareBarsRow: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      backgroundColor: theme.border,
    },
    compareBarFill: { height: '100%' },
  });
}
