import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Theme } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { getAllProfiles } from '../auth/storage';
import { Profile } from '../auth/types';
import { QuizMode, QUESTIONS_PER_QUIZ } from '../quiz/generateQuiz';
import AnimeAvatar from '../components/AnimeAvatar';

type Props = {
  onBack: () => void;
};

type Category = QuizMode | 'overall';

const TABS: { key: Category; label: string }[] = [
  { key: 'overall', label: 'Общий' },
  { key: 'photo', label: 'По фото' },
  { key: 'eyes', label: 'По глазам' },
  { key: 'description', label: 'По описанию' },
  { key: 'series', label: 'Из аниме' },
  { key: 'poster', label: 'По картинке' },
  { key: 'trivia', label: 'Вопросы' },
];

type Row = {
  profile: Profile;
  score: number;
  maxScore: number;
  accuracy: number;
};

function buildRows(profiles: Profile[], category: Category): Row[] {
  const rows: Row[] = [];

  for (const profile of profiles) {
    if (category === 'overall') {
      const modes = Object.values(profile.stats);
      const gamesPlayed = modes.reduce((sum, m) => sum + m.gamesPlayed, 0);
      if (gamesPlayed === 0) continue;
      const score = modes.reduce((sum, m) => sum + m.bestScore, 0);
      const totalCorrect = modes.reduce((sum, m) => sum + m.totalCorrect, 0);
      const totalQuestions = modes.reduce((sum, m) => sum + m.totalQuestions, 0);
      rows.push({
        profile,
        score,
        maxScore: QUESTIONS_PER_QUIZ * modes.length,
        accuracy: totalQuestions > 0 ? totalCorrect / totalQuestions : 0,
      });
    } else {
      const s = profile.stats[category];
      if (s.gamesPlayed === 0) continue;
      rows.push({
        profile,
        score: s.bestScore,
        maxScore: QUESTIONS_PER_QUIZ,
        accuracy: s.totalQuestions > 0 ? s.totalCorrect / s.totalQuestions : 0,
      });
    }
  }

  return rows.sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || a.profile.username.localeCompare(b.profile.username));
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen({ onBack }: Props) {
  const { profile: me } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [category, setCategory] = useState<Category>('overall');

  useEffect(() => {
    getAllProfiles().then(setProfiles);
  }, []);

  const rows = profiles ? buildRows(profiles, category) : [];

  return (
    <View style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 Рейтинг</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, category === tab.key && styles.tabActive]}
            onPress={() => setCategory(tab.key)}
          >
            <Text style={[styles.tabText, category === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.listScroll} contentContainerStyle={styles.list}>
        {rows.length === 0 && (
          <Text style={styles.empty}>
            Пока никто не сыграл в этом режиме. Сыграй первым — и займи первую строчку!
          </Text>
        )}

        {rows.map((row, i) => {
          const isMe = row.profile.id === me?.id;
          return (
            <View key={row.profile.id} style={[styles.row, isMe && styles.rowMe]}>
              <Text style={styles.rank}>{MEDALS[i] ?? `#${i + 1}`}</Text>
              <AnimeAvatar avatar={row.profile.avatar} size={32} />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {row.profile.username}{isMe ? ' (ты)' : ''}
                </Text>
                <Text style={styles.rowSub}>Точность: {Math.round(row.accuracy * 100)}%</Text>
              </View>
              <Text style={styles.rowScore}>{row.score}/{row.maxScore}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backText: { color: theme.primary, fontSize: 15, fontWeight: '700' },
  title: { fontSize: 18, fontWeight: '800', color: theme.text },
  tabsScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 44 },
  tabs: { paddingHorizontal: 24, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  tabTextActive: { color: '#fff' },
  listScroll: { flex: 1 },
  list: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 8 },
  empty: {
    textAlign: 'center',
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 40,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 10,
  },
  rowMe: { borderColor: theme.primary, backgroundColor: theme.primarySoft },
  rank: { width: 22, textAlign: 'center', fontSize: 12, fontWeight: '800', color: theme.textMuted },
  rowText: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: theme.text },
  rowSub: { fontSize: 11, color: theme.textMuted },
  rowScore: { fontSize: 14, fontWeight: '800', color: theme.primary },
  });
}
