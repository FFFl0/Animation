import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const useNative = Platform.OS !== 'web';

/** Fixed per-petal offsets. Hand-written rather than random so the shower
 * looks the same every time it is earned, and so nothing re-randomises on a
 * re-render mid-fall. */
const PETALS = [
  { x: 0.08, delay: 0, duration: 3400, size: 15, drift: 30, spin: 220 },
  { x: 0.24, delay: 420, duration: 4100, size: 11, drift: -24, spin: -180 },
  { x: 0.4, delay: 160, duration: 3000, size: 18, drift: 40, spin: 300 },
  { x: 0.55, delay: 900, duration: 3800, size: 13, drift: -34, spin: -260 },
  { x: 0.7, delay: 260, duration: 4400, size: 16, drift: 26, spin: 190 },
  { x: 0.86, delay: 700, duration: 3200, size: 12, drift: -18, spin: -320 },
  { x: 0.95, delay: 1200, duration: 3900, size: 14, drift: 22, spin: 240 },
];

/**
 * A slow drift of sakura petals down the whole screen, for a round worth
 * celebrating. Absolutely positioned and non-interactive, so it can be laid
 * over any screen without touching its layout or swallowing taps.
 */
export default function FallingPetals({ color }: { color: string }) {
  const { height } = useWindowDimensions();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {PETALS.map((petal, i) => (
        <Petal key={i} {...petal} color={color} screenHeight={height} />
      ))}
    </View>
  );
}

type PetalProps = (typeof PETALS)[number] & { color: string; screenHeight: number };

function Petal({ x, delay, duration, size, drift, spin, color, screenHeight }: PetalProps) {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: useNative }),
        Animated.timing(fall, { toValue: 0, duration: 0, useNativeDriver: useNative }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fall, delay, duration]);

  const style = useMemo(
    () => ({
      position: 'absolute' as const,
      left: `${x * 100}%` as const,
      top: -30,
      transform: [
        { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, screenHeight + 60] }) },
        { translateX: fall.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, 0] }) },
        { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spin}deg`] }) },
      ],
      // Fade out over the last stretch so petals don't vanish mid-air.
      opacity: fall.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 0.9, 0.9, 0] }),
    }),
    [fall, x, drift, spin, screenHeight]
  );

  return (
    <Animated.View style={style}>
      <Svg width={size} height={size} viewBox="-12 -12 24 24">
        <Path d="M0 -10 C7 -8 10 -2 10 4 C10 10 5 14 0 10 C-5 14 -10 10 -10 4 C-10 -2 -7 -8 0 -10 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}
