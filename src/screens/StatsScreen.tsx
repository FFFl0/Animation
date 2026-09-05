import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES } from '../data/categories';
import { TIERS } from '../data/difficulty';
import { GAME_MODES } from '../data/modes';
import { categoryStatsKey, modeStatsKey } from '../quiz/statsKey';
import { ModeStat } from '../auth/types';
import Icon from '../components/Icon';

function sumStats(stats: ModeStat[]): ModeStat {
  return stats.reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      bestScore: Math.max(acc.bestScore, s.bestScore),
      totalCorrect: acc.totalCorrect + s.totalCorrect,
      totalQuestions: acc.totalQuestions + s.totalQuestions,
    }),
    { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 }
  );
}

export default function StatsScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!profile) return null;

  const allStats = Object.values(profile.stats);
  const overall = sumStats(allStats);
  const overallAccuracy = overall.totalQuestions > 0 ? Math.round((overall.totalCorrect / overall.totalQuestions) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Статистика</Text>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{overall.gamesPlayed}</Text>
            <Text style={styles.overviewLabel}>Игр сыграно</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{overallAccuracy}%</Text>
            <Text style={styles.overviewLabel}>Точность</Text>
          </View>
          <View style={styles.overviewCard}>
            <View style={styles.overviewStreakRow}>
              <Icon name="flame" size={16} color={theme.primary} />
              <Text style={styles.overviewValue}>{profile.streak.count}</Text>
            </View>
            <Text style={styles.overviewLabel}>Серия дней</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>По категориям</Text>
        {CATEGORIES.map((cat) => {
          const keys = cat.hardOnly || cat.id === 'mixed'
            ? [categoryStatsKey(cat.id)]
            : TIERS.map((t) => categoryStatsKey(cat.id, t.id));
          const stat = sumStats(keys.map((k) => profile.stats[k] ?? { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 }));
          const accuracy = stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : 0;

          return (
            <View key={cat.id} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: cat.colorBg }]}>
                <Icon name={cat.icon} size={16} color={cat.color} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{cat.title}</Text>
                <Text style={styles.rowSub}>{stat.gamesPlayed} игр · точность {accuracy}%</Text>
              </View>
              <Text style={styles.rowBest}>{stat.bestScore}</Text>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>По режимам</Text>
        {GAME_MODES.map((mode) => {
          const stat = profile.stats[modeStatsKey(mode.id)] ?? { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };
          const accuracy = stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : 0;

          return (
            <View key={mode.id} style={styles.row}>
              <View style={styles.rowIconPlain}>
                <Icon name={mode.icon} size={16} color={theme.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{mode.title}</Text>
                <Text style={styles.rowSub}>{stat.gamesPlayed} игр · точность {accuracy}%</Text>
              </View>
              <Text style={styles.rowBest}>{stat.bestScore}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 16 },
    overviewRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    overviewCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    overviewStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    overviewValue: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 2 },
    overviewLabel: { fontSize: 10, fontFamily: fontFamily('600'), color: theme.textMuted, textAlign: 'center' },
    sectionTitle: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text, marginTop: 8, marginBottom: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 12,
      gap: 12,
      marginBottom: 8,
    },
    rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowIconPlain: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text },
    rowSub: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    rowBest: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.primary },
  });
}
