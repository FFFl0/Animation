import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { PlayerSummary } from '../friends/friendsApi';
import { levelFromStats, levelFromTotalCorrect, sumTotalCorrect } from '../data/level';
import AnimeAvatar from '../components/AnimeAvatar';
import ProgressBar from '../components/ProgressBar';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';

type Props = {
  friend: PlayerSummary;
  onBack: () => void;
  onChallenge: () => void;
};

export default function CompareScreen({ friend, onBack, onChallenge }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!profile) return null;

  const myGames = Object.values(profile.stats).reduce((sum, s) => sum + s.gamesPlayed, 0);
  const myQuestions = Object.values(profile.stats).reduce((sum, s) => sum + s.totalQuestions, 0);
  const myCorrect = sumTotalCorrect(profile.stats);
  const myAccuracy = myQuestions > 0 ? Math.round((myCorrect / myQuestions) * 100) : 0;
  const myXp = levelFromStats(profile.stats).xp;

  const theirAccuracy = friend.totalQuestions > 0 ? Math.round((friend.totalCorrect / friend.totalQuestions) * 100) : 0;
  const theirXp = levelFromTotalCorrect(friend.totalCorrect).xp;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SoundTouchable onPress={onBack} accessibilityRole="button" accessibilityLabel="Назад" style={{ marginBottom: 12 }}>
          <Text style={styles.backText}>‹ Назад</Text>
        </SoundTouchable>

        <Text style={styles.title}>Сравнение</Text>
        <Text style={styles.subtitle}>Ты и {friend.username}</Text>

        <View style={styles.vsRow}>
          <View style={styles.vsSide}>
            <AnimeAvatar avatar={profile.avatar} size={72} />
            <Text style={styles.vsName}>Ты</Text>
          </View>
          <Text style={styles.vsLabel}>VS</Text>
          <View style={styles.vsSide}>
            <AnimeAvatar avatar={friend.avatar} size={72} />
            <Text style={styles.vsName}>{friend.username}</Text>
          </View>
        </View>

        <CompareRow label="XP" mine={myXp} theirs={theirXp} theme={theme} styles={styles} />
        <CompareRow label="Точность" mine={myAccuracy} theirs={theirAccuracy} theme={theme} styles={styles} suffix="%" />
        <CompareRow label="Пройдено квизов" mine={myGames} theirs={friend.totalGames} theme={theme} styles={styles} />
        <CompareRow label="Серия дней" mine={profile.streak.count} theirs={friend.streakCount} theme={theme} styles={styles} />

        <PillButton title="Бросить вызов" variant="primary" icon="⚔" onPress={onChallenge} style={{ marginTop: 20 }} />
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
  const max = Math.max(mine, theirs, 1);
  return (
    <View style={styles.compareRow}>
      <View style={styles.compareValuesRow}>
        <Text style={styles.compareValueMine}>{mine}{suffix}</Text>
        <Text style={styles.compareLabel}>{label}</Text>
        <Text style={styles.compareValueTheirs}>{theirs}{suffix}</Text>
      </View>
      <View style={styles.compareBarsRow}>
        <View style={{ flex: 1, transform: [{ scaleX: -1 }] }}>
          <ProgressBar progress={mine / max} color={theme.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <ProgressBar progress={theirs / max} color={theme.primary} />
        </View>
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
    compareBarsRow: { flexDirection: 'row', gap: 4 },
  });
}
