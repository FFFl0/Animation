import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

const useNative = Platform.OS !== 'web';

type Props = {
  color: string;
  /** The diameter the rays travel within. */
  size?: number;
  /** How many rays go out. Few enough to read as a spark, not a firework. */
  count?: number;
  /** Milliseconds to wait, for when the thing it celebrates arrives late. */
  delay?: number;
};

/**
 * A short burst of rays from a point, played once.
 *
 * Marks the two moments in the app worth marking — a record falling and an
 * achievement unlocking — without taking over the screen: it lasts about
 * half a second, draws nothing at rest, and takes no touches, so it can be
 * laid over anything.
 *
 * Each ray is rotated first and then moved along its own axis, which is what
 * makes them radiate rather than all slide the same way.
 */
export default function Burst({ color, size = 110, count = 10, delay = 0 }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const angles = useMemo(() => Array.from({ length: count }, (_, i) => (i / count) * 360), [count]);

  useEffect(() => {
    progress.setValue(0);
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNative,
      }),
    ]).start();
  }, [progress, delay]);

  const opacity = progress.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.85, 0] });

  return (
    <View style={[styles.wrap, { width: size, height: size }]} pointerEvents="none">
      {angles.map((angle, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ray,
            {
              backgroundColor: color,
              opacity,
              transform: [
                { rotate: `${angle}deg` },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.16, -size * 0.46] }) },
                { scaleY: progress.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 1, 0.5] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 3, height: 13, borderRadius: 2 },
});
