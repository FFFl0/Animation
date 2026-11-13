import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { Theme } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import { useSound } from '../sound/SoundContext';
import { todayDateStr } from '../quiz/today';
import { nextTier, tierForStreak, STREAK_TIERS } from '../data/streakTiers';
import { streakWeek } from '../data/streakWeek';
import { WIDGET_TEXT, widgetStateOf } from '../widget/streakWidgetState';
import { lookFor, pillColors, raysSvg, sceneGeometry, sceneIntensity, streakScene } from '../widget/streakScene';
import { useCountUp } from './useCountUp';
import { useReduceMotion } from './useReduceMotion';
import { useHoliday } from '../holidays/HolidayContext';

type Props = {
  streak: { count: number; lastPlayedDate: string | null };
  freezes: number;
};

/** Card height to width, as the old streak card and the widget art. */
const ASPECT = 1 / 2.05;
const MAX_EMBERS = 12;
/**
 * The picture sits inset in the card as a tile of its own, rounded on all
 * four corners; its radius is the card's less the inset, so the two curves
 * run parallel.
 */
const SCENE_INSET = 6;
const SCENE_RADIUS = radius.lg - SCENE_INSET;
const MAX_TWINKLES = 6;
const BURST = 10;

/** A value running 0→1 forever, every `ms`. */
function useLoop(ms: number, run: boolean, delay = 0): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) {
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ms, run, delay, value]);
  return value;
}

/** Scales and moves about a point of a box rather than its centre. */
function about(px: number, py: number, w: number, h: number, inner: object[]): object[] {
  const dx = px - w / 2;
  const dy = py - h / 2;
  return [{ translateX: dx }, { translateY: dy }, ...inner, { translateX: -dx }, { translateY: -dy }];
}

/**
 * The streak on the home screen, drawn the way the home-screen widget is —
 * the same picture for the same tier and the same state of today — but
 * alive: the rays turn, the flame breathes, embers rise off it while the
 * day is played, it dozes with a drifting "z" while the day waits and
 * shivers under a freeze, the stars twinkle and, at the top, a moon runs
 * round the orbit. The longer the run, the more of it there is and the
 * quicker it moves. A tap on the card makes the flame jump and throw
 * sparks.
 *
 * Under the picture: the week so far, a flame on each day the streak
 * covers, and how far it is to the next change of picture.
 *
 * Every animation is a transform or an opacity on the native driver, apart
 * from the one progress bar, and all of them stop when the phone asks for
 * reduced motion.
 */
