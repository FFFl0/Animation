import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useT } from '../i18n/strings';
import Icon from './Icon';
import ImageScrim from './ImageScrim';
import { STREAK_BACKGROUNDS } from '../data/streakImages';
import { progressToNextTier, streakIntensity, tierForStreak } from '../data/streakTiers';
import { useCountUp } from './useCountUp';

type Props = {
  days: number;
};

/** The most sparks a card ever shows, at the very top of the table. */
const MAX_SPARKS = 5;

/**
 * The streak on the home screen. Which artwork, icon, colour and wording it
 * shows all come from the tier the run has reached — and so does how much it
 * moves: a run that has not started sits perfectly still, and everything
 * from the pulse behind the icon to the number of sparks rising past it
 * steps up tier by tier, so a long streak is visibly a bigger thing than a
 * short one before a single word is read.
 *
 * Every animated property is an opacity or a transform, so the whole card
 * runs on the native driver and costs the JS thread nothing while it sits
 * on a screen the player is scrolling.
 */
export default function StreakCard({ days }: Props) {
  const t = useT();
  const tier = tierForStreak(days);
  const intensity = streakIntensity(days);
  const progress = progressToNextTier(days);

  // Faster and stronger the longer the run: a little under two and a half
  // seconds at the first flicker, a brisk heartbeat at the top.
  const pulseMs = Math.round(2400 - 1300 * intensity);
  const sparkCount = Math.round(intensity * MAX_SPARKS);

  const pulse = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const sparks = useRef(Array.from({ length: MAX_SPARKS }, () => new Animated.Value(0))).current;
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (intensity <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: pulseMs / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: pulseMs / 2,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [intensity, pulseMs, pulse]);

  useEffect(() => {
    if (intensity <= 0) return;
    const loop = Animated.loop(
      Animated.timing(halo, { toValue: 1, duration: pulseMs, easing: Easing.out(Easing.quad), useNativeDriver: true })
    );
    halo.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [intensity, pulseMs, halo]);

  useEffect(() => {
    if (sparkCount <= 0) return;
    // Staggered rather than in step, or they read as one thick bar moving up.
    const loops = sparks.slice(0, sparkCount).map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * pulseMs) / sparkCount),
          Animated.timing(value, {
            toValue: 1,
            duration: pulseMs + i * 120,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      )
    );
    for (const loop of loops) loop.start();
    return () => {
      for (const loop of loops) loop.stop();
    };
  }, [sparkCount, pulseMs, sparks]);

  useEffect(() => {
    Animated.timing(fill, {
      toValue: progress,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      // A width cannot run on the native driver, and this is one thin bar.
      useNativeDriver: false,
    }).start();
  }, [progress, fill]);

  const counted = useCountUp(days);
  const shown = counted > 100 ? '100+' : String(counted);

  const iconScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + 0.06 * intensity] });
  const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.9] });
  const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.15 + 0.4 * intensity, 0] });
  const fillWidth = fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const sparkStyles = useMemo(
    () =>
      sparks.map((value, i) => ({
        opacity: value.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.5, 0] }),
        transform: [
          { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [6, -34 - i * 4] }) },
          { translateX: (i % 2 === 0 ? 1 : -1) * (3 + i * 2) },
          { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) },
        ],
      })),
    [sparks]
  );

  return (
    <View style={styles.card}>
      <Image source={STREAK_BACKGROUNDS[tier.id]} style={styles.background} resizeMode="cover" />
      <ImageScrim direction="left" />

      <View style={styles.content}>
        <View style={styles.head}>
          <View style={styles.iconSlot}>
            {sparkStyles.slice(0, sparkCount).map((style, i) => (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[styles.spark, { backgroundColor: tier.accent }, style]}
              />
            ))}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                { backgroundColor: tier.accent, opacity: haloOpacity, transform: [{ scale: haloScale }] },
              ]}
            />
            <Animated.View
              style={[
                styles.iconTile,
                {
                  backgroundColor: `${tier.accent}33`,
                  borderColor: `${tier.accent}66`,
                  transform: [{ scale: iconScale }],
                },
              ]}
            >
              <Icon name={tier.icon} size={22} color={tier.accent} />
            </Animated.View>
          </View>
          <View>
            <Text style={styles.label}>{t('home.streakLabel')}</Text>
            <Text style={styles.value}>{shown}</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: tier.accent }]}>{t(`streak.${tier.id}.title`)}</Text>
        <Text style={styles.body}>{t(`streak.${tier.id}.body`)}</Text>
      </View>

      {/* How close the next tier is, along the very bottom of the card. */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: tier.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 2.05,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 22,
  },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  content: { flex: 1, padding: 16, justifyContent: 'space-between', maxWidth: '68%' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Fixed size so the halo growing past the tile cannot push the row around.
  iconSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  spark: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontFamily: fontFamily('600'),
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  value: {
    fontSize: 30,
    fontFamily: fontFamily('800'),
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  title: {
    fontSize: 15,
    fontFamily: fontFamily('800'),
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  body: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily('500'),
    color: 'rgba(255,255,255,0.88)',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  fill: { height: '100%' },
});
