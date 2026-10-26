import { useEffect, useMemo, useRef } from 'react';
import { Animated, DimensionValue, Easing, StyleSheet, View } from 'react-native';
import { Theme } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';

/**
 * The shape of what is coming, instead of a wheel saying nothing is here yet.
 *
 * A list of grey bars the size of the real rows reads as a page that is
 * half-arrived; a spinner reads as an empty screen. The blocks breathe
 * together rather than in sequence — a wave across the rows looks like
 * something is happening *to* the list, and nothing is.
 */
function useBreath(): Animated.AnimatedInterpolation<number> {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
}

function Block({
  width,
  height,
  round,
  opacity,
  theme,
}: {
  width: DimensionValue;
  height: number;
  round?: boolean;
  opacity: Animated.AnimatedInterpolation<number>;
  theme: Theme;
}) {
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: round ? height / 2 : 6,
        backgroundColor: theme.border,
        opacity,
      }}
    />
  );
}

type Props = {
  /** How many rows to stand in for. Roughly a screenful is enough — more
   * only adds grey. */
  count?: number;
  /** Rows that start with a picture: a chat, a player, a friend. */
  avatar?: boolean;
  /** Rows with something short on the right, like a score. */
  trailing?: boolean;
};

export default function SkeletonList({ count = 6, avatar = true, trailing = false }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const opacity = useBreath();

  return (
    <View style={styles.list} pointerEvents="none" accessibilityElementsHidden>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          {avatar && <Block width={44} height={44} round opacity={opacity} theme={theme} />}
          <View style={styles.body}>
            {/* Uneven widths, because real names and messages are uneven —
                identical bars look like a table, not a list of people. */}
            <Block width={i % 3 === 0 ? '52%' : i % 3 === 1 ? '38%' : '45%'} height={13} opacity={opacity} theme={theme} />
            <Block width={i % 2 === 0 ? '78%' : '64%'} height={11} opacity={opacity} theme={theme} />
          </View>
          {trailing && <Block width={34} height={14} opacity={opacity} theme={theme} />}
        </View>
      ))}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    list: { paddingHorizontal: 20, paddingTop: 10, gap: 18 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    body: { flex: 1, gap: 7 },
  });
}
