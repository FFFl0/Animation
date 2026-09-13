import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import Icon from './Icon';
import { MEDAL_KINDS, MedalKind, TournamentRecord } from '../tournament/medals';

/** Medal colours are the medals' own, not the theme's — bronze is bronze in both themes. */
const MEDAL_COLORS: Record<MedalKind, string> = {
  gold: '#E0A424',
  silver: '#9AA3AE',
  bronze: '#B4703B',
};

type Props = {
  record: TournamentRecord;
  labels: Record<MedalKind, string>;
};

/** The three medal counts side by side. Shown on the tournament screen and in the profile. */
export default function MedalShelf({ record, labels }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.row}>
      {MEDAL_KINDS.map((kind) => (
        <View key={kind} style={styles.cell}>
          <Icon name="medal" size={22} color={MEDAL_COLORS[kind]} />
          <Text style={[styles.count, record[kind] === 0 && styles.countEmpty]}>{record[kind]}</Text>
          <Text style={styles.label}>{labels[kind]}</Text>
        </View>
      ))}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingVertical: 14,
    },
    cell: { flex: 1, alignItems: 'center', gap: 4 },
    count: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    countEmpty: { color: theme.textMuted },
    label: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted },
  });
}
