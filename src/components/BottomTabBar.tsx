import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import SoundTouchable from '../sound/SoundTouchable';
import Icon, { IconName } from './Icon';
import { useT } from '../i18n/strings';
import { useNotifications } from '../notifications/NotificationsContext';

export type TabKey = 'home' | 'chats' | 'stats' | 'shop' | 'achievements' | 'profile';

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  theme: Theme;
};

/**
 * Which tab the indicator should sit over.
 *
 * Falls back to the first tab for a key that is not in the bar: the bar is
 * only drawn for screens that have a tab, but a key it does not know would
 * otherwise put the indicator off the left edge rather than anywhere
 * sensible.
 */
export function activeTabIndex(keys: TabKey[], active: TabKey): number {
  const index = keys.indexOf(active);
  return index < 0 ? 0 : index;
}

export default function BottomTabBar({ active, onChange, theme }: Props) {
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme, insets.bottom);
  const t = useT();
  const { badgeCount, unreadMessages } = useNotifications();
  const [barWidth, setBarWidth] = useState(0);

  const TABS: { key: TabKey; label: string; icon: IconName; badge?: number }[] = [
    { key: 'home', label: t('tabs.home'), icon: 'home' },
    // Friends moved behind the Chats screen's own header button, the way a
    // messenger keeps contacts one step off the conversation list. Its badge
    // rides along here so a friend request is still visible from the bar.
    { key: 'chats', label: t('tabs.chats'), icon: 'chat', badge: unreadMessages + badgeCount },
    { key: 'stats', label: t('tabs.stats'), icon: 'stats' },
    { key: 'shop', label: t('tabs.shop'), icon: 'gem' },
    { key: 'achievements', label: t('tabs.achievements'), icon: 'medal' },
    { key: 'profile', label: t('tabs.profile'), icon: 'user' },
  ];

  const activeIndex = activeTabIndex(
    TABS.map((tab) => tab.key),
    active
  );
  const tabWidth = barWidth / TABS.length;

  const slide = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  useEffect(() => {
    if (!tabWidth) return;
    const target = activeIndex * tabWidth;
    // The first position is where the indicator already belongs — sliding in
    // from the left on every mount would animate something that did not move.
    if (!placed.current) {
      placed.current = true;
      slide.setValue(target);
      return;
    }
    Animated.spring(slide, { toValue: target, friction: 11, tension: 90, useNativeDriver: true }).start();
  }, [activeIndex, tabWidth, slide]);

  const onBarLayout = (e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.bar} onLayout={onBarLayout}>
      {tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicatorSlot, { width: tabWidth, transform: [{ translateX: slide }] }]}
        >
          <View style={[styles.indicator, { backgroundColor: theme.primary }]} />
        </Animated.View>
      )}

      {TABS.map((tab) => (
        <TabButton
          key={tab.key}
          label={tab.label}
          icon={tab.icon}
          badge={tab.badge}
          isActive={tab.key === active}
          onPress={() => onChange(tab.key)}
          styles={styles}
          theme={theme}
        />
      ))}
    </View>
  );
}

/**
 * One tab, which owns its own animation.
 *
 * Each button holding its own value rather than the bar holding six is what
 * keeps this a plain component instead of an array of hooks: a tab animates
 * because its own `isActive` changed, and nothing else needs to know.
 */
function TabButton({
  label,
  icon,
  badge,
  isActive,
  onPress,
  styles,
  theme,
}: {
  label: string;
  icon: IconName;
  badge?: number;
  isActive: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
}) {
  const lift = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(lift, { toValue: isActive ? 1 : 0, friction: 7, tension: 120, useNativeDriver: true }).start();
  }, [isActive, lift]);

  const handlePress = () => {
    // Fires on every press, including the active tab, so the bar answers
    // even when there is no screen change to show for it.
    press.setValue(1);
    Animated.timing(press, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    onPress();
  };

  // The dip from a press is added to the lift rather than replacing it, so
  // pressing the tab you are already on still dips and springs back.
  const scale = Animated.add(
    lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }),
    press.interpolate({ inputRange: [0, 1], outputRange: [0, -0.14] })
  );
  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const labelOpacity = lift.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });

  return (
    <SoundTouchable style={styles.tab} onPress={handlePress} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <Icon
          name={icon}
          size={20}
          color={isActive ? theme.primary : theme.textMuted}
          strokeWidth={isActive ? 2 : 1.7}
        />
        {!!badge && (
          <View style={[styles.badge, { backgroundColor: theme.danger }]}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </Animated.View>
      <Animated.Text style={[styles.label, isActive && styles.labelActive, { opacity: labelOpacity }]}>
        {label}
      </Animated.Text>
    </SoundTouchable>
  );
}

function makeStyles(theme: Theme, bottomInset: number) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
      // Falls back to a fixed value on devices/platforms that report no
      // inset (e.g. an iPhone with a home button, or web) — the previous
      // hardcoded 22 was tuned for that case and is kept as the floor.
      paddingBottom: Math.max(bottomInset, 8) + 14,
    },
    // Sits on the bar's own top border and is as wide as one tab, so the
    // line inside it only has to be centred to land under the right icon.
    indicatorSlot: { position: 'absolute', top: 0, left: 0, alignItems: 'center' },
    indicator: { width: 26, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
    tab: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 2 },
    label: { fontSize: 10, fontFamily: fontFamily('600'), color: theme.textMuted },
    labelActive: { color: theme.primary },
    badge: {
      position: 'absolute',
      top: -4,
      right: -8,
      minWidth: 15,
      height: 15,
      borderRadius: 8,
      paddingHorizontal: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { fontSize: 9, fontFamily: fontFamily('800'), color: '#FFFFFF' },
  });
}
