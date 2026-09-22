import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../theme/palette';
import { useTheme } from '../theme/ThemeContext';
import { EMOJI_CATEGORIES, EmojiCategoryId, RECENT_LIMIT, RECENT_TAB } from './emoji';

const RECENT_KEY = 'animequiz.recentEmoji';
const COLUMNS = 8;
/** Roughly the height of a system emoji keyboard — enough for four rows
 * without pushing the message list off the screen. */
const GRID_HEIGHT = 232;

type Props = {
  onPick: (emoji: string) => void;
};

/**
 * The in-app emoji keyboard: a tab per category and a grid, rather than the
 * single scrolling strip this used to be. Recently used emoji lead, so the
 * handful anybody actually types stays one tap away.
 */
export default function EmojiPicker({ onPick }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState<EmojiCategoryId>('smileys');

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecent(parsed.filter((e): e is string => typeof e === 'string'));
          setActive('recent');
        }
      } catch {
        // A corrupted list is not worth surfacing — start from empty.
      }
    });
  }, []);

  const handlePick = (emoji: string) => {
    onPick(emoji);
    setRecent((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, RECENT_LIMIT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  // The recents tab only exists once something is in it, the same way a
  // system keyboard hides it until you have typed an emoji.
  const tabs = [
    ...(recent.length > 0 ? [{ id: 'recent' as EmojiCategoryId, tab: RECENT_TAB }] : []),
    ...EMOJI_CATEGORIES.map((c) => ({ id: c.id, tab: c.tab })),
  ];

  const shown = active === 'recent' ? recent : EMOJI_CATEGORIES.find((c) => c.id === active)?.emoji ?? [];

  return (
    <View style={styles.panel}>
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActive(tab.id)}
            style={[styles.tab, active === tab.id && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active === tab.id }}
          >
            <Text style={styles.tabEmoji}>{tab.tab}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        // Keyed on the category so switching tabs starts back at the top
        // instead of keeping the previous scroll position.
        key={active}
        data={shown}
        keyExtractor={(item, index) => `${item}-${index}`}
        numColumns={COLUMNS}
        style={styles.grid}
        contentContainerStyle={styles.gridContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePick(item)} style={styles.cell} accessibilityRole="button">
            <Text style={styles.emoji}>{item}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    panel: { borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.card },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingTop: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 7,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: { borderBottomColor: theme.primary },
    tabEmoji: { fontSize: 18 },
    grid: { height: GRID_HEIGHT },
    gridContent: { paddingVertical: 6, paddingHorizontal: 4 },
    cell: { flex: 1 / COLUMNS, alignItems: 'center', justifyContent: 'center', paddingVertical: 7 },
    emoji: { fontSize: 26 },
  });
}
