import { StyleSheet, Text, TouchableOpacityProps, ViewStyle } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius, spacing } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import SoundTouchable from '../sound/SoundTouchable';

type Variant = 'ink' | 'primary' | 'secondary' | 'outline';

type Props = TouchableOpacityProps & {
  title: string;
  variant?: Variant;
  icon?: string;
  fullWidth?: boolean;
};

export default function PillButton({ title, variant = 'ink', icon, fullWidth = true, style, disabled, ...rest }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const variantStyle = {
    ink: { backgroundColor: theme.ink },
    primary: { backgroundColor: theme.primary },
    secondary: { backgroundColor: theme.primaryLight },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.border },
  }[variant];

  const textColor = {
    ink: theme.onInk,
    primary: theme.onPrimary,
    secondary: theme.primary,
    outline: theme.text,
  }[variant];

  return (
    <SoundTouchable
      style={[styles.base, variantStyle, fullWidth && styles.fullWidth, disabled && styles.disabled, style as ViewStyle]}
      disabled={disabled}
      activeOpacity={0.85}
      {...rest}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      {icon && <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>}
    </SoundTouchable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing(2),
      paddingVertical: 16,
      paddingHorizontal: spacing(7),
      borderRadius: radius.pill,
    },
    fullWidth: { width: '100%' },
    disabled: { opacity: 0.5 },
    text: { fontSize: 16, fontFamily: fontFamily('700') },
    icon: { fontSize: 16 },
  });
}
