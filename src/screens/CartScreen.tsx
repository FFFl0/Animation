import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import Icon from '../components/Icon';
import { SHOP_IMAGES } from '../shop/shopImages';
import { formatRub, pointsPrice } from '../shop/economy';
import { cartItems, cartTotalPoints, cartTotalRub } from '../shop/cart';
import { Delivery, deliveryProblems } from '../shop/orders';
import { Currency, useShop } from '../shop/ShopContext';
import { itemTitle } from './ShopScreen';

type Props = {
  onBack: () => void;
  onOrdered: () => void;
};

const EMPTY_DELIVERY: Delivery = { name: '', phone: '', city: '', address: '', comment: '' };

export default function CartScreen({ onBack, onOrdered }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { buzz } = useSound();
  const { cart, balance, setQuantity, placeOrder } = useShop();
  const [delivery, setDelivery] = useState<Delivery>(EMPTY_DELIVERY);
  const [missing, setMissing] = useState<(keyof Delivery)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lines = cartItems(cart);
  const totalRub = cartTotalRub(cart);
  const totalPoints = cartTotalPoints(cart);
  const shortOnPoints = balance < totalPoints;
  const field = (key: keyof Delivery) => (value: string) => {
    setDelivery((current) => ({ ...current, [key]: value }));
    setMissing((current) => current.filter((k) => k !== key));
  };

  const checkout = async (currency: Currency) => {
    const problems = deliveryProblems(delivery);
    if (problems.length) {
      setMissing(problems);
      setError(t('shop.fillDelivery'));
      buzz('error');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await placeOrder(delivery, currency);
    setBusy(false);
    if (result.ok) {
      buzz('success');
      onOrdered();
      return;
    }
    buzz('error');
    setError(t(`shop.orderError.${result.reason}`));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SoundTouchable onPress={onBack} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>{`‹ ${t('shop.back')}`}</Text>
        </SoundTouchable>
        <Text style={styles.pageTitle}>{t('shop.cartTitle')}</Text>

        {!lines.length ? (
          <View style={styles.emptyWrap}>
            <Icon name="gem" size={30} color={theme.textMuted} />
            <Text style={styles.emptyText}>{t('shop.cartEmpty')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.listCard}>
              {lines.map(({ line, item }, i) => (
                <View key={`${line.itemId}-${line.size ?? ''}`} style={[styles.row, i > 0 && styles.rowDivided]}>
                  {SHOP_IMAGES[item.id] && (
                    <Image source={SHOP_IMAGES[item.id]} style={styles.thumb} resizeMode="cover" />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {itemTitle(item, language)}
                    </Text>
                    {line.size && <Text style={styles.rowMeta}>{t('shop.sizeIs', line.size)}</Text>}
                    <Text style={styles.rowPrice}>
                      {pointsPrice(item.priceRub)} · {formatRub(item.priceRub)}
                    </Text>
                  </View>
                  <View style={styles.stepper}>
                    <SoundTouchable
                      style={styles.stepButton}
                      onPress={() => setQuantity(line.itemId, line.size, line.quantity - 1)}
                    >
                      <Text style={styles.stepText}>−</Text>
                    </SoundTouchable>
                    <Text style={styles.quantity}>{line.quantity}</Text>
                    <SoundTouchable
                      style={styles.stepButton}
                      onPress={() => setQuantity(line.itemId, line.size, line.quantity + 1)}
                    >
                      <Text style={styles.stepText}>+</Text>
                    </SoundTouchable>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('shop.total')}</Text>
              <View style={styles.totalPointsRow}>
                <Icon name="gem" size={17} color={theme.primary} />
                <Text style={styles.totalPoints}>{totalPoints}</Text>
                <Text style={styles.totalValue}>· {formatRub(totalRub)}</Text>
              </View>
            </View>
            <Text style={styles.balanceNote}>{t('shop.balance', balance)}</Text>

            <Text style={styles.sectionTitle}>{t('shop.delivery')}</Text>
            <Field label={t('shop.name')} value={delivery.name} onChange={field('name')} bad={missing.includes('name')} styles={styles} theme={theme} />
            <Field
              label={t('shop.phone')}
              value={delivery.phone}
              onChange={field('phone')}
              bad={missing.includes('phone')}
              keyboardType="phone-pad"
              styles={styles}
              theme={theme}
            />
            <Field label={t('shop.city')} value={delivery.city} onChange={field('city')} bad={missing.includes('city')} styles={styles} theme={theme} />
            <Field
              label={t('shop.address')}
              value={delivery.address}
              onChange={field('address')}
              bad={missing.includes('address')}
              multiline
              styles={styles}
              theme={theme}
            />
            <Field label={t('shop.comment')} value={delivery.comment ?? ''} onChange={field('comment')} styles={styles} theme={theme} />

            {error && <Text style={styles.error}>{error}</Text>}

            {/* the currency is picked once, here, rather than per item */}
            <SoundTouchable
              style={[styles.primaryButton, (busy || shortOnPoints) && styles.buttonDisabled]}
              onPress={() => checkout('points')}
              disabled={busy || shortOnPoints}
              activeOpacity={0.88}
            >
              {busy ? (
                <ActivityIndicator color={theme.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('shop.placeOrderPoints', totalPoints)}</Text>
              )}
            </SoundTouchable>
            <SoundTouchable
              style={[styles.secondaryButton, busy && styles.buttonDisabled]}
              onPress={() => checkout('rub')}
              disabled={busy}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryButtonText}>{t('shop.placeOrder', formatRub(totalRub))}</Text>
            </SoundTouchable>
            <Text style={styles.footNote}>{t('shop.checkoutFootnote')}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  bad,
  multiline,
  keyboardType,
  styles,
  theme,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  bad?: boolean;
  multiline?: boolean;
  keyboardType?: 'phone-pad';
  styles: Styles;
  theme: Theme;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputTall, bad && styles.inputBad]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor={theme.textMuted}
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },
    back: { alignSelf: 'flex-start', paddingVertical: 6 },
    backText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.textMuted },
    pageTitle: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 16 },
    emptyWrap: { alignItems: 'center', gap: 10, paddingVertical: 60 },
    emptyText: { fontSize: 14, fontFamily: fontFamily('600'), color: theme.textMuted },
    listCard: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    rowDivided: { borderTopWidth: 1, borderTopColor: theme.border },
    thumb: { width: 56, height: 42, borderRadius: radius.md },
    rowTitle: { fontSize: 13, lineHeight: 17, fontFamily: fontFamily('700'), color: theme.text },
    rowMeta: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 2 },
    rowPrice: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.textMuted, marginTop: 2 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.background,
    },
    stepText: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text },
    quantity: { minWidth: 18, textAlign: 'center', fontSize: 14, fontFamily: fontFamily('800'), color: theme.text },
    totalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
    totalLabel: { flex: 1, fontSize: 15, fontFamily: fontFamily('700'), color: theme.textMuted },
    totalValue: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    totalPointsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    totalPoints: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.primary },
    balanceNote: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 4, textAlign: 'right' },
    sectionTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text, marginTop: 24 },
    fieldLabel: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted, marginBottom: 6 },
    input: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: fontFamily('600'),
      color: theme.text,
    },
    inputTall: { minHeight: 76, textAlignVertical: 'top' },
    inputBad: { borderColor: theme.danger },
    error: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.danger, marginTop: 14, textAlign: 'center' },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: radius.lg,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    primaryButtonText: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.onPrimary },
    secondaryButton: {
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 10,
    },
    secondaryButtonText: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text },
    buttonDisabled: { opacity: 0.6 },
    footNote: { fontSize: 11, lineHeight: 16, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 10, textAlign: 'center' },
  });
}
