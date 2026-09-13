import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import Icon from './Icon';
import { MEDAL_KINDS, MedalKind, TournamentRecord } from '../tournament/medals';
import { MEDAL_POINTS, earnedPoints } from '../shop/economy';

/** Medal colours are the medals' own, not the theme's — bronze is bronze in both themes. */
const MEDAL_COLORS: Record<MedalKind, string> = {
  gold: '#E0A424',
  silver: '#9AA3AE',
  bronze: '#B4703B',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  medals: TournamentRecord;
  spent: number;
  balance: number;
};

/**
 * Where the balance came from, written out. Medals are never spent — the
 * points they are worth are — so without this the number in the corner has
 * no explanation anywhere in the app.
 */
export default function WalletSheet({ visible, onClose, medals, spent, balance }: Props) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const t = useT();
  const earned = earnedPoints(medals);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* the sheet swallows taps so a press inside it does not close it */}
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{t('wallet.title')}</Text>
          <Text style={styles.lead}>{t('wallet.lead')}</Text>

          {MEDAL_KINDS.map((kind) => (
            <View key={kind} style={styles.row}>
              <Icon name="medal" size={17} color={MEDAL_COLORS[kind]} />
              <Text style={styles.rowLabel}>{t(`tournament.medal${kind[0].toUpperCase()}${kind.slice(1)}` as 'tournament.medalGold')}</Text>
              <Text style={styles.rowSum}>{t('wallet.line', medals[kind], MEDAL_POINTS[kind])}</Text>
              <Text style={styles.rowValue}>{medals[kind] * MEDAL_POINTS[kind]}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('wallet.earned')}</Text>
            <Text style={styles.totalValue}>{earned}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('wallet.spent')}</Text>
            <Text style={styles.totalValue}>−{Math.min(spent, earned)}</Text>
          </View>
          <View style={[styles.totalRow, styles.balanceRow]}>
            <Text style={styles.balanceLabel}>{t('wallet.balance')}</Text>
            <Text style={styles.balanceValue}>{balance}</Text>
          </View>

          <Text style={styles.foot}>{t('wallet.foot')}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 34,
    },
    title: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    lead: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4, marginBottom: 14 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
    rowLabel: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    rowSum: { flex: 1, fontSize: 12, fontFamily: fontFamily('600'), color: theme.textMuted, textAlign: 'right' },
    rowValue: { minWidth: 48, fontSize: 15, fontFamily: fontFamily('800'), color: theme.text, textAlign: 'right' },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 9,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    totalLabel: { flex: 1, fontSize: 13, fontFamily: fontFamily('600'), color: theme.textMuted },
    totalValue: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
    balanceRow: { borderTopWidth: 1.5 },
    balanceLabel: { flex: 1, fontSize: 15, fontFamily: fontFamily('800'), color: theme.text },
    balanceValue: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.primary },
    foot: { fontSize: 11, lineHeight: 16, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 14 },
  });
}
