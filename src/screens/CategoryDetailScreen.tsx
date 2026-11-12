import { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { CategoryId, getCategory, categoryTitle, categoryDescription } from '../data/categories';
import { TIERS, TierId, isTierUnlocked, tierLabel, tierDescription } from '../data/difficulty';
import { categoryStatsKey, getStat } from '../quiz/statsKey';
import { bestRecord, bestShare } from '../auth/types';
import { ToriiIcon } from '../components/SakuraDecor';
import PillButton from '../components/PillButton';
import ProgressBar from '../components/ProgressBar';
import Icon, { IconName } from '../components/Icon';
import AnimeAvatar from '../components/AnimeAvatar';
import ImageScrim from '../components/ImageScrim';
import FadeIn from '../components/FadeIn';
import { CATEGORY_BACKGROUNDS } from '../data/categoryImages';
import { Category } from '../data/categories';
import QuestionKindChips from '../components/QuestionKindChips';
import { Profile } from '../auth/types';
import {
  UNTIERED_ROUND_LENGTH,
  characterPoolOf,
  questionKindsOf,
  sampleFaces,
  seriesCountOf,
} from '../data/roundPreview';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

type Props = {
  categoryId: CategoryId;
  onBack: () => void;
  onStartTier: (categoryId: CategoryId, tier: TierId | undefined) => void;
};

export default function CategoryDetailScreen({ categoryId, onBack, onStartTier }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const category = getCategory(categoryId);

  const bestShareByTier: Partial<Record<TierId, number>> = {};
  if (profile) {
    for (const tier of TIERS) {
      bestShareByTier[tier.id] = bestShare(
        getStat(profile, categoryStatsKey(categoryId, tier.id)),
        tier.questionsPerRound
      );
    }
  }

  const showTiers = !category.hardOnly && categoryId !== 'mixed';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SoundTouchable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{t('categoryDetail.back')}</Text>
        </SoundTouchable>

        <View style={styles.headerIconWrap}>
          <ToriiIcon size={30} color={theme.text} />
        </View>
        <Text style={styles.title}>{categoryTitle(category, language)}</Text>
        <Text style={styles.subtitle}>{categoryDescription(category, language)}</Text>

        {showTiers ? (
          <View style={styles.tierList}>
            {TIERS.map((tier) => {
              const stat = profile ? getStat(profile, categoryStatsKey(categoryId, tier.id)) : undefined;
              const unlocked = isTierUnlocked(tier.id, bestShareByTier);
              // Shown against this tier's own round. A record kept before
              // lengths were stored carries none, and the round on the card
              // below it is the one it would be set in now.
              const record = stat ? bestRecord(stat, tier.questionsPerRound) : null;
              const total = record?.outOf ?? tier.questionsPerRound;
              const best = record?.score ?? 0;

              return (
                <SoundTouchable
                  key={tier.id}
                  style={[styles.tierCard, !unlocked && styles.tierCardLocked]}
                  onPress={() => unlocked && onStartTier(categoryId, tier.id)}
                  activeOpacity={unlocked ? 0.85 : 1}
                >
                  <View style={[styles.tierIconWrap, { backgroundColor: tier.colorBg }]}>
                    <Icon name={unlocked ? tier.icon : 'lock'} size={19} color={unlocked ? tier.color : theme.textMuted} />
                  </View>
                  <View style={styles.tierText}>
                    <Text style={styles.tierLabel}>{tierLabel(tier, language)}</Text>
                    <Text style={styles.tierDesc}>{unlocked ? tierDescription(tier, language) : t('categoryDetail.lockedDesc')}</Text>
                    {/* A tier that changes the rules has to say so before
                        the round starts, not surprise somebody mid-quiz. */}
                    {unlocked && tier.rules && (
                      <View style={styles.ruleRow}>
                        {tier.rules.timerSeconds !== undefined && (
                          <Rule label={t('categoryDetail.ruleTimer', tier.rules.timerSeconds)} color={tier.color} styles={styles} />
                        )}
                        {tier.rules.items === false && (
                          <Rule label={t('categoryDetail.ruleNoItems')} color={tier.color} styles={styles} />
                        )}
                        {tier.rules.closeDistractors && (
                          <Rule label={t('categoryDetail.ruleCloseAnswers')} color={tier.color} styles={styles} />
                        )}
                      </View>
                    )}
                    {unlocked && (
                      <View style={styles.tierProgressRow}>
                        <View style={styles.tierProgressBar}>
                          <ProgressBar progress={best / total} color={tier.color} height={5} />
                        </View>
                        <Text style={styles.tierScore}>{best}/{total}</Text>
                      </View>
                    )}
                  </View>
                  {unlocked && <Text style={styles.chevron}>›</Text>}
                </SoundTouchable>
              );
            })}
          </View>
        ) : (
          <RoundPreview
            category={category}
            profile={profile}
            styles={styles}
            theme={theme}
            t={t}
            onStart={() => onStartTier(categoryId, undefined)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const FACES = 6;

/**
 * The page for a category with no difficulty levels — Hard and Mixed.
 *
 * Those used to be a title and a single button, which read as a page that
 * had not finished loading. This says what the round is before it starts:
 * how long, what rules, which kinds of question, a few of the faces it can
 * ask about, and how the player has done here so far.
 */
function RoundPreview({
  category,
  profile,
  styles,
  theme,
  t,
  onStart,
}: {
  category: Category;
  profile: Profile | null;
  styles: ReturnType<typeof makeStyles>;
  theme: Theme;
  t: ReturnType<typeof useT>;
  onStart: () => void;
}) {
  const pool = characterPoolOf(category.id);
  // Drawn once per visit, so the faces do not reshuffle on every render.
  const faces = useMemo(() => sampleFaces(pool, FACES), [category.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const kinds = questionKindsOf(category.id);
  const stat = profile ? getStat(profile, categoryStatsKey(category.id)) : undefined;
  const record = stat && stat.gamesPlayed > 0 ? bestRecord(stat, UNTIERED_ROUND_LENGTH) : null;
  const accuracy =
    stat && stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : null;
  const poolText = (category.id === 'hard' ? 'categoryDetail.poolHard' : 'categoryDetail.poolMixed') as string;

  return (
    <View style={styles.preview}>
      <FadeIn duration={260}>
        <View style={[styles.hero, { borderColor: category.color }]}>
          <Image source={CATEGORY_BACKGROUNDS[category.id]} style={styles.heroImage} resizeMode="cover" />
          <ImageScrim />
          <View style={styles.heroChips}>
            <HeroChip icon="target" label={t('categoryDetail.factQuestions', UNTIERED_ROUND_LENGTH)} styles={styles} />
            <HeroChip icon="infinity" label={t('categoryDetail.factNoTimer')} styles={styles} />
            <HeroChip icon="sparkles" label={t('categoryDetail.factItems')} styles={styles} />
          </View>
        </View>
      </FadeIn>

      <View style={styles.startWrap}>
        <PillButton title={t('categoryDetail.startQuiz')} variant="ink" onPress={onStart} />
      </View>

      <FadeIn duration={300} delay={80}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('categoryDetail.inRound')}</Text>
          <Text style={styles.infoText}>{t(poolText, pool.length, seriesCountOf(category.id))}</Text>

          <Text style={styles.infoSubtitle}>{t('categoryDetail.kinds')}</Text>
          <QuestionKindChips kinds={kinds} color={category.color} background={category.colorBg} />

          <Text style={styles.infoSubtitle}>{t('categoryDetail.faces')}</Text>
          <View style={styles.faceRow}>
            {faces.map((character, i) => (
              <View key={character.id} style={[styles.face, i > 0 && styles.faceOverlap, { borderColor: theme.card }]}>
                <AnimeAvatar avatar={character.avatar} characterId={character.id} size={52} />
              </View>
            ))}
            {pool.length > faces.length && (
              <View style={[styles.face, styles.faceOverlap, styles.faceMore, { borderColor: theme.card }]}>
                <Text style={styles.faceMoreText}>{t('categoryDetail.facesMore', pool.length - faces.length)}</Text>
              </View>
            )}
          </View>
        </View>
      </FadeIn>

      <FadeIn duration={300} delay={160}>
        <View style={styles.infoCard}>
          <View style={styles.recordHead}>
            <Icon name="trophy" size={17} color={category.color} />
            <Text style={styles.infoTitle}>{t('categoryDetail.record')}</Text>
          </View>
          {record && stat ? (
            <>
              <View style={styles.recordRow}>
                <Text style={styles.recordValue}>{t('categoryDetail.recordValue', record.score, record.outOf)}</Text>
                <View style={styles.recordBar}>
                  <ProgressBar progress={record.outOf ? record.score / record.outOf : 0} color={category.color} height={6} />
                </View>
              </View>
              <Text style={styles.infoText}>
                {t('categoryDetail.played', stat.gamesPlayed)}
                {accuracy !== null ? ` · ${t('categoryDetail.accuracy', accuracy)}` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.infoText}>{t('categoryDetail.noRecord')}</Text>
          )}
        </View>
      </FadeIn>
    </View>
  );
}

function HeroChip({ icon, label, styles }: { icon: IconName; label: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.heroChip}>
      <Icon name={icon} size={12} color="#FFFFFF" />
      <Text style={styles.heroChipText}>{label}</Text>
    </View>
  );
}

/** One of the things this tier does differently, as a small chip. */
function Rule({ label, color, styles }: { label: string; color: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.ruleChip, { borderColor: color }]}>
      <Text style={[styles.ruleText, { color }]}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
    backButton: { marginBottom: 12 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    headerIconWrap: { marginBottom: 8 },
    title: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 6 },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginBottom: 22, lineHeight: 19 },
    tierList: { gap: 12 },
    tierCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
      gap: 12,
    },
    tierCardLocked: { opacity: 0.55 },
    tierIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tierText: { flex: 1 },
    tierLabel: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
    tierDesc: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1, marginBottom: 6 },
    ruleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 7 },
    ruleChip: { borderWidth: 1.2, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
    ruleText: { fontSize: 9, fontFamily: fontFamily('800') },
    tierProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tierProgressBar: { flex: 1 },
    tierScore: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted, minWidth: 34, textAlign: 'right' },
    chevron: { fontSize: 22, color: theme.textMuted, fontFamily: fontFamily('700') },
    startWrap: { marginTop: 4 },
    preview: { gap: 14 },
    hero: { height: 180, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5 },
    heroImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
    heroChips: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    heroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    heroChipText: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily('800'), color: '#FFFFFF' },
    infoCard: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
    },
    infoTitle: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily('800'), color: theme.text },
    infoText: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4 },
    infoSubtitle: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily('800'), color: theme.text, marginTop: 14, marginBottom: 8 },
    faceRow: { flexDirection: 'row', alignItems: 'center' },
    face: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    // Seven 56px faces have to fit a 288px card on the narrowest phone.
    faceOverlap: { marginLeft: -15 },
    faceMore: { backgroundColor: theme.primaryLight },
    faceMoreText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily('800'), color: theme.primary },
    recordHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
    recordValue: { fontSize: 20, lineHeight: 26, fontFamily: fontFamily('800'), color: theme.text },
    recordBar: { flex: 1 },
  });
}
