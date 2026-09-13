import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/Icon';
import { APPAREL_SIZES, ApparelSize, isStackable, needsDelivery, shopItem } from '../shop/catalogue';
import { formatRub, pointsPrice } from '../shop/economy';
import { Currency, useShop } from '../shop/ShopContext';
import { DIGITAL_RUB_ENABLED } from '../shop/payment';
import { ItemPreview, itemDescription, itemTitle } from './ShopScreen';

type Props = {
  itemId: string;
  onBack: () => void;
  onOpenCart: () => void;
};

export default function ShopItemScreen({ itemId, onBack, onOpenCart }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { buzz } = useSound();
  const { profile, updateAvatar } = useAuth();
  const { balance, ownsItem, countOf, buyDigital, addToCart } = useShop();
  const [size, setSize] = useState<ApparelSize>('M');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const item = shopItem(itemId);
  if (!item || !profile) return null;

  const stacks = isStackable(item);
  const owned = !stacks && ownsItem(item.id);
  const physical = needsDelivery(item);
  const points = pointsPrice(item.priceRub);
  // Cosmetics are sold for medals only while the store rule applies — see
  // DIGITAL_RUB_ENABLED. Showing a price nobody can pay would be a lie.
  const takesRub = physical || DIGITAL_RUB_ENABLED;
  // an owned item has nothing left to be short of
  const missing = owned ? 0 : Math.max(0, points - balance);
  const inStock = item.grant.kind === 'consumable' ? countOf(item.grant.consumable) : 0;
  const equipped =
    (item.grant.kind === 'animatedFrame' && profile.avatar.animatedFrameId === item.grant.frameId) ||
    (item.grant.kind === 'animatedAvatar' && profile.avatar.animatedAvatarId === item.grant.avatarId);

  const buy = async (currency: Currency) => {
    setBusy(true);
    setMessage(null);
    const result = await buyDigital(item, currency);
    setBusy(false);
    if (result.ok) {
      buzz('success');
      setMessage(t('shop.bought'));
      return;
    }
    buzz('error');
    setMessage(t(`shop.buyError.${result.reason}`));
  };

  const equip = () => {
    buzz('tap');
    if (item.grant.kind === 'animatedFrame') {
      updateAvatar({ avatar: { ...profile.avatar, animatedFrameId: equipped ? undefined : item.grant.frameId } });
    } else if (item.grant.kind === 'animatedAvatar') {
      updateAvatar({ avatar: { ...profile.avatar, animatedAvatarId: equipped ? undefined : item.grant.avatarId } });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <SoundTouchable onPress={onBack} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>{`‹ ${t('shop.back')}`}</Text>
        </SoundTouchable>

        <View style={styles.hero}>
          <ItemPreview item={item} size={320} theme={theme} />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{itemTitle(item, language)}</Text>
          {item.limited && (
            <View style={styles.limitedTag}>
              <Text style={styles.limitedTagText}>{t('shop.limited')}</Text>
            </View>
          )}
        </View>
        <Text style={styles.description}>{itemDescription(item, language)}</Text>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Icon name="gem" size={20} color={theme.primary} />
            <Text style={styles.pricePoints}>{t('shop.pointsPrice', points)}</Text>
            {takesRub && (
              <>
                <Text style={styles.priceOr}>{t('shop.or')}</Text>
                <Text style={styles.priceRub}>{formatRub(item.priceRub)}</Text>
              </>
            )}
          </View>
          <Text style={styles.priceNote}>{t(physical ? 'shop.deliveryNote' : 'shop.digitalNote')}</Text>
          <Text style={styles.priceNote}>{t('shop.balance', balance)}</Text>
          {missing > 0 && <Text style={styles.shortNote}>{t('shop.shortBy', missing)}</Text>}
          {inStock > 0 && <Text style={styles.priceNote}>{t('shop.inStock', inStock)}</Text>}
        </View>

        {item.sizes && (
          <>
            <Text style={styles.label}>{t('shop.size')}</Text>
            <View style={styles.sizeRow}>
              {APPAREL_SIZES.map((option) => (
                <SoundTouchable
                  key={option}
                  style={[styles.sizeChip, size === option && styles.sizeChipActive]}
                  onPress={() => setSize(option)}
                >
                  <Text style={[styles.sizeChipText, size === option && styles.sizeChipTextActive]}>{option}</Text>
                </SoundTouchable>
              ))}
            </View>
          </>
        )}

        {message && <Text style={styles.message}>{message}</Text>}

        {owned ? (
          <>
            <View style={styles.ownedBanner}>
              <Icon name="check" size={16} color={theme.success} />
              <Text style={styles.ownedBannerText}>{t('shop.owned')}</Text>
            </View>
            <SoundTouchable style={[styles.primaryButton, equipped && styles.ghostOutline]} onPress={equip} activeOpacity={0.88}>
              <Text style={[styles.primaryButtonText, equipped && styles.ghostOutlineText]}>
                {t(equipped ? 'shop.unequip' : 'shop.equip')}
              </Text>
            </SoundTouchable>
          </>
        ) : physical ? (
          <SoundTouchable
            style={styles.primaryButton}
            onPress={() => {
              buzz('tap');
              addToCart(item, item.sizes ? size : undefined);
              onOpenCart();
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryButtonText}>{t('shop.addToCart')}</Text>
          </SoundTouchable>
        ) : (
          <>
            <SoundTouchable
              style={[styles.primaryButton, (busy || missing > 0) && styles.buttonDisabled]}
              onPress={() => buy('points')}
              activeOpacity={0.88}
              disabled={busy || missing > 0}
            >
              <Text style={styles.primaryButtonText}>{t('shop.buyForPoints', points)}</Text>
            </SoundTouchable>
            {takesRub && (
              <SoundTouchable
                style={[styles.secondaryButton, busy && styles.buttonDisabled]}
                onPress={() => buy('rub')}
                activeOpacity={0.88}
                disabled={busy}
              >
                <Text style={styles.secondaryButtonText}>{t('shop.buyForRub', formatRub(item.priceRub))}</Text>
              </SoundTouchable>
            )}
          </>
        )}

        {physical && <Text style={styles.footNote}>{t('shop.physicalFootnote')}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    back: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 6 },
    backText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.textMuted },
    hero: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
    title: { flex: 1, fontSize: 22, fontFamily: fontFamily('800'), color: theme.text },
    limitedTag: { backgroundColor: theme.primary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
    limitedTagText: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.onPrimary },
    description: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 6 },
    priceCard: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 16,
      gap: 4,
    },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    priceOr: { fontSize: 13, fontFamily: fontFamily('600'), color: theme.textMuted },
    pricePoints: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.primary },
    priceRub: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    priceNote: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
    shortNote: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.danger },
    label: { fontSize: 13, fontFamily: fontFamily('800'), color: theme.text, marginTop: 18, marginBottom: 8 },
    sizeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    sizeChip: {
      minWidth: 52,
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingVertical: 10,
    },
    sizeChipActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    sizeChipText: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.textMuted },
    sizeChipTextActive: { color: theme.primary },
    message: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text, marginTop: 16, textAlign: 'center' },
    ownedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 18,
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    ownedBannerText: { fontSize: 13, fontFamily: fontFamily('800'), color: theme.text },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: radius.lg,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 16,
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
    buttonDisabled: { opacity: 0.5 },
    ghostOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.border },
    ghostOutlineText: { color: theme.text },
    footNote: { fontSize: 11, lineHeight: 16, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 12, textAlign: 'center' },
  });
}
