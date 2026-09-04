import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import { CHARACTERS } from '../data/characters';
import { QuizMode, QUESTIONS_PER_QUIZ } from '../quiz/generateQuiz';
import { useAuth } from '../auth/AuthContext';
import AnimeAvatar from '../components/AnimeAvatar';

type Props = {
  onStart: (mode: QuizMode) => void;
  onOpenProfile: () => void;
};

const MODES: { mode: QuizMode; emoji: string; title: string; subtitle: string }[] = [
  { mode: 'photo', emoji: '🖼️', title: 'Угадай по фото', subtitle: 'По портрету назови персонажа' },
  { mode: 'eyes', emoji: '👀', title: 'Угадай по глазам', subtitle: 'По одним глазам назови персонажа' },
  { mode: 'description', emoji: '📝', title: 'Угадай по описанию', subtitle: 'По подсказке назови персонажа' },
  { mode: 'series', emoji: '🎬', title: 'Из какого аниме?', subtitle: 'По персонажу назови сериал' },
  { mode: 'poster', emoji: '🎞️', title: 'Угадай по картинке', subtitle: 'По постеру назови сериал' },
  { mode: 'clip', emoji: '🎥', title: 'Угадай по вырезке', subtitle: 'По кадру видео назови аниме' },
  { mode: 'trivia', emoji: '❓', title: 'Вопросы про героя', subtitle: 'Факты и детали про персонажей' },
];

export default function HomeScreen({ onStart, onOpenProfile }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {profile && (
          <SoundTouchable style={styles.profileBar} onPress={onOpenProfile} activeOpacity={0.85}>
            <AnimeAvatar avatar={profile.avatar} size={38} />
            <View style={styles.profileTextWrap}>
              <Text style={styles.profileHi}>С возвращением,</Text>
              <Text style={styles.profileName} numberOfLines={1}>{profile.username}</Text>
            </View>
            <Text style={styles.profileLink}>Профиль ›</Text>
          </SoundTouchable>
        )}

        <Text style={styles.title}>
          Anime<Text style={{ color: theme.accent }}>Quiz</Text>
        </Text>
        <Text style={styles.subtitle}>
          Выбери режим викторины. В базе {CHARACTERS.length} персонажей.
        </Text>

        <View style={styles.grid}>
          {MODES.map((m) => (
            <SoundTouchable
              key={m.mode}
              style={styles.modeCard}
              onPress={() => onStart(m.mode)}
              activeOpacity={0.85}
            >
              <View style={styles.modeIconWrap}>
                <Text style={styles.modeEmoji}>{m.emoji}</Text>
              </View>
              <Text style={styles.modeTitle}>{m.title}</Text>
              <Text style={styles.modeSubtitle}>{m.subtitle}</Text>
            </SoundTouchable>
          ))}
        </View>

        <Text style={styles.footer}>{QUESTIONS_PER_QUIZ} вопросов за раунд · случайный порядок · без интернета</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
    },
    profileBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      gap: 10,
      marginBottom: 22,
    },
    profileTextWrap: { flex: 1 },
    profileHi: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted },
    profileName: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
    profileLink: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.accent },
    title: {
      fontSize: 30,
      fontFamily: fontFamily('800'),
      color: theme.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      lineHeight: 20,
      marginBottom: 22,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 14,
    },
    modeCard: {
      width: '48%',
      backgroundColor: theme.card,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      shadowColor: theme.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    modeIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    modeEmoji: { fontSize: 24 },
    modeTitle: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text, marginBottom: 4 },
    modeSubtitle: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, lineHeight: 16 },
    footer: {
      marginTop: 24,
      fontSize: 12,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
    },
  });
}
