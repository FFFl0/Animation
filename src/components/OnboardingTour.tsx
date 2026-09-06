import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import Icon, { IconName } from './Icon';
import PillButton from './PillButton';
import SoundTouchable from '../sound/SoundTouchable';

const STORAGE_PREFIX = 'animequiz.onboardingSeen.';

const SLIDES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'shuffle',
    title: '8 категорий вопросов',
    description: 'Аниме, персонажи, цитаты, бои, мир аниме и другие — выбирай, что хочешь проверить.',
  },
  {
    icon: 'crown',
    title: '5 уровней сложности',
    description: 'От новичка до легенды. Каждый следующий уровень открывается, когда пройдёшь предыдущий.',
  },
  {
    icon: 'bolt',
    title: '9 игровых режимов',
    description: 'Быстрый квиз на скорость, «Выживший» с жизнями, силуэты, глаза и ещё несколько форматов.',
  },
  {
    icon: 'flame',
    title: 'Серия и достижения',
    description: 'Играй каждый день, чтобы не терять серию, и открывай достижения за успехи.',
  },
];

type Props = {
  profileId: string;
};

export default function OnboardingTour({ profileId }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_PREFIX + profileId).then((seen) => {
      if (!cancelled && !seen) {
        setStep(0);
        setVisible(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(STORAGE_PREFIX + profileId, '1');
  };

  if (!visible) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <View style={styles.overlay}>
      <SoundTouchable onPress={dismiss} style={styles.skip}>
        <Text style={styles.skipText}>Пропустить</Text>
      </SoundTouchable>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Icon name={slide.icon} size={40} color={theme.primary} strokeWidth={1.6} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && { backgroundColor: theme.primary, width: 18 }]} />
        ))}
      </View>

      <PillButton
        title={isLast ? 'Начать!' : 'Далее'}
        variant="ink"
        onPress={() => (isLast ? dismiss() : setStep((s) => s + 1))}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.background,
      zIndex: 100,
      paddingHorizontal: 32,
      paddingTop: 60,
      paddingBottom: 40,
      justifyContent: 'space-between',
    },
    skip: { alignSelf: 'flex-end' },
    skipText: { fontSize: 13, fontFamily: fontFamily('600'), color: theme.textMuted },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: 28,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text, textAlign: 'center', marginBottom: 10 },
    description: { fontSize: 14, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 21 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 24 },
    dot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: theme.border },
  });
}
