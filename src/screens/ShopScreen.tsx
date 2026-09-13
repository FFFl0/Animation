import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import Icon from '../components/Icon';
import AnimatedFrame from '../components/AnimatedFrame';
import { SHOP_SECTIONS, ShopItem, ShopSection, itemsOf } from '../shop/catalogue';
import { SHOP_IMAGES } from '../shop/shopImages';
import { formatRub } from '../shop/economy';
import { cartCount } from '../shop/cart';
import { useShop } from '../shop/ShopContext';

type Props = {
  onBack: () => void;
  onOpenItem: (itemId: string) => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
};

const GAP = 12;

export default function ShopScreen({ onBack, onOpenItem, onOpenCart, onOpenOrders }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { width } = useWindowDimensions();
  const { balance, cart, orders, ownsItem } = useShop();
  const [section, setSection] = useState<ShopSection>('digital');

  const cardWidth = (width - 40 - GAP) / 2;
  const items = itemsOf(section);
  const inCart = cartCount(cart);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <SoundTouchable onPress={onBack} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>{`‹ ${t('shop.back')}`}</Text>
        </SoundTouchable>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{t('shop.title')}</Text>
            <Text style={styles.pageSub}>{t('shop.subtitle')}</Text>
          </View>
          <SoundTouchable style={styles.cartButton} onPress={onOpenCart} accessibilityRole="button">
            <Icon name="gem" size={18} color={theme.text} />
            {inCart > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{inCart}</Text>
              </View>
            )}
          </SoundTouchable>
        </View>

        <View style={styles.walletRow}>
          <Icon name="medal" size={16} color={theme.primary} />
          <Text style={styles.walletText}>{t('shop.balance', balance)}</Text>
          {orders.length > 0 && (
            <SoundTouchable onPress={onOpenOrders} accessibilityRole="button">
              <Text style={styles.walletLink}>{t('shop.myOrders')}</Text>
            </SoundTouchable>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabStrip}
        contentContainerStyle={styles.tabs}
      >
        {SHOP_SECTIONS.map((key) => (
          <SoundTouchable
            key={key}
            style={[styles.tab, section === key && styles.tabActive]}
            onPress={() => setSection(key)}
          >
            <Text style={[styles.tabText, section === key && styles.tabTextActive]}>{t(`shop.section.${key}`)}</Text>
          </SoundTouchable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHint}>{t(`shop.sectionHint.${section}`)}</Text>

        <View style={styles.grid}>
          {items.map((item) => (
            <ShopCard
              key={item.id}
              item={item}
              width={cardWidth}
              owned={ownsItem(item.id)}
              styles={styles}
              theme={theme}
              t={t}
              language={language}
              onPress={() => onOpenItem(item.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const PREVIEW_BOX = { width: '100%', aspectRatio: 4 / 3 } as const;

export function itemTitle(item: ShopItem, language: string): string {
  return language === 'en' ? item.titleEn : item.title;
}

export function itemDescription(item: ShopItem, language: string): string {
  return language === 'en' ? item.descriptionEn : item.description;
}

/** The thumbnail: a photo for anything you can hold, the live frame otherwise. */
export function ItemPreview({ item, size, theme }: { item: ShopItem; size: number; theme: Theme }) {
  const image = SHOP_IMAGES[item.id];
  if (image) {
    return (
      <View style={PREVIEW_BOX}>
        <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }
  const avatar = Math.round(size * 0.46);
  return (
    <View style={[PREVIEW_BOX, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ width: avatar, height: avatar }}>
        <View
          style={{
            width: avatar,
            height: avatar,
            borderRadius: avatar / 2,
            backgroundColor: theme.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="character" size={Math.round(avatar * 0.5)} color={theme.textMuted} />
        </View>
        {item.grant.kind === 'animatedFrame' && <AnimatedFrame id={item.grant.frameId} size={avatar} />}
      </View>
    </View>
  );
}

function ShopCard({
  item,
  width,
  owned,
  styles,
  theme,
  t,
  language,
  onPress,
}: {
  item: ShopItem;
  width: number;
  owned: boolean;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  language: string;
  onPress: () => void;
}) {
  return (
    <SoundTouchable style={[styles.card, { width }]} onPress={onPress} activeOpacity={0.86}>
      <View style={styles.cardArt}>
        <ItemPreview item={item} size={width} theme={theme} />
      </View>
      {item.limited && (
        <View style={styles.limitedTag}>
          <Text style={styles.limitedTagText}>{t('shop.limited')}</Text>
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={2}>
        {itemTitle(item, language)}
      </Text>
      <View style={styles.priceRow}>
        {owned ? (
          <Text style={styles.ownedText}>{t('shop.owned')}</Text>
        ) : item.pricePoints !== undefined ? (
          <>
            <Icon name="medal" size={13} color={theme.primary} />
            <Text style={styles.pricePoints}>{item.pricePoints}</Text>
          </>
        ) : (
          <Text style={styles.priceRub}>{formatRub(item.priceRub ?? 0)}</Text>
        )}
      </View>
    </SoundTouchable>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: { paddingHorizontal: 20, paddingTop: 8 },
    back: { alignSelf: 'flex-start', paddingVertical: 6 },
    backText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.textMuted },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pageTitle: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text },
    pageSub: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    cartButton: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    cartBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 19,
      height: 19,
      borderRadius: 10,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },
    cartBadgeText: { fontSize: 11, fontFamily: fontFamily('800'), color: theme.onPrimary },
    walletRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
    walletText: { flex: 1, fontSize: 13, fontFamily: fontFamily('700'), color: theme.text },
    walletLink: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.primary },
    // flexGrow 0 keeps the strip at the height of its chips instead of
    // taking whatever vertical space the screen has left over
    tabStrip: { flexGrow: 0 },
    tabs: { gap: 8, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
    tab: {
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tabText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    tabTextActive: { color: theme.onPrimary },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    sectionHint: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginBottom: 14 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 10,
      minHeight: 200,
    },
    cardArt: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: theme.background },
    limitedTag: {
      position: 'absolute',
      top: 16,
      left: 16,
      backgroundColor: theme.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    limitedTagText: { fontSize: 9, fontFamily: fontFamily('800'), color: theme.onPrimary },
    cardTitle: { fontSize: 13, lineHeight: 16, fontFamily: fontFamily('800'), color: theme.text, marginTop: 10 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 'auto', paddingTop: 8 },
    pricePoints: { fontSize: 14, fontFamily: fontFamily('800'), color: theme.primary },
    priceRub: { fontSize: 14, fontFamily: fontFamily('800'), color: theme.text },
    ownedText: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.success },
  });
}
