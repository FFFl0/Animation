import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { ANIMATED_AVATARS, ANIMATED_AVATAR_IMAGES, AnimatedAvatarId } from '../shop/animatedAvatars';

/**
 * An avatar that moves. The picture itself is a still — what moves is a
 * layer drawn over it in code, so one file works at every size the avatar
 * is ever drawn at, and nothing has to be re-exported to retint it.
 *
 * Only transform and opacity animate, so it runs on the native driver.
 */

const SPARKS = [
  { x: 0.12, y: 0.2, r: 0.07 },
  { x: 0.82, y: 0.16, r: 0.05 },
  { x: 0.9, y: 0.62, r: 0.06 },
  { x: 0.08, y: 0.7, r: 0.05 },
  { x: 0.5, y: 0.06, r: 0.04 },
];

export default function AnimatedAvatar({ id, size }: { id: AnimatedAvatarId; size: number }) {
  const spec = ANIMATED_AVATARS[id];
  const cycle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(cycle, {
        toValue: 1,
        duration: spec.period * 1000,
        easing: spec.motion === 'shimmer' ? Easing.linear : Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spec.motion, spec.period, cycle]);

  // 0 -> 1 -> 0 for anything that should come back where it started.
  const there = cycle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Animated.View
        style={{
          width: '100%',
          height: '100%',
          transform:
            spec.motion === 'breathe'
              ? [{ scale: there.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }]
              : [],
        }}
      >
        <Image source={ANIMATED_AVATAR_IMAGES[id]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </Animated.View>

      {spec.motion === 'glow' && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: spec.accent,
            opacity: there.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.3] }),
          }}
        />
      )}

      {spec.motion === 'shimmer' && (
        <Animated.View
          style={{
            position: 'absolute',
            top: -size,
            bottom: -size,
            width: size * 0.42,
            backgroundColor: spec.accent,
            opacity: 0.22,
            transform: [
              { rotate: '20deg' },
              { translateX: cycle.interpolate({ inputRange: [0, 1], outputRange: [-size, size * 1.6] }) },
            ],
          }}
        />
      )}

      {spec.motion === 'sparkle' &&
        SPARKS.map((spark, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: spark.x * size,
              top: spark.y * size,
              width: spark.r * size,
              height: spark.r * size,
              borderRadius: (spark.r * size) / 2,
              backgroundColor: spec.accent,
              // staggered, so they twinkle instead of blinking in unison
              opacity: cycle.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1].map((v) => (v + i * 0.17) % 1).sort((a, b) => a - b),
                outputRange: [0.15, 0.95, 0.2, 0.8, 0.15],
              }),
              transform: [{ scale: there.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }) }],
            }}
          />
        ))}
    </View>
  );
}
