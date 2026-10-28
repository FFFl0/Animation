import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { ZERO_STAT } from '../auth/types';
import { CategoryId, categoryDescription, categoryTitle, getCategory } from '../data/categories';
import { CATEGORY_BACKGROUNDS } from '../data/categoryImages';
import { TIERS, isTierUnlocked, tierLabel } from '../data/difficulty';
import { categoryStatsKey } from '../quiz/statsKey';
import { accuracyOf, categoryShare, categoryStat } from '../quiz/statsSummary';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';
import ImageScrim from '../components/ImageScrim';
import ProgressBar from '../components/ProgressBar';
import StatRing from '../components/StatRing';
import Icon from '../components/Icon';
import { useCountUp } from '../components/useCountUp';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  categoryId: CategoryId;
  onBack: () => void;
  onPlay: () => void;
};

/**
 * What one category looks like in the player's record.
 *
 * Opening a category from the stats screen used to drop straight into the
 * difficulty picker, which answers "what can I play" rather than the
 * question the stats screen was being asked. This answers that one: how much
 * has been played here, how accurately, how it breaks down by difficulty,
 * and how large a part of the player's quizzing this category is. Playing is
 * still one button away.
 */
export default function CategoryStatsScreen({ categoryId, onBack, onPlay }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const insets = useSafeAreaInsets();

  const category = getCategory(categoryId);
  const total = profile ? categoryStat(profile, categoryId) : ZERO_STAT;
  const accuracy = accuracyOf(total);
  // Hooks before the signed-out return below, so they run on every render.
  const countedRounds = useCountUp(total.gamesPlayed);
  const countedAccuracy = useCountUp(accuracy);
  const countedCorrect = useCountUp(total.totalCorrect);

  if (!profile) return null;

  const share = Math.round(categoryShare(profile, categoryId) * 100);
  const played = total.gamesPlayed > 0;
  // The same two categories that record under one key are the ones with no
  // difficulties to break down.
  const hasTiers = !category.hardOnly && categoryId !== 'mixed';

  const bestScoreByTier: Partial<Record<string, number>> = {};
  for (const tier of TIERS) {
    bestScoreByTier[tier.id] = (profile.stats[categoryStatsKey(categoryId, tier.id)] ?? ZERO_STAT).bestScore;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Image source={CATEGORY_BACKGROUNDS[categoryId]} style={styles.heroImage} resizeMode="cover" />
          <ImageScrim direction="left" />
          {/* The artwork runs under the status bar, so the one control over
              it has to step around the notch by itself. */}
          <SoundTouchable
            onPress={onBack}
            style={[styles.backButton, { top: insets.top + 10 }]}
            accessibilityRole="button"
          >
            <Text style={styles.backText}>{t('categoryStats.back')}</Text>
          </SoundTouchable>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>{categoryTitle(category, language)}</Text>
            <Text style={styles.heroNote} numberOfLines={2}>
              {categoryDescription(category, language)}
            </Text>
          </View>
        </View>

        {!played ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: category.colorBg }]}>
              <Icon name={category.icon} size={24} color={category.color} />
            </View>
            <Text style={styles.emptyTitle}>{t('categoryStats.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('categoryStats.emptyText')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.tiles}>
              <View style={styles.tile}>
                <Icon name="target" size={16} color={category.color} />
                <Text style={styles.tileValue}>{countedRounds}</Text>
                <Text style={styles.tileLabel}>{t('categoryStats.rounds')}</Text>
              </View>
              <View style={styles.tile}>
                <StatRing percent={accuracy} size={22} color={category.color} trackColor={theme.border} />
                <Text style={styles.tileValue}>{countedAccuracy}%</Text>
                <Text style={styles.tileLabel}>{t('categoryStats.accuracy')}</Text>
              </View>
              <View style={styles.tile}>
                <Icon name="check" size={16} color={category.color} />
                <Text style={styles.tileValue}>{countedCorrect}</Text>
                <Text style={styles.tileLabel}>{t('categoryStats.correct')}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{t('categoryStats.answersTitle')}</Text>
                <Text style={styles.cardValue}>
                  {t('categoryStats.answersOf', total.totalCorrect, total.totalQuestions)}
                </Text>
              </View>
              <ProgressBar progress={accuracy / 100} color={category.color} height={7} />
              <Text style={styles.cardNote}>{t('categoryStats.shareLine', share)}</Text>
            </View>

            {hasTiers && (
              <>
                <Text style={styles.sectionTitle}>{t('categoryStats.byDifficulty')}</Text>
                {TIERS.map((tier) => {
                  const stat = profile.stats[categoryStatsKey(categoryId, tier.id)] ?? ZERO_STAT;
                  const unlocked = isTierUnlocked(tier.id, bestScoreByTier);
                  const tierAccuracy = accuracyOf(stat);
                  // A record set when rounds were longer would otherwise read
                  // as eleven out of six.
                  const best = Math.min(stat.bestScore, tier.questionsPerRound);

                  return (
                    <View key={tier.id} style={[styles.tierCard, !unlocked && styles.tierCardLocked]}>
                      <View style={[styles.tierIcon, { backgroundColor: tier.colorBg }]}>
                        <Icon
                          name={unlocked ? tier.icon : 'lock'}
                          size={17}
                          color={unlocked ? tier.color : theme.textMuted}
                        />
                      </View>
                      <View style={styles.tierBody}>
                        <Text style={styles.tierLabel}>{tierLabel(tier, language)}</Text>
                        <Text style={styles.tierSub}>
                          {!unlocked
                            ? t('categoryStats.tierLocked')
                            : stat.gamesPlayed > 0
                              ? t('categoryStats.tierLine', stat.gamesPlayed, tierAccuracy)
                              : t('categoryStats.tierUnplayed')}
                        </Text>
                        {unlocked && stat.gamesPlayed > 0 && (
                          <View style={styles.tierTrack}>
                            <ProgressBar
                              progress={best / tier.questionsPerRound}
                              color={tier.color}
                              height={5}
                            />
                          </View>
                        )}
                      </View>
                      {unlocked && stat.gamesPlayed > 0 && (
                        <View style={styles.tierBest}>
                          <Text style={styles.tierBestValue}>
                            {best}/{tier.questionsPerRound}
                          </Text>
                          <Text style={styles.tierBestLabel}>{t('categoryStats.best')}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        <View style={styles.playWrap}>
          <PillButton title={t('categoryStats.play')} variant="ink" onPress={onPlay} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingBottom: 40 },
    hero: { width: '100%', aspectRatio: 2.15, minHeight: 190, overflow: 'hidden', justifyContent: 'flex-end' },
    heroImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
    backButton: { position: 'absolute', left: 16, paddingVertical: 6, paddingHorizontal: 6 },
    backText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: fontFamily('700'),
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    heroText: { paddingHorizontal: 20, paddingBottom: 18 },
    heroTitle: {
      fontSize: 30,
      fontFamily: fontFamily('800'),
      color: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    heroNote: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: fontFamily('500'),
      color: 'rgba(255,255,255,0.92)',
      marginTop: 4,
      maxWidth: '82%',
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    tiles: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 18 },
    tile: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      paddingHorizontal: 12,
      minHeight: 98,
    },
    tileValue: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text, marginTop: 8 },
    tileLabel: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 1 },
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginHorizontal: 20,
      marginTop: 12,
      gap: 10,
    },
    cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
    cardTitle: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    cardValue: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.textMuted },
    cardNote: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
    sectionTitle: {
      fontSize: 20,
      fontFamily: fontFamily('800'),
      color: theme.text,
      paddingHorizontal: 20,
      marginTop: 26,
      marginBottom: 12,
    },
    tierCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
      marginHorizontal: 20,
      marginBottom: 10,
    },
    tierCardLocked: { opacity: 0.55 },
    tierIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    tierBody: { flex: 1 },
    tierLabel: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    tierSub: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    tierTrack: { marginTop: 7 },
    tierBest: { alignItems: 'flex-end', minWidth: 46 },
    tierBestValue: { fontSize: 14, fontFamily: fontFamily('800'), color: theme.text },
    tierBestLabel: { fontSize: 10, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 1 },
    emptyWrap: {
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 32,
      paddingTop: 34,
      paddingBottom: 10,
    },
    emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, marginTop: 4, textAlign: 'center' },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 19 },
    playWrap: { paddingHorizontal: 20, marginTop: 24 },
  });
}
