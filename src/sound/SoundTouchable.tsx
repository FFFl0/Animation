import { useRef } from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useSound } from './SoundContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/** How far a pressed control shrinks. Small on purpose: this is on every
 * card, row and button in the app, and anything deeper reads as wobble. */
const PRESSED_SCALE = 0.97;

/**
 * Every tappable thing in the app: it clicks, it ticks the haptics through
 * the sound context, and it now answers the finger by shrinking slightly
 * while held and springing back on release.
 *
 * The spring runs on release as well as on press, so a tap that is dragged
 * off the control still returns it to size, and the whole thing is a
 * transform, so it costs the JS thread nothing.
 */
export default function SoundTouchable({ onPress, onPressIn, onPressOut, style, disabled, ...rest }: TouchableOpacityProps) {
  const { playClick } = useSound();
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (value: number) => {
    Animated.spring(scale, { toValue: value, friction: 8, tension: 220, useNativeDriver: true }).start();
  };

  return (
    <AnimatedTouchable
      {...rest}
      disabled={disabled}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(e) => {
        if (!disabled) springTo(PRESSED_SCALE);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        springTo(1);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        playClick();
        onPress?.(e);
      }}
    />
  );
}
