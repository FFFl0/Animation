import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleProp, ViewStyle } from 'react-native';

const useNative = Platform.OS !== 'web';

type Props = {
  children: React.ReactNode;
  /** Milliseconds to wait before starting — stagger a row by passing i * 80. */
  delay?: number;
  duration?: number;
  /** How far below its resting place the content starts, in points. */
  offsetY?: number;
  style?: StyleProp<ViewStyle>;
};

/** Fades and lifts its children into place once, on mount. */
export default function FadeIn({ children, delay = 0, duration = 300, offsetY = 10, style }: Props) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, { toValue: 1, duration, delay, useNativeDriver: useNative }).start();
  }, [value, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: value,
          transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [offsetY, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
