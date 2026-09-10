import { useEffect, useRef } from 'react';
import { Animated, Platform, View } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  lives: number;
  max: number;
  size?: number;
};

export default function LivesIndicator({ lives, max, size = 15 }: Props) {
  const { theme } = useTheme();
  const hearts = Array.from({ length: max }, (_, i) => i < lives);
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {hearts.map((filled, i) => (
        <Heart key={i} filled={filled} size={size} color={filled ? theme.danger : theme.border} />
      ))}
    </View>
  );
}

/** A heart that is lost gives one last beat before it empties out — the count
 * dropping silently is easy to miss mid-question. */
function Heart({ filled, size, color }: { filled: boolean; size: number; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const wasFilled = useRef(filled);
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    if (wasFilled.current && !filled) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 130, useNativeDriver: useNative }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: useNative, friction: 4, tension: 120 }),
      ]).start();
    }
    wasFilled.current = filled;
  }, [filled, scale, useNative]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Icon name={filled ? 'heart' : 'heartOutline'} size={size} color={color} />
    </Animated.View>
  );
}
