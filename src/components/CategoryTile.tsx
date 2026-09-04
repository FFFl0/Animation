import { StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';

type Props = {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export default function CategoryTile({ icon, iconBg, title, subtitle, onPress }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <SoundTouchable style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </SoundTouchable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      width: '48%',
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      padding: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    icon: { fontSize: 22 },
    title: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text, marginBottom: 2 },
    subtitle: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
  });
}