export default function StreakHero({ streak, freezes }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { buzz } = useSound();
  const reduce = useReduceMotion();
  const accessory = useHoliday().holiday?.accessory ?? null;
  const [W, setW] = useState(0);
  const H = Math.round(W * ASPECT);

  const today = todayDateStr();
  const state = widgetStateOf({ ...streak, freezes, language }, today);
  const { count, kind } = state;
  const look = lookFor(count, kind);
  const pill = pillColors(count, kind);
  const words = WIDGET_TEXT[language];
  const intensity = sceneIntensity(count, kind);
  const move = !reduce && W > 0;
  const lit = kind === 'done';
  const shown = useCountUp(count);
  const tierTitle = t(`streak.${kind === 'start' ? 'seed' : tierForStreak(count).id}.title`);

  const geo = W > 0 ? sceneGeometry(count, kind, W, H) : null;
  const back = useMemo(
    () => (W > 0 ? streakScene({ count, kind, width: W, height: H, variant: 3, layer: 'back', cornerRadius: SCENE_RADIUS }) : ''),
    [count, kind, W, H]
  );
  const flameXml = useMemo(
    () => (W > 0 ? streakScene({ count, kind, width: W, height: H, variant: 3, layer: 'flame', cornerRadius: 0, accessory }) : ''),
    [count, kind, W, H, accessory]
  );
  const reach = Math.max(W, H) * 1.15;
  const rays = useMemo(() => (W > 0 ? raysSvg(count, kind, reach) : null), [count, kind, reach, W]);

  // Clocks: the higher the tier, the quicker everything goes.
  const spin = useLoop(Math.round(60000 - 35000 * intensity), move && !!rays);
  const breath = useLoop(lit ? Math.round(2600 - 1200 * intensity) : 3600, move && kind !== 'start');
  const orbit = useLoop(9000, move && !!geo?.orbit);
  const zzz = useLoop(2600, move && kind === 'pending');
  const shiver = useLoop(1800, move && kind === 'frozen');
  const sway = useLoop(4200, move && kind === 'start');
  const emberCount = lit ? Math.min(MAX_EMBERS, look.embers) : 0;
  const twinkleCount = Math.min(MAX_TWINKLES, Math.round(2 + intensity * 4));

  const embers = useRef(Array.from({ length: MAX_EMBERS }, () => new Animated.Value(0))).current;
  const twinkles = useRef(Array.from({ length: MAX_TWINKLES }, () => new Animated.Value(0))).current;
  const burst = useRef(new Animated.Value(0)).current;
  const jump = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!move || emberCount === 0) return;
    const period = Math.round(2200 - 900 * intensity);
    const loops = embers.slice(0, emberCount).map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((i * period) / emberCount),
          Animated.timing(value, { toValue: 1, duration: period, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [move, emberCount, intensity, embers]);

  useEffect(() => {
    if (!move) return;
    const loops = twinkles.slice(0, twinkleCount).map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 430),
          Animated.timing(value, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.delay(1400 + i * 170),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [move, twinkleCount, twinkles]);

  const next = nextTier(count);
  const current = tierForStreak(count);
  const progress = next ? (count - current.minDays) / Math.max(1, next.minDays - current.minDays) : 1;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, fill]);

  const onTap = () => {
    buzz(lit ? 'success' : 'tap');
    if (reduce) return;
    burst.setValue(0);
    jump.setValue(0);
    Animated.parallel([
      Animated.timing(burst, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(jump, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(jump, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();
  };

  // Seeded spots for the twinkles and the burst, so they do not jump about
  // between renders.
  const spots = useMemo(() => {
    let s = 7 + count;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    return Array.from({ length: MAX_TWINKLES }, () => ({ x: 0.5 + r() * 0.48, y: 0.08 + r() * 0.8, size: 9 + r() * 7 }));
  }, [count]);

  const week = streakWeek(streak, kind !== 'start', today);
  const dayNames: string[] = t('home.streakHero.weekdays').split(',');
  const unlock = next ? t(`home.streakHero.unlock.${next.id}`) : '';

  let flameTransform: object[] = [];
  let emberStyles: object[] = [];
  let burstStyles: object[] = [];
  let moon: object | null = null;
  if (geo) {
    const f = geo.flame;
    const baseX = f.x + f.size / 2;
    const baseY = f.y + f.size;
    const grow = 0.03 + 0.05 * intensity;
    const breathY = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1 + grow, 1] });
    const breathX = breath.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1 - grow * 0.4, 1] });
    flameTransform = [
      { translateY: jump.interpolate({ inputRange: [0, 1], outputRange: [0, -f.size * 0.16] }) },
      { translateX: shiver.interpolate({ inputRange: [0, 0.05, 0.1, 0.15, 0.2, 1], outputRange: [0, -2, 2, -2, 0, 0] }) },
      ...about(baseX, baseY, W, H, [
        { rotate: sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '4deg', '-4deg'] }) },
        { scaleY: breathY },
        { scaleX: breathX },
        { scale: jump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
      ]),
    ];
    emberStyles = embers.slice(0, emberCount).map((value, i) => {
      const side = ((i * 37) % 11) / 10 - 0.5;
      return {
        left: baseX + side * f.size * 0.6,
        top: f.y + f.size * 0.45,
        width: 3 + (i % 3),
        height: 3 + (i % 3),
        backgroundColor: i % 3 === 0 ? '#FFFFFF' : look.flame[2],
        opacity: value.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.7, 0] }),
        transform: [
          { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -f.size * (0.7 + (i % 4) * 0.12)] }) },
          { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, side * 18] }) },
          { scale: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
        ],
      };
    });
    burstStyles = Array.from({ length: BURST }, (_, i) => {
      const a = (i / BURST) * Math.PI * 2;
      const dist = f.size * (0.7 + (i % 3) * 0.15);
      return {
        left: baseX - 4,
        top: f.y + f.size * 0.55 - 4,
        backgroundColor: i % 2 ? '#FFFFFF' : look.flame[1],
        opacity: burst.interpolate({ inputRange: [0, 0.05, 0.7, 1], outputRange: [0, 1, 0.8, 0] }),
        transform: [
          { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * dist] }) },
          { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * dist] }) },
          { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1.2, 0.2] }) },
        ],
      };
    });
    if (geo.orbit) {
      const { rx, ry, tilt, moon: r } = geo.orbit;
      const th = (tilt * Math.PI) / 180;
      const steps = 24;
      const inputRange = Array.from({ length: steps + 1 }, (_, i) => i / steps);
      const xs = inputRange.map((p) => {
        const a = p * Math.PI * 2;
        return geo.cx + Math.cos(a) * rx * Math.cos(th) - Math.sin(a) * ry * Math.sin(th) - r;
      });
      const ys = inputRange.map((p) => {
        const a = p * Math.PI * 2;
        return geo.cy + Math.cos(a) * rx * Math.sin(th) + Math.sin(a) * ry * Math.cos(th) - r;
      });
      moon = {
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        transform: [
          { translateX: orbit.interpolate({ inputRange, outputRange: xs }) },
          { translateY: orbit.interpolate({ inputRange, outputRange: ys }) },
        ],
      };
    }
  }

  return (
    <View style={styles.card} testID="streak-hero">
      <Pressable
        onPress={onTap}
        onLayout={(e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))}
        style={[styles.scene, { height: H || undefined, aspectRatio: W ? undefined : 2.05 }]}
        accessibilityRole="button"
        accessibilityLabel={`${t('home.streakLabel')}: ${count}. ${words.footer[kind]}`}
        testID="streak-hero-scene"
      >
        {geo && (
          <>
            <SvgXml xml={back} width={W} height={H} style={StyleSheet.absoluteFill as never} />
            {rays && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: geo.cx - reach,
                  top: geo.cy - reach,
                  width: reach * 2,
                  height: reach * 2,
                  transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
                }}
              >
                <SvgXml xml={rays} width={reach * 2} height={reach * 2} />
              </Animated.View>
            )}
            {twinkles.slice(0, twinkleCount).map((value, i) => (
              <Animated.Text
                key={`tw${i}`}
                pointerEvents="none"
                style={[
                  styles.twinkle,
                  {
                    left: spots[i].x * W,
                    top: spots[i].y * H,
                    fontSize: spots[i].size,
                    opacity: move ? value : 0.6,
                    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] }) }],
                  },
                ]}
              >
                ✦
              </Animated.Text>
            ))}
            {moon && <Animated.View pointerEvents="none" style={[styles.moon, moon]} />}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill as never, { transform: flameTransform as never }]}>
              <SvgXml xml={flameXml} width={W} height={H} />
            </Animated.View>
            {emberStyles.map((style, i) => (
              <Animated.View key={`em${i}`} pointerEvents="none" style={[styles.ember, style]} />
            ))}
            {burstStyles.map((style, i) => (
              <Animated.View key={`b${i}`} pointerEvents="none" style={[styles.spark, style]} />
            ))}
            {kind === 'pending' &&
              [0, 1].map((i) => (
                <Animated.Text
                  key={`z${i}`}
                  pointerEvents="none"
                  style={[
                    styles.zzz,
                    {
                      color: look.ink,
                      left: geo.flame.x + geo.flame.size * 0.78,
                      top: geo.flame.y + geo.flame.size * 0.15,
                      fontSize: 11 + i * 4,
                      opacity: zzz.interpolate({ inputRange: [0, 0.2 + i * 0.3, 0.9, 1], outputRange: [0, 0.9, 0.2, 0] }),
                      transform: [
                        { translateY: zzz.interpolate({ inputRange: [0, 1], outputRange: [6 - i * 6, -18 - i * 10] }) },
                        { translateX: zzz.interpolate({ inputRange: [0, 1], outputRange: [i * 6, 10 + i * 8] }) },
                      ],
                    },
                  ]}
                >
                  z
                </Animated.Text>
              ))}

            <View pointerEvents="none" style={[styles.words, { paddingRight: W - geo.emblem.x }]}>
              <Text style={[styles.label, { color: look.inkSoft }]}>{t('home.streakLabel')}</Text>
              <Text style={[styles.value, { color: look.ink }]}>{shown}</Text>
              <Text style={[styles.tierTitle, { color: look.ink }]} numberOfLines={1}>
                {tierTitle}
              </Text>
              <View style={[styles.pill, { backgroundColor: pill.background }]}>
                <Text style={[styles.pillText, { color: pill.text }]} numberOfLines={1}>
                  {words.footer[kind]}
                </Text>
              </View>
            </View>
          </>
        )}
      </Pressable>

      <View style={styles.body}>
        <View style={styles.week}>
          {week.map((day) => (
            <View key={day.date} style={styles.day}>
              <Text style={[styles.dayName, day.today && styles.dayNameToday]}>{dayNames[day.weekday]}</Text>
              <View
                style={[
                  styles.dayDot,
                  day.played && { backgroundColor: look.flame[0], borderColor: look.flame[0] },
                  day.today && !day.played && styles.dayDotToday,
                  day.future && styles.dayDotFuture,
                ]}
                testID={day.played ? 'streak-day-played' : undefined}
              >
                {day.played ? <Text style={styles.dayFlame}>🔥</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.nextRow}>
          <Text style={styles.nextText} numberOfLines={2}>
            {next ? t('home.streakHero.next', next.minDays - count, unlock) : t('home.streakHero.top')}
          </Text>
        </View>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: look.flame[0],
                width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

/** Kept for tests and the tier ladder: every tier the card can show. */
export const HERO_TIERS = STREAK_TIERS.map((tier) => tier.id);

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginBottom: 22,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    scene: {
      margin: SCENE_INSET,
      marginBottom: 0,
      borderRadius: SCENE_RADIUS,
      overflow: 'hidden',
    },
    twinkle: { position: 'absolute', color: '#FFFFFF' },
    moon: { position: 'absolute', left: 0, top: 0, backgroundColor: '#FDE68A' },
    ember: { position: 'absolute', borderRadius: 3 },
    spark: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
    zzz: { position: 'absolute', fontFamily: fontFamily('800') },
    words: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      right: 0,
      paddingLeft: 18,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    label: { fontSize: 12, fontFamily: fontFamily('700') },
    value: { fontSize: 40, lineHeight: 46, fontFamily: fontFamily('800') },
    tierTitle: { fontSize: 13, fontFamily: fontFamily('800'), marginTop: -2 },
    pill: { marginTop: 8, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, maxWidth: '100%' },
    pillText: { fontSize: 11.5, fontFamily: fontFamily('800') },
    body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
    week: { flexDirection: 'row', justifyContent: 'space-between' },
    day: { alignItems: 'center', gap: 4, flex: 1 },
    dayName: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted },
    dayNameToday: { color: theme.text },
    dayDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayDotToday: { borderColor: theme.primary, borderStyle: 'dashed', borderWidth: 2 },
    dayDotFuture: { opacity: 0.45 },
    dayFlame: { fontSize: 13 },
    nextRow: { marginTop: 12 },
    nextText: { fontSize: 12.5, lineHeight: 17, fontFamily: fontFamily('600'), color: theme.text },
    track: { height: 6, borderRadius: 3, backgroundColor: theme.border, marginTop: 8, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3 },
  });
}
