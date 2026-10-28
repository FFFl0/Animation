import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { radius } from '../theme/tokens';
import Icon from '../components/Icon';
import { abilityArt } from '../data/abilityArt';

const useNative = Platform.OS !== 'web';

type Props = {
  /** The ability the question is about — the card is drawn from it. */
  ability: string;
  /** Replays the entrance when the question changes. */
  questionKey: string;
};

/**
 * The picture for a question about a technique.
 *
 * "Бои и способности" asked its questions as two lines of text over an empty
 * screen, while every other category had something to look at. There is no
 * artwork for a hundred and sixty-four abilities, so the card is drawn from
 * the ability itself: a symbol and a colour, a ring that swells once as the
 * question arrives, and two sparks either side.
 */
export default function AbilityPrompt({ ability, questionKey }: Props) {
  const art = useMemo(() => abilityArt(ability), [ability]);
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    }).start();
  }, [questionKey, enter]);

  const ringScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.5] });
  const ringOpacity = enter.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.4, 0] });
  const tileScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.ring,
          { borderColor: art.accent, opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.tile,
          {
            backgroundColor: `${art.accent}26`,
            borderColor: `${art.accent}66`,
            opacity: enter,
            transform: [{ scale: tileScale }],
          },
        ]}
      >
        <Icon name={art.icon} size={46} color={art.accent} />
      </Animated.View>

      {/* Two sparks, so the card reads as a technique going off rather than
          an icon sitting in a box. */}
      <Animated.View style={[styles.spark, styles.sparkLeft, { backgroundColor: art.accent, opacity: ringOpacity }]} />
      <Animated.View style={[styles.spark, styles.sparkRight, { backgroundColor: art.accent, opacity: ringOpacity }]} />
    </View>
  );
}

const SIZE = 112;

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  tile: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3 },
  spark: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  sparkLeft: { left: -10, top: SIZE * 0.3 },
  sparkRight: { right: -10, bottom: SIZE * 0.3 },
});
