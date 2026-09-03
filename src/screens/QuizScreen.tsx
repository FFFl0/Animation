import { useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { generateQuiz, Question, QuizMode } from '../quiz/generateQuiz';
import AnimeAvatar from '../components/AnimeAvatar';

type Props = {
  mode: QuizMode;
  onFinish: (score: number, total: number) => void;
};

const QUESTION_COUNT = 10;

const MODE_TITLE: Record<QuizMode, string> = {
  photo: 'Кто это?',
  description: 'Угадай по описанию',
  trivia: 'Вопрос про персонажа',
};

export default function QuizScreen({ mode, onFinish }: Props) {
  const questions = useMemo<Question[]>(() => generateQuiz(mode, QUESTION_COUNT), [mode]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const handleSelect = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (optionIndex === question.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      onFinish(score, questions.length);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Вопрос {index + 1} / {questions.length}
          </Text>
          <Text style={styles.scoreText}>Очки: {score}</Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((index + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        {mode === 'trivia' && (
          <View style={styles.triviaHeader}>
            <AnimeAvatar avatar={question.character.avatar} size={64} />
            <View style={styles.triviaHeaderText}>
              <Text style={styles.triviaName}>{question.character.name}</Text>
              <Text style={styles.triviaSeries}>{question.character.series}</Text>
            </View>
          </View>
        )}

        {question.promptKind === 'avatar' && (
          <View style={styles.avatarWrap}>
            <AnimeAvatar avatar={question.character.avatar} />
          </View>
        )}

        <Text style={styles.modeLabel}>{MODE_TITLE[mode]}</Text>
        <Text style={styles.hint}>{question.prompt}</Text>

        <View style={styles.options}>
          {question.options.map((option, i) => {
            const isCorrect = i === question.correctIndex;
            const isSelected = i === selected;
            const showState = selected !== null;

            let style = styles.option;
            if (showState && isCorrect) style = { ...styles.option, ...styles.optionCorrect };
            else if (showState && isSelected && !isCorrect)
              style = { ...styles.option, ...styles.optionWrong };

            return (
              <TouchableOpacity
                key={option}
                style={style}
                onPress={() => handleSelect(i)}
                disabled={showState}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selected !== null && (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.nextButtonText}>{isLast ? 'Результаты' : 'Дальше'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: { color: theme.textMuted, fontWeight: '600' },
  scoreText: { color: theme.primary, fontWeight: '700' },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.primary,
    borderRadius: 4,
  },
  triviaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  triviaHeaderText: { flex: 1 },
  triviaName: { fontSize: 16, fontWeight: '700', color: theme.text },
  triviaSeries: { fontSize: 13, color: theme.textMuted },
  avatarWrap: { alignItems: 'center', marginBottom: 16 },
  modeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  hint: {
    fontSize: 17,
    color: theme.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 22,
    minHeight: 48,
  },
  options: { gap: 12 },
  option: {
    backgroundColor: theme.card,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  optionCorrect: {
    borderColor: theme.success,
    backgroundColor: '#EBFBEE',
  },
  optionWrong: {
    borderColor: theme.danger,
    backgroundColor: '#FFF5F5',
  },
  optionText: { fontSize: 16, color: theme.text, fontWeight: '600' },
  nextButton: {
    marginTop: 24,
    backgroundColor: theme.accent,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
