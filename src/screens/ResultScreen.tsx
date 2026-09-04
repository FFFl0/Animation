import { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import { PetalScatter } from '../components/SakuraDecor';

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
  const wrong = Math.max(total - score, 0);
  const ratio = total > 0 ? score / total : 0;
  const percent = Math.round(ratio * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.trophyWrap}>
          <PetalScatter size={140} color={theme.accent} count={6} />
          <View style={styles.trophyCircle}>
            <Text style={styles.trophyEmoji}>🏆</Text>
          </View>
        </View>

        <Text style={styles.scoreLabel}>Твой результат</Text>
        <Text style={styles.score}>
          {score} / {total}
        </Text>
        <Text style={styles.message}>{getMessage(ratio)}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.success }]}>{score}</Text>
            <Text style={styles.statLabel}>Верно</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.danger }]}>{wrong}</Text>
            <Text style={styles.statLabel}>Неверно</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.accent }]}>{percent}%</Text>
            <Text style={styles.statLabel}>Точность</Text>
          </View>
        </View>

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
    trophyWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    trophyCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trophyEmoji: { fontSize: 44 },
    scoreLabel: { fontSize: 15, fontFamily: fontFamily('500'), color: theme.textMuted, marginBottom: 4 },
    score: {
      fontSize: 44,
      fontFamily: fontFamily('800'),
      color: theme.primary,
      marginBottom: 14,
    },
    message: {
      fontSize: 15,
      fontFamily: fontFamily('500'),
      color: theme.text,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
      marginBottom: 28,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    statValue: { fontSize: 20, fontFamily: fontFamily('800'), marginBottom: 2 },
    statLabel: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted },
    primaryButton: {
      backgroundColor: theme.primary,
      paddingVertical: 16,
      paddingHorizontal: 40,
      borderRadius: 30,
      marginBottom: 14,
      width: '100%',
      alignItems: 'center',
    },
    primaryButtonText: { color: theme.onPrimary, fontSize: 17, fontFamily: fontFamily('700') },
    secondaryButton: {
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 30,
      borderWidth: 1.5,
      borderColor: theme.border,
      width: '100%',
      alignItems: 'center',
    },
    secondaryButtonText: { color: theme.textMuted, fontSize: 16, fontFamily: fontFamily('600') },
  });
}
