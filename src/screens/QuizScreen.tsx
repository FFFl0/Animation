import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import Icon from '../components/Icon';
import FadeIn from '../components/FadeIn';
import AnswerOption from '../quiz/AnswerOption';
import VideoPrompt from '../quiz/VideoPrompt';
import QuoteAudio from '../quiz/QuoteAudio';
import QuizTimer from '../quiz/QuizTimer';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  config: RoundConfig;
  onFinish: (score: number, total: number) => void;
  onClose: () => void;
  /** Fired right when an answer registers — lets a battle room broadcast live progress. */
  onAnswer?: (correct: boolean, answeredCount: number, score: number) => void;
};

const useNative = Platform.OS !== 'web';

export default function QuizScreen({ config, onFinish, onClose, onAnswer }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { playCorrect, playWrong } = useSound();
  const { language } = useLanguage();
  const t = useT();
  const questions = useMemo<Question[]>(() => generateQuiz(config, language), [config, language]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [lives, setLives] = useState(config.lives ?? 0);
  const [timeLeft, setTimeLeft] = useState(config.timerSeconds ?? 0);
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promptEnter = useRef(new Animated.Value(1)).current;

  const question = questions[index];
  const isLast = index === questions.length - 1;
  // Options key off this too, so every part of the question re-enters together.
  const questionKey = `${index}-${question?.promptText ?? ''}`;
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
    promptEnter.setValue(0);
    Animated.timing(promptEnter, { toValue: 1, duration: 260, useNativeDriver: useNative }).start();
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
    const correct = optionIndex === question.correctIndex;
    const nextScore = correct ? score + 1 : score;
    if (correct) {
      setScore(nextScore);
      playCorrect();
    } else {
      playWrong();
      if (hasLives) setLives((l) => Math.max(0, l - 1));
    }
    onAnswer?.(correct, index + 1, nextScore);
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
          <SoundTouchable
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('quiz.closeLabel')}
          >
            <Icon name="close" size={15} color={theme.textMuted} />
          </SoundTouchable>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {t('quiz.questionOf', index + 1, questions.length)}
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
          <QuizTimer
            secondsLeft={timeLeft}
            label={`⏱ ${timeLeft}${t('quiz.seconds')}`}
            style={styles.timer}
            urgentColor={theme.danger}
          />
        )}

        <View style={styles.centerBlock}>
          <Animated.View
            style={{
              opacity: promptEnter,
              transform: [{ translateY: promptEnter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            }}
          >
            {question.promptKind === 'video' && question.seriesId && (
              <View style={styles.avatarWrap}>
                {/* Keyed on the question so moving on tears the old player
                    down instead of reusing it for the next clip. */}
                <VideoPrompt key={question.id} seriesId={question.seriesId} missingLabel={t('quiz.videoMissing')} />
              </View>
            )}

            {question.promptKind !== 'text' && question.promptKind !== 'video' && question.character && (
              <View style={styles.avatarWrap}>
                <AnimeAvatar
                  avatar={question.character.avatar}
                  characterId={question.character.id}
                  size={140}
                  variant={question.promptKind === 'avatar' ? 'full' : question.promptKind}
                />
              </View>
            )}

            <Text style={styles.hint}>{question.promptText}</Text>

            {question.type === 'guessQuote' && question.character && (
              // Keyed on the question so the next quote gets a fresh player
              // instead of replaying through the previous one.
              <QuoteAudio key={question.id} characterId={question.character.id} />
            )}
          </Animated.View>

          <View style={styles.options}>
            {question.options.map((option, i) => {
              const isCorrect = i === question.correctIndex;
              const isSelected = i === selected;
              const showState = selected !== null;

              let style = styles.option;
              // The right answer is revealed either way — getting it wrong
              // should still teach you what it was.
              if (showState && isCorrect) style = { ...styles.option, ...styles.optionCorrect };
              else if (showState && isSelected && !isCorrect) style = { ...styles.option, ...styles.optionWrong };

              return (
                <AnswerOption
                  key={option}
                  label={option}
                  index={i}
                  questionKey={questionKey}
                  state={showState && isCorrect ? 'correct' : showState && isSelected ? 'wrong' : 'idle'}
                  disabled={showState}
                  onPress={() => handleSelect(i)}
                  style={style}
                  textStyle={styles.optionText}
                />
              );
            })}
          </View>

          {selected !== null && (
            // Keyed on the question so it fades in again each round rather
            // than only the first time it is mounted.
            <FadeIn key={questionKey} duration={220}>
              <SoundTouchable style={styles.nextButton} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button">
                <Text style={styles.nextButtonText}>
                  {isLast || (hasLives && lives <= 0) ? t('quiz.results') : t('quiz.next')}
                </Text>
              </SoundTouchable>
            </FadeIn>
          )}
        </View>
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
    progressRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressText: { color: theme.textMuted, fontFamily: fontFamily('600') },
    dotsWrap: { marginBottom: 16 },
    barWrap: { marginBottom: 16 },
    timer: { textAlign: 'center', fontFamily: fontFamily('700'), color: theme.text, marginBottom: 8, fontSize: 14 },
    centerBlock: { flex: 1, justifyContent: 'center', paddingBottom: 24 },
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
