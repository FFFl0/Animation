import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES, categoryTitle } from '../data/categories';
import { TIERS } from '../data/difficulty';
import { GAME_MODES, modeTitle } from '../data/modes';
import { categoryStatsKey, modeStatsKey } from '../quiz/statsKey';
import { ModeStat } from '../auth/types';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

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

type Props = {
  onOpenLeaderboard: () => void;
};

export default function StatsScreen({ onOpenLeaderboard }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();

  if (!profile) return null;

  const allStats = Object.values(profile.stats);
  const overall = sumStats(allStats);
  const overallAccuracy = overall.totalQuestions > 0 ? Math.round((overall.totalCorrect / overall.totalQuestions) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>{t('stats.pageTitle')}</Text>

        <SoundTouchable
          style={styles.leaderboardLink}
          onPress={onOpenLeaderboard}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <View style={styles.leaderboardIconWrap}>
            <Icon name="trophy" size={18} color={theme.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{t('stats.leaderboardTitle')}</Text>
            <Text style={styles.rowSub}>{t('stats.leaderboardSub')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </SoundTouchable>

        <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{overall.gamesPlayed}</Text>
            <Text style={styles.overviewLabel}>{t('stats.gamesPlayed')}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewValue}>{overallAccuracy}%</Text>
            <Text style={styles.overviewLabel}>{t('stats.accuracy')}</Text>
          </View>
          <View style={styles.overviewCard}>
            <View style={styles.overviewStreakRow}>
              <Icon name="flame" size={16} color={theme.primary} />
              <Text style={styles.overviewValue}>{profile.streak.count}</Text>
            </View>
            <Text style={styles.overviewLabel}>{t('stats.streakDays')}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('stats.byCategory')}</Text>
        {CATEGORIES.map((cat) => {
          const keys = cat.hardOnly || cat.id === 'mixed'
            ? [categoryStatsKey(cat.id)]
            : TIERS.map((tier) => categoryStatsKey(cat.id, tier.id));
          const stat = sumStats(keys.map((k) => profile.stats[k] ?? { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 }));
          const accuracy = stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : 0;

          return (
            <View key={cat.id} style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: cat.colorBg }]}>
                <Icon name={cat.icon} size={16} color={cat.color} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{categoryTitle(cat, language)}</Text>
                <Text style={styles.rowSub}>{t('stats.gamesAccuracy', stat.gamesPlayed, accuracy)}</Text>
              </View>
              <Text style={styles.rowBest}>{stat.bestScore}</Text>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>{t('stats.byMode')}</Text>
        {GAME_MODES.map((mode) => {
          const stat = profile.stats[modeStatsKey(mode.id)] ?? { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };
          const accuracy = stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : 0;

          return (
            <View key={mode.id} style={styles.row}>
              <View style={styles.rowIconPlain}>
                <Icon name={mode.icon} size={16} color={theme.primary} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{modeTitle(mode, language)}</Text>
                <Text style={styles.rowSub}>{t('stats.gamesAccuracy', stat.gamesPlayed, accuracy)}</Text>
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
    leaderboardLink: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 12,
      gap: 12,
      marginBottom: 20,
    },
    leaderboardIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chevron: { fontSize: 20, color: theme.textMuted, fontFamily: fontFamily('700') },
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
