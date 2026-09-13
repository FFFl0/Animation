import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_GROUPS,
  Achievement,
  AchievementGroup,
  achievementDescription,
  achievementTitle,
  isUnlocked,
  progressOf,
  unlockedCount,
} from '../data/achievements';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Filter = 'all' | AchievementGroup;

const FILTERS: Filter[] = ['all', ...ACHIEVEMENT_GROUPS];
const COLUMNS = 3;
const GAP = 8;

export default function AchievementsScreen() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const { width } = useWindowDimensions();
  const t = useT();
  const [filter, setFilter] = useState<Filter>('all');

  if (!profile) return null;

  const cardWidth = (width - 40 - GAP * (COLUMNS - 1)) / COLUMNS;
  const shown = filter === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.group === filter);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Icon name="sparkles" size={26} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{t('achievements.pageTitle')}</Text>
            <Text style={styles.pageSub}>{t('achievements.unlockedOf', unlockedCount(profile), ACHIEVEMENTS.length)}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((key) => (
            <SoundTouchable
              key={key}
              style={[styles.chip, filter === key && styles.chipActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{t(`achievements.filter.${key}`)}</Text>
            </SoundTouchable>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {shown.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              profile={profile}
              width={cardWidth}
              styles={styles}
              theme={theme}
              t={t}
              language={language}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AchievementCard({
  achievement,
  profile,
  width,
  styles,
  theme,
  t,
  language,
}: {
  achievement: Achievement;
  profile: NonNullable<ReturnType<typeof useAuth>['profile']>;
  width: number;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  language: ReturnType<typeof useLanguage>['language'];
}) {
  const unlocked = isUnlocked(achievement, profile);
  const current = progressOf(achievement, profile);
  // A secret stays behind "???" until it is earned, then reads like any other.
  const hidden = !!achievement.secret && !unlocked;
  const date = profile.achievementDates?.[achievement.id];

  return (
    <View style={[styles.card, { width }, unlocked && styles.cardUnlocked]}>
      <View style={[styles.badge, unlocked ? styles.badgeDone : styles.badgeLocked]}>
        <Icon name={unlocked ? 'check' : 'lock'} size={11} color={unlocked ? theme.onPrimary : theme.textMuted} />
      </View>

      <View style={[styles.iconWrap, unlocked && styles.iconWrapUnlocked]}>
        <Icon
          name={hidden ? 'lock' : achievement.icon}
          size={26}
          color={unlocked ? theme.primary : theme.textMuted}
        />
      </View>

      <Text style={[styles.cardTitle, !unlocked && styles.cardTitleLocked]} numberOfLines={2}>
        {hidden ? t('achievements.secretTitle') : achievementTitle(achievement, language)}
      </Text>
      <Text style={styles.cardDesc} numberOfLines={3}>
        {hidden ? '???' : achievementDescription(achievement, language)}
      </Text>

      <View style={styles.cardFoot}>
        {unlocked ? (
          <>
            <View style={styles.donePill}>
              <Text style={styles.donePillText}>{t('achievements.done')}</Text>
            </View>
            {date && <Text style={styles.doneDate}>{date}</Text>}
          </>
        ) : (
          <>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round((current / achievement.target) * 100)}%` }]} />
            </View>
            <Text style={styles.counter}>
              {hidden ? '???' : `${current} / ${achievement.target}`}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pageTitle: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text },
    pageSub: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    filters: { gap: 8, paddingVertical: 16, paddingRight: 20 },
    chip: {
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    chipTextActive: { color: theme.onPrimary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 10,
      minHeight: 168,
    },
    cardUnlocked: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    badge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeLocked: { backgroundColor: theme.background },
    badgeDone: { backgroundColor: theme.success },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginTop: 8,
      marginBottom: 10,
    },
    iconWrapUnlocked: { backgroundColor: theme.card },
    cardTitle: { fontSize: 12, lineHeight: 15, fontFamily: fontFamily('800'), color: theme.text },
    cardTitleLocked: { color: theme.text },
    cardDesc: { fontSize: 10, lineHeight: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 3 },
    cardFoot: { marginTop: 'auto', paddingTop: 8 },
    track: { height: 5, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 3, backgroundColor: theme.primary },
    counter: { fontSize: 10, fontFamily: fontFamily('700'), color: theme.textMuted, textAlign: 'center', marginTop: 4 },
    donePill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    donePillText: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.onPrimary },
    doneDate: { fontSize: 9, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 4 },
  });
}
