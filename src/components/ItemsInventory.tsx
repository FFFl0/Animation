import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { useShop } from '../shop/ShopContext';
import { CONSUMABLE_IDS } from '../shop/consumables';
import { SHOP_IMAGES } from '../shop/shopImages';
import { CONSUMABLE_ART, CONSUMABLE_SHOP_ITEM } from '../shop/consumableLinks';

type Props = {
  onOpenItem: (itemId: string) => void;
};

/**
 * What the player has, and how each thing is used.
 *
 * Bought items used to vanish into a count nobody could see until the
 * button for them turned up mid-quiz — and the freeze never turned up
 * anywhere at all. This is the one place that lists all three, zeros
 * included, with a line on how each one is spent.
 */
export default function ItemsInventory({ onOpenItem }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { countOf } = useShop();

  return (
    <View style={styles.card} testID="items-inventory">
      <Text style={styles.title}>{t('items.title')}</Text>
      {CONSUMABLE_IDS.map((id, i) => {
        const count = countOf(id);
        return (
          <View key={id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <Image source={SHOP_IMAGES[CONSUMABLE_ART[id]]} style={styles.art} resizeMode="cover" />
            <View style={styles.text}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{t(`shop.consumable.${id}`)}</Text>
                <Text style={[styles.count, count === 0 && styles.countEmpty]}>{t('items.count', count)}</Text>
              </View>
              <Text style={styles.how}>{t(`items.how.${id}`)}</Text>
              <SoundTouchable
                onPress={() => onOpenItem(CONSUMABLE_SHOP_ITEM[id])}
                accessibilityRole="button"
                style={styles.more}
              >
                <Text style={styles.moreText}>{t('items.getMore')}</Text>
              </SoundTouchable>
            </View>
          </View>
        );
      })}
      <Text style={styles.footnote}>{t('items.whereFrom')}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 18,
    },
    title: { fontSize: 16, lineHeight: 21, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 6 },
    row: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
    rowDivider: { borderTopWidth: 1, borderTopColor: theme.border },
    // Both sides spelled out: with only a width and an aspect ratio, the
    // web build let the row stretch the picture to the whole column height.
    art: { width: 64, height: 48, borderRadius: radius.md },
    text: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    name: { flexShrink: 1, fontSize: 14, lineHeight: 19, fontFamily: fontFamily('800'), color: theme.text },
    count: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily('800'), color: theme.primary },
    countEmpty: { color: theme.textMuted },
    how: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    more: { alignSelf: 'flex-start', paddingVertical: 4, marginTop: 2 },
    moreText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily('800'), color: theme.primary },
    footnote: { fontSize: 11, lineHeight: 16, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 6 },
  });
}
