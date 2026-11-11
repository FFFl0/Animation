import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';

type Props = {
  /** What to say; null shows nothing. A new text shows again. */
  text: string | null;
  onShown: () => void;
};

const VISIBLE_MS = 3200;
const useNative = Platform.OS !== 'web';

/**
 * A one-line notice at the bottom of the screen that goes away by itself —
 * for news that needs no answer, like a freeze having saved the streak.
 * At the bottom so it never collides with the achievement toast at the top.
 */
export default function NoticeToast({ text, onShown }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!text) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: useNative }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: useNative }).start(() => onShown());
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  if (!text) return null;

  return (
    <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, 12) + 76 }]} pointerEvents="none">
      <Animated.View
        style={[styles.pill, { opacity, backgroundColor: theme.text }]}
        accessibilityLiveRegion="polite"
      >
        <Text style={[styles.text, { color: theme.background }]}>{text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 20 },
  pill: { borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 11, maxWidth: 420 },
  text: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily('700'), textAlign: 'center' },
});
