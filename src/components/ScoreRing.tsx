import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fontFamily } from '../theme/fonts';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const FILL_MS = 1100;

type Props = {
  /** 0..1 — the share of questions answered correctly. */
  ratio: number;
  size: number;
  stroke: number;
  trackColor: string;
  fillColor: string;
  textColor: string;
  mutedColor: string;
  label: string;
};

/**
 * A ring that sweeps to the round's percentage while the number inside counts
 * up to meet it.
 *
 * The number is driven by a listener on the same Animated.Value rather than a
 * second timer, so the digits can never disagree with the arc — and both are
 * kept off the native driver because `strokeDashoffset` has no native
 * equivalent anyway.
 */
export default function ScoreRing({
  ratio,
  size,
  stroke,
  trackColor,
  fillColor,
  textColor,
  mutedColor,
  label,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  const target = Math.max(0, Math.min(1, ratio));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const id = progress.addListener(({ value }) => setShown(Math.round(value * 100)));
    Animated.timing(progress, {
      toValue: target,
      duration: FILL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(id);
  }, [progress, target]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Rotated so the arc starts at the top rather than at 3 o'clock. */}
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill as never}>
        <View style={styles.center}>
          <Text style={[styles.percent, { color: textColor, fontSize: Math.round(size * 0.26) }]}>{shown}%</Text>
          <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  percent: { fontFamily: fontFamily('800') },
  label: { fontSize: 11, fontFamily: fontFamily('600'), marginTop: 2 },
});
