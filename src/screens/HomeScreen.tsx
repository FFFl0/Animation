import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { CHARACTERS } from '../data/characters';
import { QuizMode, QUESTIONS_PER_QUIZ } from '../quiz/generateQuiz';
import { useAuth } from '../auth/AuthContext';
import AnimeAvatar from '../components/AnimeAvatar';

type Props = {
  onStart: (mode: QuizMode) => void;
  onOpenProfile: () => void;
  onOpenLeaderboard: () => void;
};

const MODES: { mode: QuizMode; emoji: string; title: string; subtitle: string }[] = [
  { mode: 'photo', emoji: '🖼️', title: 'Угадай по фото', subtitle: 'По стилизованному портрету назови персонажа' },
  { mode: 'eyes', emoji: '👀', title: 'Угадай по глазам', subtitle: 'По одним лишь глазам назови персонажа' },
  { mode: 'description', emoji: '📝', title: 'Угадай по описанию', subtitle: 'По короткой подсказке назови персонажа' },
  { mode: 'series', emoji: '🎬', title: 'Из какого аниме?', subtitle: 'По портрету персонажа назови сериал' },
  { mode: 'trivia', emoji: '❓', title: 'Вопросы про персонажа', subtitle: 'Факты и детали про конкретных персонажей' },
];

export default function HomeScreen({ onStart, onOpenProfile, onOpenLeaderboard }: Props) {
  const { profile } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      {profile && (
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.profileBar} onPress={onOpenProfile} activeOpacity={0.85}>
            <AnimeAvatar avatar={profile.avatar} size={40} />
            <Text style={styles.profileName} numberOfLines={1}>{profile.username}</Text>
            <Text style={styles.profileLink}>Профиль ›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.trophyButton} onPress={onOpenLeaderboard} activeOpacity={0.85}>
            <Text style={styles.trophyEmoji}>🏆</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.emoji}>🎌</Text>
        <Text style={styles.title}>Anime Quiz</Text>
        <Text style={styles.subtitle}>
          Выбери режим викторины по аниме-персонажам. В базе {CHARACTERS.length} персонажей.
        </Text>

        <View style={styles.modes}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.mode}
              style={styles.modeCard}
              onPress={() => onStart(m.mode)}
              activeOpacity={0.85}
            >
              <Text style={styles.modeEmoji}>{m.emoji}</Text>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>{m.title}</Text>
                <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>{QUESTIONS_PER_QUIZ} вопросов за раунд · случайный порядок · без интернета</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 76,
    paddingBottom: 32,
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 10,
  },
  profileName: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.text },
  profileLink: { fontSize: 13, fontWeight: '700', color: theme.primary },
  trophyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyEmoji: { fontSize: 20 },
  emoji: { fontSize: 52, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  modes: { width: '100%', gap: 14 },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    shadowColor: theme.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  modeEmoji: { fontSize: 32 },
  modeText: { flex: 1 },
  modeTitle: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 2 },
  modeSubtitle: { fontSize: 13, color: theme.textMuted, lineHeight: 18 },
  footer: {
    marginTop: 26,
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
  },
});
