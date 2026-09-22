import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import Icon from '../components/Icon';
import { shopItem } from '../shop/catalogue';
import { CONSUMABLE_IDS } from '../shop/consumables';
import { formatRub } from '../shop/economy';
import { useShop } from '../shop/ShopContext';
import { itemTitle } from './ShopScreen';

type Props = {
  onBack: () => void;
  onOpenItem: (itemId: string) => void;
};

export default function OrdersScreen({ onBack, onOpenItem }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { orders, owned, counts } = useShop();

  const ownedItems = owned.flatMap((id) => {
    const item = shopItem(id);
    return item ? [item] : [];
  });

  const stock = CONSUMABLE_IDS.filter((id) => (counts[id] ?? 0) > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <SoundTouchable onPress={onBack} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>{`‹ ${t('shop.back')}`}</Text>
        </SoundTouchable>
        <Text style={styles.pageTitle}>{t('shop.ordersTitle')}</Text>

        {ownedItems.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('shop.ownedTitle')}</Text>
            <View style={styles.listCard}>
              {ownedItems.map((item, i) => (
                <SoundTouchable
                  key={item.id}
                  style={[styles.row, i > 0 && styles.rowDivided]}
                  onPress={() => onOpenItem(item.id)}
                >
                  <Icon name="sparkles" size={17} color={theme.primary} />
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {itemTitle(item, language)}
                  </Text>
                  <Icon name="chevronRight" size={14} color={theme.textMuted} />
                </SoundTouchable>
              ))}
            </View>
          </>
        )}

        {stock.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t('shop.stockTitle')}</Text>
            <View style={styles.listCard}>
              {stock.map((id, i) => (
                <View key={id} style={[styles.row, i > 0 && styles.rowDivided]}>
                  <Icon name="gem" size={17} color={theme.primary} />
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {t(`shop.consumable.${id}`)}
                  </Text>
                  <Text style={styles.rowCount}>{counts[id]}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>{t('shop.parcelsTitle')}</Text>
        {!orders.length ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>{t('shop.noOrders')}</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.card}>
              <View style={styles.orderHead}>
                <Text style={styles.orderDate}>{order.createdAt.slice(0, 10)}</Text>
                <View style={[styles.statusTag, order.status === 'awaitingPayment' && styles.statusTagWaiting]}>
                  <Text style={styles.statusTagText}>{t(`shop.status.${order.status}`)}</Text>
                </View>
              </View>
              {order.lines.map((line) => {
                const item = shopItem(line.itemId);
                if (!item) return null;
                return (
                  <Text key={`${line.itemId}-${line.size ?? ''}`} style={styles.orderLine}>
                    {itemTitle(item, language)}
                    {line.size ? ` · ${line.size}` : ''} × {line.quantity}
                  </Text>
                );
              })}
              <Text style={styles.orderTotal}>
                {order.totalPoints > 0 ? t('shop.pointsPrice', order.totalPoints) : formatRub(order.totalRub)}
              </Text>
              <Text style={styles.orderAddress} numberOfLines={2}>
                {order.delivery.city}, {order.delivery.address}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    back: { alignSelf: 'flex-start', paddingVertical: 6 },
    backText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.textMuted },
    pageTitle: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text },
    sectionTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text, marginTop: 22, marginBottom: 10 },
    listCard: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
    rowDivided: { borderTopWidth: 1, borderTopColor: theme.border },
    rowTitle: { flex: 1, fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    rowCount: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.primary },
    card: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 10,
      gap: 4,
    },
    cardText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted },
    orderHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    orderDate: { flex: 1, fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    statusTag: { backgroundColor: theme.primaryLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    statusTagWaiting: { backgroundColor: theme.background },
    statusTagText: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.text },
    orderLine: { fontSize: 13, fontFamily: fontFamily('600'), color: theme.text },
    orderTotal: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text, marginTop: 6 },
    orderAddress: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
  });
}
