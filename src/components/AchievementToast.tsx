import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Achievement } from '../data/achievements';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import Icon from './Icon';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';
import { achievementTitle } from '../data/achievements';

type Props = {
  queue: Achievement[];
  onShown: () => void;
};

const VISIBLE_MS = 2600;

export default function AchievementToastHost({ queue, onShown }: Props) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const t = useT();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const current = queue[0] ?? null;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    if (!current) return;
    translateY.setValue(-120);
    opacity.setValue(0);
    const showAnim = Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: useNative, friction: 8, tension: 60 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: useNative }),
    ]);
    const hideAnim = Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: useNative }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: useNative }),
    ]);

    showAnim.start();
    const timer = setTimeout(() => {
      hideAnim.start(() => onShown());
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
          <Icon name={current.icon} size={18} color={theme.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.label, { color: theme.primary }]}>{t('achievementToast.label')}</Text>
          <Text style={[styles.title, { color: theme.text }]}>{achievementTitle(current, language)}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 20,
    zIndex: 50,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  label: { fontSize: 10, fontFamily: fontFamily('700'), textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 14, fontFamily: fontFamily('700'), marginTop: 1 },
});
