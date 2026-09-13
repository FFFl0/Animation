import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useSound } from './SoundContext';

export default function SoundTouchable({ onPress, ...rest }: TouchableOpacityProps) {
  const { playClick } = useSound();

  return (
    <TouchableOpacity
      {...rest}
      onPress={(e) => {
        playClick();
        onPress?.(e);
      }}
    />
  );
}
