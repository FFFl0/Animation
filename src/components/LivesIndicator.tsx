import { View } from 'react-native';
import Icon from './Icon';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  lives: number;
  max: number;
  size?: number;
};

export default function LivesIndicator({ lives, max, size = 15 }: Props) {
  const { theme } = useTheme();
  const hearts = Array.from({ length: max }, (_, i) => i < lives);
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {hearts.map((filled, i) => (
        <Icon key={i} name={filled ? 'heart' : 'heartOutline'} size={size} color={filled ? theme.danger : theme.border} />
      ))}
    </View>
  );
}
