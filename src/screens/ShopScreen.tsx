import { useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import Icon from '../components/Icon';
import AnimatedFrame from '../components/AnimatedFrame';
import AnimatedAvatar from '../components/AnimatedAvatar';
import WalletSheet from '../components/WalletSheet';
import {
  SHOP_SECTIONS,
  SHOP_TABS,
  ShopItem,
  ShopSection,
  ShopTab,
  byPopularity,
  itemsOf,
  needsDelivery,
} from '../shop/catalogue';
import { DIGITAL_RUB_ENABLED } from '../shop/payment';
import { SHOP_IMAGES } from '../shop/shopImages';
import { formatRub, pointsPrice } from '../shop/economy';
import { cartCount } from '../shop/cart';
import { useShop } from '../shop/ShopContext';

const HERO = require('../../assets/shop/hero.jpg');

type Props = {
  onBack: () => void;
  onOpenItem: (itemId: string) => void;
  onOpenCart: () => void;
  onOpenOrders: () => void;
  /** Which tab is open. Held by the navigator rather than here: this screen
   * unmounts while an item is on screen, so its own state would be gone by
   * the time the shopper came back. */
  tab: ShopTab;
  onChangeTab: (tab: ShopTab) => void;
  /** Where the page was scrolled to. Held by the navigator for the same
   * reason as the tab: opening an item unmounts this screen, and a shopper
   * sent back to the top after every look is being punished for browsing. */
  scrollY: number;
  onChangeScrollY: (y: number) => void;
};

const GAP = 10;
/** Круглые картинки встают по четыре в ряд, прямоугольные — по две. */
const COLUMNS: Record<ShopSection, number> = { merch: 2, avatars: 4, frames: 4, items: 2 };

export default function ShopScreen({
  onBack,
  onOpenItem,
  onOpenCart,
  onOpenOrders,
  tab,
  onChangeTab,
  scrollY,
  onChangeScrollY,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { balance, spent, medals, cart, orders, ownsItem } = useShop();
  const [walletOpen, setWalletOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // Restoring has to wait for the content to have a height, or there is
  // nothing to scroll within yet; once done it must not repeat, or every
  // image that finishes loading would yank the page back.
  const restoredRef = useRef(false);

  /**
   * What the grid shows, as one or more blocks.
   *
   * "all" lists every shelf in turn rather than merging them into one grid:
   * a round avatar sits four to a row and a t-shirt two, so a single grid
   * would have to pick one and make the other look wrong.
   */
  const blocks = useMemo(
    () =>
      (tab === 'all' ? SHOP_SECTIONS : [tab])
        .map((key) => ({ key, items: byPopularity(itemsOf(key)) }))
        .filter((block) => block.items.length > 0),
    [tab]
  );

  const inCart = cartCount(cart);

  const widthFor = (key: ShopSection) => {
    const columns = COLUMNS[key];
    return { columns, cardWidth: (width - 40 - GAP * (columns - 1)) / columns };
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        onScroll={(e) => onChangeScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={64}
        onContentSizeChange={(_w, height) => {
          if (restoredRef.current || scrollY <= 0) return;
          // Only once the page is tall enough to hold the old position —
          // before that the scroll would be clamped to the top and lost.
          if (height < scrollY) return;
          restoredRef.current = true;
          scrollRef.current?.scrollTo({ y: scrollY, animated: false });
        }}
      >
        <View style={styles.hero}>
          {/* explicit size, not absoluteFill: without one the image lays out at
              its own pixel size and the parent just crops the top-left of it */}
          <Image source={HERO} style={styles.heroImage} resizeMode="cover" />
          <HeroFade theme={theme} />
          {/* The artwork deliberately runs under the status bar — the screen
              takes no top inset — but the controls on top of it must not, or
              they land under the clock and the battery. */}
          <View style={[styles.heroTop, { paddingTop: insets.top + 14 }]}>
            <SoundTouchable onPress={onBack} style={styles.heroButton} accessibilityRole="button">
              <Text style={styles.heroBack}>‹</Text>
            </SoundTouchable>
            <View style={{ flex: 1 }} />
            <SoundTouchable style={styles.heroButton} onPress={onOpenCart} accessibilityRole="button">
              <Icon name="gem" size={17} color="#FFFFFF" />
              {inCart > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{inCart}</Text>
                </View>
              )}
            </SoundTouchable>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{t('shop.title')}</Text>
            <Text style={styles.heroSubtitle}>{t('shop.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.walletRow}>
          {/* the balance opens its own arithmetic: where the points came from */}
          <SoundTouchable style={styles.walletTap} onPress={() => setWalletOpen(true)} accessibilityRole="button">
            <Icon name="medal" size={16} color={theme.primary} />
            <Text style={styles.walletText}>{t('shop.balance', balance)}</Text>
            <Icon name="chevronRight" size={13} color={theme.textMuted} />
          </SoundTouchable>
          <View style={{ flex: 1 }} />
          <SoundTouchable onPress={onOpenOrders} accessibilityRole="button">
            <Text style={styles.walletLink}>{t('shop.myOrders')}</Text>
          </SoundTouchable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabStrip}
          contentContainerStyle={styles.tabs}
        >
          {SHOP_TABS.map((key) => (
            <SoundTouchable
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => {
                // A new shelf starts at its top; the remembered position
                // belongs to the shelf it was taken from.
                onChangeTab(key);
                onChangeScrollY(0);
                restoredRef.current = true;
                scrollRef.current?.scrollTo({ y: 0, animated: false });
              }}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{t(`shop.section.${key}`)}</Text>
            </SoundTouchable>
          ))}
        </ScrollView>

        <View style={styles.body}>
          {tab !== 'all' && (
            <View style={styles.promo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.promoTitle}>{t(`shop.promoTitle.${tab}`)}</Text>
                <Text style={styles.promoText}>{t(`shop.promoText.${tab}`)}</Text>
              </View>
              <Icon name="sparkles" size={26} color={theme.primary} />
            </View>
          )}

          {blocks.map((block) => {
            const { columns, cardWidth } = widthFor(block.key);
            return (
              <View key={block.key}>
                <View style={styles.rowHead}>
                  <Icon name="sparkles" size={17} color={theme.primary} />
                  <Text style={styles.rowHeadTitle}>
                    {tab === 'all' ? t(`shop.section.${block.key}`) : t('shop.everything')}
                  </Text>
                </View>

                <View style={styles.grid}>
                  {block.items.map((item) => (
                    <ShopCard
                      key={item.id}
                      item={item}
                      width={cardWidth}
                      round={columns === 4}
                      owned={ownsItem(item.id)}
                      styles={styles}
                      theme={theme}
                      t={t}
                      language={language}
                      onPress={() => onOpenItem(item.id)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <WalletSheet
        visible={walletOpen}
        onClose={() => setWalletOpen(false)}
        medals={medals}
        spent={spent}
        balance={balance}
      />
    </SafeAreaView>
  );
}

export function itemTitle(item: ShopItem, language: string): string {
  return language === 'en' ? item.titleEn : item.title;
}

export function itemDescription(item: ShopItem, language: string): string {
  return language === 'en' ? item.descriptionEn : item.description;
}

/**
 * Melts the bottom of the artwork into the page. Without it the hero ends
 * on a hard line across the screen; with it the picture just runs out.
 *
 * The gradient is the page's own background colour rather than black, so it
 * lands on whatever the theme is instead of bruising a light one — and it
 * only reaches full opacity at the very bottom, leaving the title above it
 * with dark enough artwork behind to stay legible.
 */
function HeroFade({ theme }: { theme: Theme }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="shopHeroFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.background} stopOpacity="0" />
          <Stop offset="0.62" stopColor={theme.background} stopOpacity="0" />
          <Stop offset="0.86" stopColor={theme.background} stopOpacity="0.42" />
          <Stop offset="1" stopColor={theme.background} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#shopHeroFade)" />
    </Svg>
  );
}

const PREVIEW_BOX = { width: '100%', aspectRatio: 4 / 3 } as const;

/** The picture: a photo for anything you can hold, the live thing otherwise. */
export function ItemPreview({ item, size, theme }: { item: ShopItem; size: number; theme: Theme }) {
  const image = SHOP_IMAGES[item.id];
  if (image) {
    return (
      <View style={PREVIEW_BOX}>
        <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }

  if (item.grant.kind === 'animatedAvatar') {
    return <AnimatedAvatar id={item.grant.avatarId} size={size} />;
  }

  if (item.grant.kind === 'animatedFrame') {
    const inner = Math.round(size * 0.78);
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: theme.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="character" size={Math.round(inner * 0.5)} color={theme.textMuted} />
        </View>
        <View style={{ position: 'absolute', width: inner, height: inner }}>
          <AnimatedFrame id={item.grant.frameId} size={inner} />
        </View>
      </View>
    );
  }

  // a consumable: a plain glyph, because there is nothing to photograph
  const glyph = item.grant.kind === 'consumable' ? CONSUMABLE_ICON[item.grant.consumable] : 'gem';
  return (
    <View style={[PREVIEW_BOX, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }]}>
      <Icon name={glyph} size={Math.round(size * 0.3)} color={theme.primary} />
    </View>
  );
}

const CONSUMABLE_ICON = {
  hint5050: 'sparkles',
  skipQuestion: 'shuffle',
  streakFreeze: 'flame',
} as const;

function ShopCard({
  item,
  width,
  round,
  owned,
  styles,
  theme,
  t,
  language,
  onPress,
}: {
  item: ShopItem;
  width: number;
  round: boolean;
  owned: boolean;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  language: string;
  onPress: () => void;
}) {
  const art = round ? width - 20 : width - 20;
  return (
    <SoundTouchable style={[styles.card, { width }]} onPress={onPress} activeOpacity={0.86}>
      <View style={[styles.cardArt, round && { borderRadius: art / 2, alignSelf: 'center' }]}>
        <ItemPreview item={item} size={art} theme={theme} />
        {/* the play mark says "this one moves" — same as a video thumbnail */}
        {item.grant.kind !== 'physical' && item.grant.kind !== 'consumable' && (
          <View style={styles.playBadge}>
            <Icon name="play" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>
      {item.limited && (
        <View style={styles.limitedTag}>
          <Text style={styles.limitedTagText}>{t('shop.limited')}</Text>
        </View>
      )}
      <Text style={[styles.cardTitle, round && { textAlign: 'center' }]} numberOfLines={2}>
        {itemTitle(item, language)}
      </Text>
      {owned ? (
        <View style={[styles.priceRow, round && styles.priceRowCentred]}>
          <Text style={styles.ownedText}>{t('shop.owned')}</Text>
        </View>
      ) : (
        // Both prices, because either one buys it. On a narrow round card
        // they stack rather than fighting for one line.
        <View style={round ? styles.priceStack : styles.priceRow}>
          <View style={[styles.priceRow, round && styles.priceRowCentred]}>
            <Icon name="gem" size={12} color={theme.primary} />
            <Text style={styles.pricePoints}>{pointsPrice(item.priceRub)}</Text>
          </View>
          {(needsDelivery(item) || DIGITAL_RUB_ENABLED) && (
            <Text style={[styles.priceRub, round && { textAlign: 'center' }]}>{formatRub(item.priceRub)}</Text>
          )}
        </View>
      )}
    </SoundTouchable>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    scroll: { paddingBottom: 40 },
    hero: { height: 300, overflow: 'hidden' },
    heroImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
    // paddingTop is applied at the call site, which is where the device's
    // status-bar inset is known.
    heroTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    heroButton: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
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
    heroBack: { fontSize: 24, lineHeight: 26, fontFamily: fontFamily('800'), color: '#FFFFFF' },
    heroText: { paddingHorizontal: 20, paddingTop: 10 },
    heroTitle: {
      fontSize: 34,
      fontFamily: fontFamily('800'),
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.55)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 8,
    },
    heroSubtitle: {
      fontSize: 13,
      fontFamily: fontFamily('600'),
      color: 'rgba(255,255,255,0.9)',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    walletRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 4 },
    walletTap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    walletText: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text },
    walletLink: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.primary },
    tabStrip: { flexGrow: 0 },
    tabs: { gap: 8, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
    tab: {
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tabText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    tabTextActive: { color: theme.onPrimary },
    body: { paddingHorizontal: 20 },
    promo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.primaryLight,
      borderRadius: radius.lg,
      padding: 16,
    },
    promoTitle: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text },
    promoText: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    rowHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, marginBottom: 12 },
    rowHeadTitle: { flex: 1, fontSize: 17, fontFamily: fontFamily('800'), color: theme.text },
    rowHeadLink: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.primary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 10,
    },
    cardArt: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: theme.background },
    playBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    limitedTag: {
      position: 'absolute',
      top: 14,
      left: 14,
      backgroundColor: theme.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    limitedTagText: { fontSize: 9, fontFamily: fontFamily('800'), color: theme.onPrimary },
    cardTitle: { fontSize: 12, lineHeight: 15, fontFamily: fontFamily('800'), color: theme.text, marginTop: 9 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    priceRowCentred: { justifyContent: 'center' },
    priceStack: { marginTop: 5 },
    pricePoints: { fontSize: 13, fontFamily: fontFamily('800'), color: theme.primary },
    priceRub: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted },
    ownedText: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.success },
  });
}
