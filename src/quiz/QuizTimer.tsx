import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleProp, TextStyle } from 'react-native';

const useNative = Platform.OS !== 'web';
/** Seconds at which the timer starts drawing attention to itself. */
const URGENT_AT = 3;

type Props = {
  secondsLeft: number;
  label: string;
  style: StyleProp<TextStyle>;
  urgentColor: string;
};

/** Counts down quietly, then beats once per second over the last few
 * seconds so running out never comes as a surprise. */
export default function QuizTimer({ secondsLeft, label, style, urgentColor }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const urgent = secondsLeft > 0 && secondsLeft <= URGENT_AT;

  useEffect(() => {
    if (!urgent) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.22, duration: 140, useNativeDriver: useNative }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: useNative, friction: 4, tension: 140 }),
    ]).start();
  }, [secondsLeft, urgent, scale]);

  return (
    <Animated.Text style={[style, urgent && { color: urgentColor }, { transform: [{ scale }] }]}>
      {label}
    </Animated.Text>
  );
}
