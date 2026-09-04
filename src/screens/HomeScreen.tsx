import { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES, CategoryId } from '../data/categories';
import { CHARACTERS } from '../data/characters';
import { ANIME_SERIES } from '../data/animeSeries';
import { OPENINGS } from '../data/openings';
import { GAME_MODES, ModeId } from '../data/modes';
import CategoryTile from '../components/CategoryTile';

type Props = {
  onOpenCategory: (id: CategoryId) => void;
  onStartMode: (id: ModeId) => void;
  onOpenSettings: () => void;
};

function categoryCount(id: CategoryId): string {
  switch (id) {
    case 'anime':
      return `${ANIME_SERIES.length} аниме`;
    case 'characters':
      return `${CHARACTERS.length} героев`;
    case 'openings':
      return `${OPENINGS.length} заставок`;
    case 'quotes':
      return `${CHARACTERS.length} цитат`;
    case 'battles':
      return `${CHARACTERS.length} способностей`;
    case 'world':
      return `${new Set(CHARACTERS.map((c) => c.faction)).size} фракций`;
    case 'hard':
      return `${CHARACTERS.filter((c) => c.tier === 'otaku' || c.tier === 'expert' || c.tier === 'legend').length} вопросов`;
    case 'mixed':
      return `${CHARACTERS.length * 3}+ вопросов`;
  }
}

export default function HomeScreen({ onOpenCategory, onStartMode, onOpenSettings }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Привет, {profile.username}!</Text>
            <Text style={styles.subGreeting}>Готов проверить свои знания об аниме?</Text>
          </View>
          <SoundTouchable style={styles.gearButton} onPress={onOpenSettings} activeOpacity={0.8}>
            <Text style={styles.gearIcon}>⚙️</Text>
          </SoundTouchable>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakIcon}>🔥</Text>
          <View>
            <Text style={styles.streakLabel}>Серия ответов</Text>
            <Text style={styles.streakValue}>{profile.streak.count}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Выбери категорию</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <CategoryTile
              key={cat.id}
              icon={cat.icon}
              iconBg={cat.colorBg}
              title={cat.title}
              subtitle={categoryCount(cat.id)}
              onPress={() => onOpenCategory(cat.id)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Игровые режимы</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modesRow}>
          {GAME_MODES.map((mode) => (
            <SoundTouchable key={mode.id} style={styles.modeCard} onPress={() => onStartMode(mode.id)} activeOpacity={0.85}>
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text style={styles.modeTitle}>{mode.title}</Text>
              <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
            </SoundTouchable>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 },
    greeting: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text },
    subGreeting: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2, maxWidth: 240 },
    gearButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gearIcon: { fontSize: 17 },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.primaryLight,
      borderRadius: radius.lg,
      padding: 14,
      marginBottom: 22,
    },
    streakIcon: { fontSize: 28 },
    streakLabel: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.text, opacity: 0.7 },
    streakValue: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    sectionTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 12 },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
      marginBottom: 24,
    },
    modesRow: { gap: 12, paddingRight: 12 },
    modeCard: {
      width: 150,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
    },
    modeIcon: { fontSize: 22, marginBottom: 8 },
    modeTitle: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text, marginBottom: 2 },
    modeSubtitle: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, lineHeight: 15 },
  });
}
