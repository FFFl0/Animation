import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Theme } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  progress: number; // 0..1
  color?: string;
  height?: number;
};

export default function ProgressBar({ progress, color, height = 8 }: Props) {
  const { theme } = useTheme();
  const fillColor = color ?? theme.primary;
  const pct = Math.max(0, Math.min(1, progress));
  const value = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    // Width can't run on the native driver, but the bar is a single small
    // view so driving it from JS costs nothing noticeable.
    Animated.timing(value, { toValue: pct, duration: 320, useNativeDriver: false }).start();
  }, [pct, value]);

  const width = value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: theme.border, overflow: 'hidden' }}>
      <Animated.View style={{ width, height: '100%', borderRadius: height / 2, backgroundColor: fillColor }} />
    </View>
  );
}

export function ProgressDots({ total, current, theme }: { total: number; current: number; theme: Theme }) {
  const dots = Array.from({ length: total }, (_, i) => i);
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {dots.map((i) => (
        <Dot key={i} filled={i <= current} active={i === current} theme={theme} />
      ))}
    </View>
  );
}

/** The dot for the question being answered swells slightly, so the row reads
 * as "you are here" and not just "this many done". */
function Dot({ filled, active, theme }: { filled: boolean; active: boolean; theme: Theme }) {
  const scale = useRef(new Animated.Value(active ? 1.35 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1.35 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 90,
    }).start();
  }, [active, scale]);

  return (
    <Animated.View
      style={{
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: filled ? theme.primary : theme.border,
        transform: [{ scale }],
      }}
    />
  );
}
