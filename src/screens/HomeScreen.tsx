import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { CATEGORIES, CategoryId, categoryTitle } from '../data/categories';
import { CHARACTERS } from '../data/characters';
import { ANIME_SERIES } from '../data/animeSeries';
import { OPENINGS } from '../data/openings';
import { GAME_MODES, ModeId, modeTitle, modeSubtitle } from '../data/modes';
import CategoryTile from '../components/CategoryTile';
import Icon from '../components/Icon';
import { todayDateStr } from '../quiz/today';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  onOpenCategory: (id: CategoryId) => void;
  onStartMode: (id: ModeId) => void;
  onOpenSettings: () => void;
  onOpenBattle: () => void;
};

function categoryCount(id: CategoryId, t: ReturnType<typeof useT>): string {
  switch (id) {
    case 'anime':
      return t('home.countAnime', ANIME_SERIES.length);
    case 'characters':
      return t('home.countCharacters', CHARACTERS.length);
    case 'openings':
      return t('home.countOpenings', OPENINGS.length);
    case 'quotes':
      return t('home.countQuotes', CHARACTERS.length);
    case 'battles':
      return t('home.countAbilities', CHARACTERS.length);
    case 'world':
      return t('home.countFactions', new Set(CHARACTERS.map((c) => c.faction)).size);
    case 'hard':
      return t('home.countQuestions', CHARACTERS.filter((c) => c.tier === 'otaku' || c.tier === 'expert' || c.tier === 'legend').length);
    case 'mixed':
      return t('home.countQuestionsPlus', CHARACTERS.length * 3);
  }
}

export default function HomeScreen({ onOpenCategory, onStartMode, onOpenSettings, onOpenBattle }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();

  if (!profile) return null;

  const dailyDone = profile.dailyChallenge?.date === todayDateStr() ? profile.dailyChallenge : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('home.greeting', profile.username)}</Text>
            <Text style={styles.subGreeting}>{t('home.subGreeting')}</Text>
          </View>
          <SoundTouchable
            style={styles.gearButton}
            onPress={onOpenSettings}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('home.settingsLabel')}
          >
            <Icon name="settings" size={18} color={theme.text} />
          </SoundTouchable>
        </View>

        <View style={styles.streakCard}>
          <Icon name="flame" size={26} color={theme.primary} />
          <View>
            <Text style={styles.streakLabel}>{t('home.streakLabel')}</Text>
            <Text style={styles.streakValue}>{profile.streak.count}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('home.sectionCategory')}</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <CategoryTile
              key={cat.id}
              id={cat.id}
              title={categoryTitle(cat, language)}
              subtitle={categoryCount(cat.id, t)}
              startLabel={t('home.start')}
              onPress={() => onOpenCategory(cat.id)}
            />
          ))}
        </View>

        <SoundTouchable style={styles.battleCard} onPress={onOpenBattle} activeOpacity={0.88}>
          <View style={styles.battleIconWrap}>
            <Icon name="swords" size={22} color={theme.onInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.battleTitle}>{t('home.battleTitle')}</Text>
            <Text style={styles.battleSubtitle}>{t('home.battleSubtitle')}</Text>
          </View>
        </SoundTouchable>

        <Text style={styles.sectionTitle}>{t('home.sectionModes')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modesRow}>
          {GAME_MODES.map((mode) => {
            const isDailyDone = mode.id === 'daily' && dailyDone;
            return (
              <SoundTouchable key={mode.id} style={styles.modeCard} onPress={() => onStartMode(mode.id)} activeOpacity={0.85}>
                <View style={styles.modeIconWrap}>
                  <Icon name={isDailyDone ? 'target' : mode.icon} size={18} color={theme.primary} />
                </View>
                <Text style={styles.modeTitle}>{modeTitle(mode, language)}</Text>
                <Text style={styles.modeSubtitle}>
                  {isDailyDone ? t('home.dailyDone', dailyDone!.score, dailyDone!.total) : modeSubtitle(mode, language)}
                </Text>
              </SoundTouchable>
            );
          })}
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
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.primaryLight,
      borderRadius: radius.lg,
      padding: 14,
      marginBottom: 22,
    },
    streakLabel: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.text, opacity: 0.7 },
    streakValue: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    sectionTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 12 },
    battleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: theme.ink,
      borderRadius: radius.lg,
      padding: 16,
      marginBottom: 24,
    },
    battleIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    battleTitle: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.onInk, marginBottom: 2 },
    battleSubtitle: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.onInk, opacity: 0.75 },
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
    modeIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    modeTitle: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text, marginBottom: 2 },
    modeSubtitle: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, lineHeight: 15 },
  });
}
