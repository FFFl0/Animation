import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ANIMATED_FRAMES, AnimatedFrameId } from '../shop/animatedFrames';

/**
 * A profile frame that moves. Everything is drawn here rather than shipped
 * as an animated file: a sprite sheet could not be resized to sit behind an
 * avatar of any size, and a single ring costs nothing to render.
 *
 * Only transform and opacity are animated, so the whole thing runs on the
 * native driver and never touches the JS thread once it has started.
 */

/** How much wider than the avatar the ring sits. */
const OVERHANG = 1.18;
const VIEWBOX = 100;

type Props = {
  id: AnimatedFrameId;
  /** The avatar's size; the ring is drawn around it. */
  size: number;
};

export default function AnimatedFrame({ id, size }: Props) {
  const spec = ANIMATED_FRAMES[id];
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: spec.period * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spec.period, spin]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: spec.period * 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: spec.period * 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [spec.period, pulse]);

  const ringSize = Math.round(size * OVERHANG);
  const offset = -(ringSize - size) / 2;

  const turn = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const counterTurn = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const breathe = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const swell = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });

  // Each motion is the same two rings with different dashes and transforms —
  // the difference is what the eye reads as "spinning", "orbiting", "marching".
  const outer = { dash: '58 12', width: 5 };
  const inner = { dash: '10 14', width: 3 };
  const style: Record<string, { outer: typeof outer; inner: typeof inner | null }> = {
    spin: { outer: { dash: '58 12', width: 5 }, inner: null },
    orbit: { outer: { dash: '3 13', width: 6 }, inner: { dash: '2 18', width: 4 } },
    pulse: { outer: { dash: '', width: 5 }, inner: null },
    march: { outer: { dash: '6 8', width: 4 }, inner: null },
    counter: { outer: { dash: '44 14', width: 5 }, inner: { dash: '22 10', width: 3 } },
  };
  const shape = style[spec.motion];

  const pulsing = spec.motion === 'pulse';
  const outerStyle = pulsing
    ? { opacity: breathe, transform: [{ scale: swell }] }
    : { transform: [{ rotate: turn }] };

  return (
    <View
      style={{ position: 'absolute', top: offset, left: offset, width: ringSize, height: ringSize }}
      pointerEvents="none"
    >
      <Animated.View style={[{ width: '100%', height: '100%', position: 'absolute' }, outerStyle]}>
        <Ring id={`${id}-outer`} colors={spec.colors} dash={shape.outer.dash} width={shape.outer.width} />
      </Animated.View>
      {shape.inner && (
        <Animated.View
          style={[
            { width: '100%', height: '100%', position: 'absolute' },
            { transform: [{ rotate: spec.motion === 'counter' ? counterTurn : turn }] },
          ]}
        >
          <Ring
            id={`${id}-inner`}
            colors={[...spec.colors].reverse()}
            dash={shape.inner.dash}
            width={shape.inner.width}
            inset={5}
          />
        </Animated.View>
      )}
    </View>
  );
}

function Ring({
  id,
  colors,
  dash,
  width,
  inset = 0,
}: {
  id: string;
  colors: string[];
  dash: string;
  width: number;
  inset?: number;
}) {
  const radius = VIEWBOX / 2 - width / 2 - inset;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1] ?? colors[0]} />
        </LinearGradient>
      </Defs>
      <Circle
        cx={VIEWBOX / 2}
        cy={VIEWBOX / 2}
        r={radius}
        stroke={`url(#${id})`}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash || undefined}
        fill="none"
      />
    </Svg>
  );
}
