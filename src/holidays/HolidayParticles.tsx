import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReduceMotion } from '../components/useReduceMotion';
import { useTheme } from '../theme/ThemeContext';
import { ParticleKind } from './holidays';
import { useHoliday } from './HolidayContext';

const COUNT = 14;

type Spec = { x: number; size: number; duration: number; delay: number; sway: number; spin: number; glyph: number };

/** Positions and speeds, the same every time for a given holiday. */
function specsFor(kind: ParticleKind): Spec[] {
  let s = kind.length * 977;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const slow = kind === 'snow' ? 1 : kind === 'spooky' ? 1.3 : 1.15;
  return Array.from({ length: COUNT }, (_, i) => ({
    x: (i + r() * 0.8) / COUNT,
    size: 10 + r() * 10,
    duration: (9000 + r() * 7000) * slow,
    delay: r() * 9000,
    sway: 10 + r() * 22,
    spin: (r() > 0.5 ? 1 : -1) * (90 + r() * 240),
    glyph: Math.floor(r() * 10),
  }));
}

/**
 * Something falling across the home screen for the holiday: snow at New
 * Year, hearts for Valentine's, petals for the 8th of March and cherry
 * blossom, bats and pumpkins at Halloween.
 *
 * A layer over the screen that never takes a touch, a handful of shapes on
 * the native driver, and nothing at all when the phone asks for less motion.
 */
export default function HolidayParticles() {
  const { holiday } = useHoliday();
  const reduce = useReduceMotion();
  const { height, width } = useWindowDimensions();
  const kind = holiday?.particles ?? null;
  if (!kind || reduce) return null;
  return <Falling kind={kind} width={width} height={height} />;
}

function Falling({ kind, width, height }: { kind: ParticleKind; width: number; height: number }) {
  const { resolvedScheme, theme } = useTheme();
  const specs = useMemo(() => specsFor(kind), [kind]);
  const values = useRef(specs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(specs[i].delay),
          Animated.timing(value, { toValue: 1, duration: specs[i].duration, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [values, specs]);

  const snow = resolvedScheme === 'dark' ? '#E6F0FA' : '#9CC7EE';

  return (
    <View pointerEvents="none" style={styles.layer} testID={`holiday-particles-${kind}`}>
      {specs.map((spec, i) => {
        const value = values[i];
        const style = {
          left: spec.x * width,
          opacity: value.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 0.85, 0.7, 0] }),
          transform: [
            { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-40, height * 0.95] }) },
            {
              translateX: value.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: [0, spec.sway, 0, -spec.sway, 0],
              }),
            },
            { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${spec.spin}deg`] }) },
          ],
        };
        if (kind === 'petals') {
          return (
            <Animated.View
              key={i}
              style={[
                styles.item,
                styles.petal,
                { width: spec.size * 0.7, height: spec.size, backgroundColor: spec.glyph % 3 ? '#FFC1D9' : '#F9A8C9' },
                style,
              ]}
            />
          );
        }
        const glyph =
          kind === 'snow' ? '❄' : kind === 'hearts' ? '♥' : spec.glyph % 3 === 0 ? '🎃' : '🦇';
        const color = kind === 'snow' ? snow : kind === 'hearts' ? (spec.glyph % 2 ? theme.primary : '#FF8FB1') : undefined;
        return (
          <Animated.Text key={i} style={[styles.item, { fontSize: spec.size, color }, style]}>
            {glyph}
          </Animated.Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', zIndex: 5 },
  item: { position: 'absolute', top: 0 },
  petal: { borderTopLeftRadius: 999, borderBottomRightRadius: 999, borderTopRightRadius: 3, borderBottomLeftRadius: 3 },
});
