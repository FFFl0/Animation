import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { Achievement, AchievementRarity, achievementTitle, rarestUnlocked } from '../data/achievements';
import { ACHIEVEMENT_IMAGES } from '../data/achievementImages';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

/** One colour per rarity, dark enough to read on the card in either theme. */
const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#7C8B99',
  rare: '#3B82F6',
  epic: '#A78BFA',
  legendary: '#D4A017',
};

type Props = {
  /** What this player has earned. For somebody else that is the list their
   * profile carries; for yourself it is worked out from the catalogue. */
  unlocked: string[];
  /** Shown instead of the row when nothing has been earned. Left out on
   * another player's profile, where an empty row is better left unsaid. */
  emptyText?: string;
  limit?: number;
};

/**
 * The best thing a player has to show, on their profile.
 *
 * Three at most, rarest first: a wall of everything they own is what the
 * achievements screen is for, while a profile wants the one line that says
 * who this person is as a player.
 */
export default function RareAchievements({ unlocked, emptyText, limit = 3 }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();

  const best = rarestUnlocked(unlocked, limit);

  if (best.length === 0) {
    return emptyText ? <Text style={styles.empty}>{emptyText}</Text> : null;
  }

  return (
    <View style={styles.row}>
      {best.map((achievement) => (
        <Card key={achievement.id} achievement={achievement} styles={styles} language={language} t={t} />
      ))}
      {/* Keeps a single achievement the width of one card rather than
          stretching it across the row. */}
      {Array.from({ length: Math.max(0, limit - best.length) }, (_, i) => (
        <View key={`gap-${i}`} style={styles.filler} />
      ))}
    </View>
  );
}

function Card({
  achievement,
  styles,
  language,
  t,
}: {
  achievement: Achievement;
  styles: ReturnType<typeof makeStyles>;
  language: ReturnType<typeof useLanguage>['language'];
  t: ReturnType<typeof useT>;
}) {
  const color = RARITY_COLORS[achievement.rarity];

  return (
    <View style={[styles.card, { borderColor: color }]}>
      <View style={styles.artWrap}>
        <Image source={ACHIEVEMENT_IMAGES[achievement.id]} style={styles.art} resizeMode="cover" />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {achievementTitle(achievement, language)}
      </Text>
      <Text style={[styles.rarity, { color }]} numberOfLines={1}>
        {t(`rarity.${achievement.rarity}`)}
      </Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    filler: { flex: 1 },
    card: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      paddingBottom: 10,
      overflow: 'hidden',
      alignItems: 'center',
    },
    artWrap: {
      width: '100%',
      // Matches the shipped artwork, as on the achievements screen.
      aspectRatio: 420 / 224,
      backgroundColor: '#FDFAF9',
      marginBottom: 8,
    },
    art: { width: '100%', height: '100%' },
    title: {
      fontSize: 11,
      lineHeight: 14,
      fontFamily: fontFamily('700'),
      color: theme.text,
      textAlign: 'center',
      paddingHorizontal: 6,
    },
    rarity: { fontSize: 9, fontFamily: fontFamily('800'), textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3 },
    empty: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, lineHeight: 19 },
  });
}
