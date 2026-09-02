import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { CHARACTERS } from '../data/characters';

type Props = {
  onStart: () => void;
};

export default function HomeScreen({ onStart }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎀</Text>
        <Text style={styles.title}>Angel Quiz</Text>
        <Text style={styles.subtitle}>
          Угадай аниме-героиню по подсказке! В базе {CHARACTERS.length} персонажей из
          популярных аниме.
        </Text>

        <TouchableOpacity style={styles.button} onPress={onStart} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Начать викторину</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>10 вопросов · случайные варианты · без интернета</Text>
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
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: theme.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    marginTop: 28,
    fontSize: 13,
    color: theme.textMuted,
  },
});
