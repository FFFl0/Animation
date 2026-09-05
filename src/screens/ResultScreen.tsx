import { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { PetalScatter } from '../components/SakuraDecor';
import PillButton from '../components/PillButton';
import Icon from '../components/Icon';

type Props = {
  score: number;
  total: number;
  onRestart: () => void;
  onChooseCategory: () => void;
};

function getMessage(ratio: number) {
  if (ratio === 1) return 'Идеально! Ты настоящий отаку-эксперт 🏆';
  if (ratio >= 0.7) return 'Отличный результат! Ещё немного до совершенства ✨';
  if (ratio >= 0.4) return 'Неплохо! Пересмотри пару серий и попробуй снова 📺';
  return 'Есть куда расти — новая попытка не помешает 🍥';
}

export default function ResultScreen({ score, total, onRestart, onChooseCategory }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const wrong = Math.max(total - score, 0);
  const ratio = total > 0 ? score / total : 0;
  const percent = Math.round(ratio * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.trophyWrap}>
          <PetalScatter size={150} color={theme.primaryLight} count={6} />
          <View style={styles.trophyCircle}>
            <Icon name="trophy" size={42} color={theme.primary} strokeWidth={1.6} />
          </View>
        </View>

        <Text style={styles.title}>{ratio >= 0.7 ? 'Отлично!' : 'Хороший старт!'}</Text>
        <Text style={styles.subtitle}>
          Ты ответил на {score} из {total}
        </Text>
        <Text style={styles.message}>{getMessage(ratio)}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.success }]}>{score}</Text>
            <Text style={styles.statLabel}>Правильных</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.danger }]}>{wrong}</Text>
            <Text style={styles.statLabel}>Неверных</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.primary }]}>{percent}%</Text>
            <Text style={styles.statLabel}>Результат</Text>
          </View>
        </View>

        <PillButton title="Пройти ещё раз" icon="↻" variant="ink" onPress={onRestart} />
        <View style={{ height: 12 }} />
        <PillButton title="Выбрать другую категорию" variant="outline" onPress={onChooseCategory} />
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
    trophyWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    trophyCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 4 },
    subtitle: { fontSize: 15, fontFamily: fontFamily('600'), color: theme.textMuted, marginBottom: 10 },
    message: {
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 20,
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
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    statValue: { fontSize: 20, fontFamily: fontFamily('800'), marginBottom: 2 },
    statLabel: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted },
  });
}
