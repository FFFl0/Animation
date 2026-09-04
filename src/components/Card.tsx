import { View, ViewProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

export default function Card({ style, ...rest }: ViewProps) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: theme.border,
          padding: 16,
        },
        style,
      ]}
      {...rest}
    />
  );
}
