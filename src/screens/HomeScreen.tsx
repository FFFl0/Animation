import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { CHARACTERS } from '../data/characters';
import { QuizMode } from '../quiz/generateQuiz';

type Props = {
  onStart: (mode: QuizMode) => void;
};

const MODES: { mode: QuizMode; emoji: string; title: string; subtitle: string }[] = [
  { mode: 'photo', emoji: '🖼️', title: 'Угадай по фото', subtitle: 'По стилизованному портрету назови персонажа' },
  { mode: 'description', emoji: '📝', title: 'Угадай по описанию', subtitle: 'По короткой подсказке назови персонажа' },
  { mode: 'trivia', emoji: '❓', title: 'Вопросы про персонажа', subtitle: 'Факты и детали про конкретных героинь' },
];

export default function HomeScreen({ onStart }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎀</Text>
        <Text style={styles.title}>Angel Quiz</Text>
        <Text style={styles.subtitle}>
          Выбери режим викторины по аниме-героиням. В базе {CHARACTERS.length} персонажей.
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

        <Text style={styles.footer}>10 вопросов за раунд · случайный порядок · без интернета</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
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
