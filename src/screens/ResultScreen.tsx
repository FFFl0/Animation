import { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  score: number;
  total: number;
  onRestart: () => void;
  onHome: () => void;
};

function getMessage(ratio: number) {
  if (ratio === 1) return 'Идеально! Ты настоящий отаку-эксперт 🏆';
  if (ratio >= 0.7) return 'Отличный результат! Ещё немного до совершенства ✨';
  if (ratio >= 0.4) return 'Неплохо! Пересмотри пару серий и попробуй снова 📺';
  return 'Есть куда расти — новая попытка не помешает 🍥';
}

export default function ResultScreen({ score, total, onRestart, onHome }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const ratio = total > 0 ? score / total : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🌸</Text>
        <Text style={styles.scoreLabel}>Твой результат</Text>
        <Text style={styles.score}>
          {score} / {total}
        </Text>
        <Text style={styles.message}>{getMessage(ratio)}</Text>

        <SoundTouchable style={styles.primaryButton} onPress={onRestart} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Попробовать снова</Text>
        </SoundTouchable>

        <SoundTouchable style={styles.secondaryButton} onPress={onHome} activeOpacity={0.85}>
          <Text style={styles.secondaryButtonText}>На главную</Text>
        </SoundTouchable>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emoji: { fontSize: 56, marginBottom: 8 },
    scoreLabel: { fontSize: 16, color: theme.textMuted, marginBottom: 4 },
    score: {
      fontSize: 48,
      fontWeight: '800',
      color: theme.primary,
      marginBottom: 16,
    },
    message: {
      fontSize: 16,
      color: theme.text,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 36,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      paddingVertical: 16,
      paddingHorizontal: 40,
      borderRadius: 30,
      marginBottom: 14,
      width: '100%',
      alignItems: 'center',
    },
    primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    secondaryButton: {
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 30,
      borderWidth: 1.5,
      borderColor: theme.border,
      width: '100%',
      alignItems: 'center',
    },
    secondaryButtonText: { color: theme.textMuted, fontSize: 16, fontWeight: '600' },
  });
}
