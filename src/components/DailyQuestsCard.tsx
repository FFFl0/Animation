import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import Icon from './Icon';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useT } from '../i18n/strings';
import { useLanguage } from '../i18n/LanguageContext';
import { categoryTitle, getCategory } from '../data/categories';
import { Quest } from '../quests/quests';
import { useQuests } from '../quests/QuestsContext';
import { localClock, nextQuestReset, timeUntil } from '../quests/questClock';

/**
 * Today's three quests, how far each has got, and the reward for all of
 * them.
 *
 * It sits on the home screen under the streak because it answers the
 * question the streak raises: the streak says "come back today", and this
 * says what to do once there.
 */
export default function DailyQuestsCard() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const { buzz } = useSound();
  const { ready, quests, progress, reward, canClaim, claimed, claim } = useQuests();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Ticks the countdown along; a minute is as fine as it is shown.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Nothing until today's record is read: three empty bars that then jump
  // to "done" would be a lie told for a quarter of a second.
  if (!ready) return null;

  const label = (quest: Quest): string => {
    switch (quest.kind) {
      case 'rounds':
        return t('quests.rounds', quest.target);
      case 'correct':
        return t('quests.correct', quest.target);
      case 'accuracy':
        return t('quests.accuracy');
      case 'perfect':
        return t('quests.perfect');
      case 'category':
        return t('quests.category', categoryTitle(getCategory(quest.categoryId), language));
    }
  };

  const collect = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await claim();
    setBusy(false);
    if (ok) buzz('success');
    else setFailed(true);
  };

  const reset = nextQuestReset(now);
  const left = timeUntil(reset, now);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Icon name="target" size={16} color={theme.primary} />
        <Text style={styles.title}>{t('quests.title')}</Text>
      </View>
      <Text style={styles.hint}>{t('quests.hint')}</Text>

      {quests.map((quest) => {
        const got = Math.min(quest.target, progress[quest.id] ?? 0);
        const done = got >= quest.target;
        return (
          <View key={quest.id} style={styles.row}>
            <View style={[styles.mark, done && styles.markDone]}>
              {done && <Icon name="check" size={11} color={theme.onPrimary} />}
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowText, done && styles.rowTextDone]}>{label(quest)}</Text>
                {/* a one-step quest has nothing to count; the tick says it all */}
                {quest.target > 1 && (
                  <Text style={styles.count}>
                    {got}/{quest.target}
                  </Text>
                )}
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(got / quest.target) * 100}%` }]} />
              </View>
            </View>
          </View>
        );
      })}

      <View style={styles.footer}>
        <View style={styles.resetRow} testID="quests-reset">
          <Icon name="calendar" size={13} color={theme.textMuted} />
          <Text style={styles.resetText}>
            {t('quests.resetsAt', localClock(reset))}
            <Text style={styles.resetLeft}>{` · ${t('quests.resetsIn', left.hours, left.minutes)}`}</Text>
          </Text>
        </View>
        {claimed ? (
          <Text style={styles.claimed}>{t('quests.claimed')}</Text>
        ) : (
          <>
            <Text style={styles.reward}>{t('quests.reward', t(`shop.consumable.${reward}`))}</Text>
            {canClaim && (
              <SoundTouchable
                style={[styles.button, busy && styles.buttonBusy]}
                onPress={collect}
                disabled={busy}
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>{t(busy ? 'quests.claiming' : 'quests.claim')}</Text>
              </SoundTouchable>
            )}
            {failed && <Text style={styles.failed}>{t('quests.failed')}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 24,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily('800'), color: theme.text },
    hint: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4, marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    mark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    markDone: { backgroundColor: theme.primary, borderColor: theme.primary },
    rowBody: { flex: 1 },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    rowText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fontFamily('700'), color: theme.text },
    rowTextDone: { color: theme.textMuted },
    count: { fontSize: 12, lineHeight: 18, fontFamily: fontFamily('800'), color: theme.primary },
    resetRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    resetText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: fontFamily('700'), color: theme.text },
    resetLeft: { fontFamily: fontFamily('500'), color: theme.textMuted },
    track: { height: 4, borderRadius: 2, backgroundColor: theme.border, marginTop: 6, overflow: 'hidden' },
    fill: { height: 4, borderRadius: 2, backgroundColor: theme.primary },
    footer: { marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
    reward: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily('700'), color: theme.text },
    claimed: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily('700'), color: theme.textMuted },
    button: {
      marginTop: 10,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: radius.lg,
      backgroundColor: theme.primary,
    },
    buttonBusy: { opacity: 0.6 },
    buttonText: { fontSize: 14, lineHeight: 19, fontFamily: fontFamily('800'), color: theme.onPrimary },
    failed: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily('600'), color: theme.danger, marginTop: 8 },
  });
}
