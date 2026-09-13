import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleProp, TextStyle, ViewStyle } from 'react-native';

const useNative = Platform.OS !== 'web';

type State = 'idle' | 'correct' | 'wrong';

type Props = {
  label: string;
  state: State;
  disabled: boolean;
  /** Position in the list — used to stagger the entrance. */
  index: number;
  /** Changes whenever a new question is shown, replaying the entrance. */
  questionKey: string;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
};

export default function AnswerOption({
  label,
  state,
  disabled,
  index,
  questionKey,
  onPress,
  style,
  textStyle,
}: Props) {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  // Options fan in one after another, so a new question reads as a new
  // question rather than the same four boxes with different words in them.
  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 260,
      delay: index * 55,
      useNativeDriver: useNative,
    }).start();
  }, [questionKey, enter, index]);

  useEffect(() => {
    if (state === 'correct') {
      Animated.sequence([
        Animated.timing(reveal, { toValue: 1, duration: 130, useNativeDriver: useNative }),
        Animated.spring(reveal, { toValue: 0, useNativeDriver: useNative, friction: 4, tension: 90 }),
      ]).start();
    } else if (state === 'wrong') {
      // Four quick sideways nudges, decaying — the classic "no".
      Animated.sequence(
        [10, -8, 6, -4, 0].map((toValue) =>
          Animated.timing(shake, { toValue, duration: 55, useNativeDriver: useNative })
        )
      ).start();
    }
  }, [state, reveal, shake]);

  const scale = Animated.multiply(press, reveal.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }));

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { translateX: shake },
          { scale },
        ],
      }}
    >
      <Pressable
        style={style}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => Animated.spring(press, { toValue: 0.97, useNativeDriver: useNative, friction: 7 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: useNative, friction: 7 }).start()}
        accessibilityRole="button"
      >
        <Animated.Text style={textStyle}>{label}</Animated.Text>
      </Pressable>
    </Animated.View>
  );
}
