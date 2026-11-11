import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { SHOP_IMAGES } from '../shop/shopImages';
import { StreakState, streakOutlook } from '../data/streakFreeze';

type Props = {
  streak: StreakState;
  freezes: number;
  onOpenShop: () => void;
};

/** Below this a streak is not worth nagging about buying protection for. */
const WORTH_PROTECTING = 3;

/**
 * What the streak freezes are doing, under the streak card.
 *
 * A freeze works by itself, which used to mean it worked invisibly: it was
 * bought, it disappeared, and the only sign of it was a streak that had not
 * reset. This says how many there are, warns when days have been missed
 * and whether the freezes will cover them — before the round that decides
 * it, not after.
 */
export default function StreakFreezeRow({ streak, freezes, onOpenShop }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const outlook = streakOutlook(streak, freezes);

  let text: string | null = null;
  let warn = false;
  let offerShop = false;
  switch (outlook.kind) {
    case 'safe':
      if (freezes > 0) text = t('items.freezeSafe', freezes);
      else if (streak.count >= WORTH_PROTECTING) {
        text = t('items.freezeNone');
        offerShop = true;
      }
      break;
    case 'rescuable':
      text = t('items.freezeRescuable', outlook.missed);
      warn = true;
      break;
    case 'broken':
      text = t('items.freezeBroken', outlook.missed, freezes);
      warn = true;
      break;
    default:
      if (freezes > 0) text = t('items.freezeSafe', freezes);
  }

  if (!text) return null;

  return (
    <View style={[styles.row, warn && styles.rowWarn]} testID="streak-freeze-row">
      <Image source={SHOP_IMAGES['item-freeze']} style={styles.art} resizeMode="cover" />
      <Text style={styles.text}>{text}</Text>
      {offerShop && (
        <SoundTouchable onPress={onOpenShop} accessibilityRole="button" style={styles.link}>
          <Text style={styles.linkText}>{t('items.freezeShop')}</Text>
        </SoundTouchable>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: -6,
      marginBottom: 14,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    rowWarn: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    art: { width: 36, height: 36, borderRadius: radius.sm },
    text: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: fontFamily('600'), color: theme.text },
    link: { paddingVertical: 6, paddingLeft: 4 },
    linkText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily('800'), color: theme.primary },
  });
}
