import { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { generateQuiz, Question } from '../quiz/generateQuiz';
import { RoundConfig } from '../quiz/types';
import AnimeAvatar from '../components/AnimeAvatar';
import ProgressBar, { ProgressDots } from '../components/ProgressBar';
import LivesIndicator from '../components/LivesIndicator';

type Props = {
  config: RoundConfig;
  onFinish: (score: number, total: number) => void;
  onClose: () => void;
};

export default function QuizScreen({ config, onFinish, onClose }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { playCorrect, playWrong } = useSound();
  const questions = useMemo<Question[]>(() => generateQuiz(config), [config]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [lives, setLives] = useState(config.lives ?? 0);
  const [timeLeft, setTimeLeft] = useState(config.timerSeconds ?? 0);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const hasLives = !!config.lives;
  const hasTimer = !!config.timerSeconds;

  useEffect(() => {
    if (!hasTimer) return;
    setTimeLeft(config.timerSeconds!);
    if (timeoutRef.current) clearInterval(timeoutRef.current);
    timeoutRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timeoutRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (hasTimer && timeLeft === 0 && selected === null) {
      setSelected(-1);
      playWrong();
      if (hasLives) setLives((l) => Math.max(0, l - 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const handleSelect = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (optionIndex === question.correctIndex) {
      setScore((s) => s + 1);
      playCorrect();
    } else {
      playWrong();
      if (hasLives) setLives((l) => Math.max(0, l - 1));
    }
  };

  const handleNext = () => {
    const outOfLives = hasLives && lives <= 0;
    if (isLast || outOfLives) {
      onFinish(score, index + 1);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <SoundTouchable style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeButtonText}>✕</Text>
          </SoundTouchable>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Вопрос {index + 1} из {questions.length}
            </Text>
            {hasLives && <LivesIndicator lives={lives} max={config.lives!} />}
          </View>
        </View>

        {questions.length <= 20 ? (
          <View style={styles.dotsWrap}>
            <ProgressDots total={questions.length} current={index} theme={theme} />
          </View>
        ) : (
          <View style={styles.barWrap}>
            <ProgressBar progress={(index + 1) / questions.length} />
          </View>
        )}

        {hasTimer && (
          <Text style={[styles.timer, timeLeft <= 3 && { color: theme.danger }]}>⏱ {timeLeft}с</Text>
        )}

        {question.promptKind !== 'text' && question.character && (
          <View style={styles.avatarWrap}>
            <AnimeAvatar
              avatar={question.character.avatar}
              size={140}
              variant={question.promptKind === 'avatar' ? 'full' : question.promptKind}
            />
          </View>
        )}

        <Text style={styles.hint}>{question.promptText}</Text>

        <View style={styles.options}>
          {question.options.map((option, i) => {
            const isCorrect = i === question.correctIndex;
            const isSelected = i === selected;
            const showState = selected !== null;

            let style = styles.option;
            if (showState && isCorrect) style = { ...styles.option, ...styles.optionCorrect };
            else if (showState && isSelected && !isCorrect) style = { ...styles.option, ...styles.optionWrong };

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
          <SoundTouchable style={styles.nextButton} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.nextButtonText}>
              {isLast || (hasLives && lives <= 0) ? 'Результаты' : 'Дальше'}
            </Text>
          </SoundTouchable>
        )}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: { fontSize: 15, color: theme.textMuted, fontFamily: fontFamily('700') },
    progressRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressText: { color: theme.textMuted, fontFamily: fontFamily('600') },
    dotsWrap: { marginBottom: 16 },
    barWrap: { marginBottom: 16 },
    timer: { textAlign: 'center', fontFamily: fontFamily('700'), color: theme.text, marginBottom: 8, fontSize: 14 },
    avatarWrap: { alignItems: 'center', marginBottom: 16 },
    hint: {
      fontSize: 17,
      fontFamily: fontFamily('600'),
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
      borderRadius: radius.lg,
      paddingVertical: 15,
      paddingHorizontal: 20,
    },
    optionCorrect: {
      borderColor: theme.success,
      backgroundColor: theme.successBg,
    },
    optionWrong: {
      borderColor: theme.danger,
      backgroundColor: theme.dangerBg,
    },
    optionText: { fontSize: 15, color: theme.text, fontFamily: fontFamily('600') },
    nextButton: {
      marginTop: 20,
      backgroundColor: theme.primary,
      borderRadius: radius.pill,
      paddingVertical: 16,
      alignItems: 'center',
    },
    nextButtonText: { color: theme.onPrimary, fontSize: 16, fontFamily: fontFamily('700') },
  });
}
