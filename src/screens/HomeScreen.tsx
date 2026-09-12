import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import ImageScrim from '../components/ImageScrim';
import { BATTLE_BANNER, MODE_BACKGROUNDS, TOURNAMENT_BANNER } from '../data/modeImages';
import Icon from '../components/Icon';
import { todayDateStr } from '../quiz/today';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  onOpenCategory: (id: CategoryId) => void;
  onStartMode: (id: ModeId) => void;
  onOpenSettings: () => void;
  onOpenBattle: () => void;
  onOpenTournament: () => void;
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

export default function HomeScreen({ onOpenCategory, onStartMode, onOpenSettings, onOpenBattle, onOpenTournament }: Props) {
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

        <SoundTouchable style={styles.tournamentCard} onPress={onOpenTournament} activeOpacity={0.88}>
          <Image source={TOURNAMENT_BANNER} style={styles.cardBackground} resizeMode="cover" />
          <ImageScrim direction="left" />
          <View style={styles.battleContent}>
            <Text style={styles.battleTitle}>{t('home.tournamentTitle')}</Text>
            <Text style={styles.battleSubtitle} numberOfLines={2}>{t('home.tournamentSubtitle')}</Text>
          </View>
        </SoundTouchable>

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
          <Image source={BATTLE_BANNER} style={styles.cardBackground} resizeMode="cover" />
          {/* the trophy sits in the middle of the banner, so darken the side the text runs down */}
          <ImageScrim direction="left" />
          <View style={styles.battleContent}>
            <Text style={styles.battleTitle}>{t('home.battleTitle')}</Text>
            <Text style={styles.battleSubtitle} numberOfLines={2}>{t('home.battleSubtitle')}</Text>
          </View>
        </SoundTouchable>

        <Text style={styles.sectionTitle}>{t('home.sectionModes')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modesRow}>
          {GAME_MODES.map((mode) => {
            const isDailyDone = mode.id === 'daily' && dailyDone;
            return (
              <SoundTouchable key={mode.id} style={styles.modeCard} onPress={() => onStartMode(mode.id)} activeOpacity={0.85}>
                <Image source={MODE_BACKGROUNDS[mode.id]} style={styles.cardBackground} resizeMode="cover" />
                <ImageScrim />
                {/* the icon is gone from the card, so today's result needs its own mark */}
                {isDailyDone && (
                  <View style={styles.modeDoneBadge}>
                    <Icon name="check" size={13} color={theme.onPrimary} />
                  </View>
                )}
                <View style={styles.modeContent}>
                  <Text style={styles.modeTitle} numberOfLines={1}>{modeTitle(mode, language)}</Text>
                  <Text style={styles.modeSubtitle} numberOfLines={2}>
                    {isDailyDone ? t('home.dailyDone', dailyDone!.score, dailyDone!.total) : modeSubtitle(mode, language)}
                  </Text>
                </View>
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
    cardBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    battleCard: {
      // Explicit width, not just the default stretch: with only an
      // aspectRatio set, Yoga sizes the card from the ratio instead of
      // filling the row, and on Android the banner came out narrower than
      // the category grid above it.
      width: '100%',
      aspectRatio: 2.6,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginBottom: 24,
    },
    tournamentCard: {
      width: '100%',
      aspectRatio: 3.5,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginBottom: 12,
    },
    battleContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, maxWidth: '62%' },
    battleTitle: {
      fontSize: 16,
      fontFamily: fontFamily('800'),
      color: '#FFFFFF',
      marginBottom: 2,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    battleSubtitle: {
      fontSize: 12,
      lineHeight: 16,
      fontFamily: fontFamily('600'),
      color: 'rgba(255,255,255,0.9)',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
      marginBottom: 24,
    },
    modesRow: { gap: 12, paddingRight: 12 },
    modeCard: {
      width: 190,
      aspectRatio: 1.7,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    modeContent: { flex: 1, justifyContent: 'flex-end', padding: 12 },
    modeDoneBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeTitle: {
      fontSize: 15,
      fontFamily: fontFamily('800'),
      color: '#FFFFFF',
      marginBottom: 2,
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    modeSubtitle: {
      fontSize: 11,
      lineHeight: 15,
      fontFamily: fontFamily('600'),
      color: 'rgba(255,255,255,0.9)',
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
  });
}
