import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n/strings';
import Icon from '../components/Icon';
import QuizScreen from './QuizScreen';
import { RoundConfig } from '../quiz/types';
import {
  Bracket,
  MATCH_QUESTIONS,
  TOURNAMENT_ROUNDS,
  TOURNAMENT_SIZE,
  createBracket,
  isMyTournamentOver,
  myMatch,
  mySeat,
  opponentSeat,
  resolveRound,
  seatOf,
  survivorsAt,
} from '../tournament/bracket';
import { buildSeats } from '../tournament/bots';
import { clearTournament, loadTournament, saveTournament } from '../tournament/tournamentStorage';

type Props = {
  onBack: () => void;
};

type Phase = 'loading' | 'bracket' | 'playing' | 'roundResult';

const MATCH_CONFIG: RoundConfig = {
  categoryId: 'mixed',
  questionCount: MATCH_QUESTIONS,
  timerSeconds: 15,
};

/**
 * A 32-player single-elimination run. The player's own match is a real quiz;
 * the other fifteen in the round are played out by the bracket engine, so a
 * round always resolves whether or not anybody else is online.
 */
export default function TournamentScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { profile } = useAuth();
  const { buzz } = useSound();
  const t = useT();

  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [lastRound, setLastRound] = useState<number | null>(null);
  const [quizKey, setQuizKey] = useState(0);

  useEffect(() => {
    if (!profile) return;
    loadTournament(profile.id).then((saved) => {
      setBracket(saved);
      setPhase('bracket');
    });
  }, [profile?.id]);

  if (!profile) return null;

  const persist = (next: Bracket) => {
    setBracket(next);
    saveTournament(profile.id, next);
  };

  const startTournament = () => {
    const seed = Date.now() >>> 0;
    persist(createBracket(buildSeats(profile.username, [], seed), seed));
    setLastRound(null);
    setPhase('bracket');
    buzz('heavy');
  };

  const abandon = async () => {
    await clearTournament();
    setBracket(null);
    setLastRound(null);
    setPhase('bracket');
  };

  const finishMatch = (score: number) => {
    if (!bracket) return;
    const played = bracket.round;
    const next = resolveRound(bracket, score);
    persist(next);
    setLastRound(played);
    setPhase('roundResult');
    buzz(next.myExitRound === played ? 'error' : 'success');
  };

  if (phase === 'playing' && bracket) {
    const me = mySeat(bracket);
    const match = myMatch(bracket);
    const rival = match ? seatOf(bracket, opponentSeat(match, me)) : null;
    return (
      <View style={{ flex: 1 }}>
        <QuizScreen
          key={quizKey}
          config={MATCH_CONFIG}
          onFinish={(score) => finishMatch(score)}
          onClose={() => setPhase('bracket')}
        />
        <View style={styles.rivalBadge} pointerEvents="none">
          <Icon name="swords" size={13} color={theme.primary} />
          <Text style={styles.rivalBadgeText}>
            {t('tournament.roundName', roundLabel(bracket.round, t))} · {rival?.name ?? '—'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <SoundTouchable onPress={onBack} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>{`‹ ${t('tournament.back')}`}</Text>
      </SoundTouchable>

      <ScrollView contentContainerStyle={styles.content}>
        {phase === 'loading' && <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />}

        {phase === 'bracket' && !bracket && <Intro styles={styles} theme={theme} t={t} onStart={startTournament} />}

        {phase === 'bracket' && bracket && (
          <Standing
            bracket={bracket}
            styles={styles}
            theme={theme}
            t={t}
            onPlay={() => {
              setQuizKey((k) => k + 1);
              setPhase('playing');
            }}
            onRestart={startTournament}
            onAbandon={abandon}
          />
        )}

        {phase === 'roundResult' && bracket && lastRound !== null && (
          <RoundResult
            bracket={bracket}
            round={lastRound}
            styles={styles}
            theme={theme}
            t={t}
            onContinue={() => setPhase('bracket')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** "1/32", "1/16", "1/8", then the two named rounds. */
function roundLabel(round: number, t: ReturnType<typeof useT>): string {
  if (round === TOURNAMENT_ROUNDS - 1) return t('tournament.final');
  if (round === TOURNAMENT_ROUNDS - 2) return t('tournament.semifinal');
  return `1/${TOURNAMENT_SIZE >> round}`;
}

function Intro({ styles, theme, t, onStart }: { styles: Styles; theme: Theme; t: ReturnType<typeof useT>; onStart: () => void }) {
  return (
    <>
      <View style={styles.heroIcon}>
        <Icon name="trophy" size={34} color={theme.primary} />
      </View>
      <Text style={styles.title}>{t('tournament.title')}</Text>
      <Text style={styles.lead}>{t('tournament.intro')}</Text>

      <View style={styles.rulesCard}>
        {[t('tournament.rule1'), t('tournament.rule2'), t('tournament.rule3')].map((rule) => (
          <View key={rule} style={styles.ruleRow}>
            <Icon name="check" size={15} color={theme.primary} />
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      <SoundTouchable style={styles.primaryButton} onPress={onStart} activeOpacity={0.88}>
        <Text style={styles.primaryButtonText}>{t('tournament.start')}</Text>
      </SoundTouchable>
    </>
  );
}

function Standing({
  bracket,
  styles,
  theme,
  t,
  onPlay,
  onRestart,
  onAbandon,
}: {
  bracket: Bracket;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  onPlay: () => void;
  onRestart: () => void;
  onAbandon: () => void;
}) {
  const me = mySeat(bracket);
  const over = isMyTournamentOver(bracket);
  const champion = seatOf(bracket, bracket.championSeat);
  const iWon = bracket.championSeat === me;
  const match = myMatch(bracket);
  const rival = match ? seatOf(bracket, opponentSeat(match, me)) : null;

  return (
    <>
      <View style={styles.heroIcon}>
        <Icon name={iWon ? 'crown' : 'trophy'} size={34} color={theme.primary} />
      </View>
      <Text style={styles.title}>{t('tournament.title')}</Text>

      {over ? (
        <Text style={styles.lead}>
          {iWon
            ? t('tournament.youWon')
            : bracket.myExitRound !== null
              ? t('tournament.youLost', roundLabel(bracket.myExitRound, t))
              : t('tournament.finished')}
          {champion && !iWon ? `\n${t('tournament.champion', champion.name)}` : ''}
        </Text>
      ) : (
        <Text style={styles.lead}>{t('tournament.alive', survivorsAt(bracket, bracket.round))}</Text>
      )}

      {!over && rival && (
        <View style={styles.nextCard}>
          <Text style={styles.nextLabel}>{t('tournament.nextMatch', roundLabel(bracket.round, t))}</Text>
          <View style={styles.rivalRow}>
            <View style={styles.rivalAvatar}>
              <Text style={styles.rivalInitial}>{rival.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rivalName}>{rival.name}</Text>
              <Text style={styles.rivalKind}>
                {rival.kind === 'bot' ? t('tournament.opponentBot') : t('tournament.opponentPlayer')}
              </Text>
            </View>
          </View>
          <SoundTouchable style={styles.primaryButton} onPress={onPlay} activeOpacity={0.88}>
            <Text style={styles.primaryButtonText}>{t('tournament.play', MATCH_QUESTIONS)}</Text>
          </SoundTouchable>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('tournament.path')}</Text>
      <View style={styles.pathCard}>
        {Array.from({ length: TOURNAMENT_ROUNDS }, (_, round) => (
          <PathRow key={round} bracket={bracket} round={round} styles={styles} theme={theme} t={t} />
        ))}
      </View>

      {over ? (
        <SoundTouchable style={styles.primaryButton} onPress={onRestart} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>{t('tournament.again')}</Text>
        </SoundTouchable>
      ) : (
        <SoundTouchable style={styles.ghostButton} onPress={onAbandon} activeOpacity={0.85}>
          <Text style={styles.ghostButtonText}>{t('tournament.abandon')}</Text>
        </SoundTouchable>
      )}
    </>
  );
}

/** One line of the player's run: who they met that round and how it went. */
function PathRow({
  bracket,
  round,
  styles,
  theme,
  t,
}: {
  bracket: Bracket;
  round: number;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
}) {
  const me = mySeat(bracket);
  const match = bracket.matches.find((m) => m.round === round && (m.seatA === me || m.seatB === me));
  const rival = match ? seatOf(bracket, opponentSeat(match, me)) : null;
  const decided = match?.winner !== null && match?.winner !== undefined;
  const won = decided && match!.winner === me;
  const myScore = match ? (match.seatA === me ? match.scoreA : match.scoreB) : null;
  const theirScore = match ? (match.seatA === me ? match.scoreB : match.scoreA) : null;

  return (
    <View style={[styles.pathRow, round > 0 && styles.pathRowDivided]}>
      <View style={[styles.pathBadge, decided && (won ? styles.pathBadgeWon : styles.pathBadgeLost)]}>
        {decided ? (
          <Icon name={won ? 'check' : 'close'} size={13} color={won ? theme.success : theme.danger} />
        ) : (
          <Text style={styles.pathBadgeText}>{round + 1}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.pathTitle}>{roundLabel(round, t)}</Text>
        <Text style={styles.pathSubtitle} numberOfLines={1}>
          {rival ? rival.name : bracket.myExitRound !== null && round > bracket.myExitRound ? t('tournament.outAlready') : t('tournament.pending')}
        </Text>
      </View>
      {decided && (
        <Text style={[styles.pathScore, { color: won ? theme.success : theme.danger }]}>
          {myScore}:{theirScore}
        </Text>
      )}
    </View>
  );
}

function RoundResult({
  bracket,
  round,
  styles,
  theme,
  t,
  onContinue,
}: {
  bracket: Bracket;
  round: number;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  onContinue: () => void;
}) {
  const me = mySeat(bracket);
  const match = bracket.matches.find((m) => m.round === round && (m.seatA === me || m.seatB === me))!;
  const rival = seatOf(bracket, opponentSeat(match, me))!;
  const won = match.winner === me;
  const myScore = match.seatA === me ? match.scoreA : match.scoreB;
  const theirScore = match.seatA === me ? match.scoreB : match.scoreA;
  const champion = bracket.championSeat === me;

  return (
    <>
      <View style={styles.heroIcon}>
        <Icon name={champion ? 'crown' : won ? 'check' : 'close'} size={34} color={won ? theme.primary : theme.danger} />
      </View>
      <Text style={styles.title}>
        {champion ? t('tournament.youWon') : won ? t('tournament.matchWon') : t('tournament.matchLost')}
      </Text>

      <View style={styles.scoreCard}>
        <View style={styles.scoreSide}>
          <Text style={styles.scoreName}>{t('tournament.you')}</Text>
          <Text style={[styles.scoreValue, { color: won ? theme.success : theme.text }]}>{myScore}</Text>
        </View>
        <Text style={styles.scoreDash}>:</Text>
        <View style={styles.scoreSide}>
          <Text style={styles.scoreName} numberOfLines={1}>{rival.name}</Text>
          <Text style={[styles.scoreValue, { color: won ? theme.text : theme.danger }]}>{theirScore}</Text>
        </View>
      </View>

      <Text style={styles.lead}>
        {champion
          ? t('tournament.championLead')
          : won
            ? t('tournament.advanced', roundLabel(bracket.round, t), survivorsAt(bracket, bracket.round))
            : t('tournament.eliminated', roundLabel(round, t))}
      </Text>

      <SoundTouchable style={styles.primaryButton} onPress={onContinue} activeOpacity={0.88}>
        <Text style={styles.primaryButtonText}>{t('tournament.toBracket')}</Text>
      </SoundTouchable>
    </>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    back: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, alignItems: 'center' },
    heroIcon: {
      width: 68,
      height: 68,
      borderRadius: 24,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    title: { fontSize: 23, fontFamily: fontFamily('800'), color: theme.text, textAlign: 'center' },
    lead: {
      fontSize: 13,
      lineHeight: 19,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 8,
    },
    rulesCard: {
      alignSelf: 'stretch',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      padding: 16,
      gap: 12,
      marginTop: 20,
    },
    ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    ruleText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fontFamily('600'), color: theme.text },
    nextCard: {
      alignSelf: 'stretch',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      padding: 16,
      marginTop: 20,
    },
    nextLabel: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted, letterSpacing: 1 },
    rivalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 16 },
    rivalAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rivalInitial: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.primary },
    rivalName: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text },
    rivalKind: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    sectionTitle: {
      alignSelf: 'flex-start',
      fontSize: 15,
      fontFamily: fontFamily('800'),
      color: theme.text,
      marginTop: 26,
      marginBottom: 10,
    },
    pathCard: {
      alignSelf: 'stretch',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
    },
    pathRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    pathRowDivided: { borderTopWidth: 1, borderTopColor: theme.border },
    pathBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pathBadgeWon: { backgroundColor: theme.successBg, borderColor: theme.successBg },
    pathBadgeLost: { backgroundColor: theme.dangerBg, borderColor: theme.dangerBg },
    pathBadgeText: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.textMuted },
    pathTitle: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    pathSubtitle: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    pathScore: { fontSize: 14, fontFamily: fontFamily('800') },
    scoreCard: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      padding: 18,
      marginTop: 20,
    },
    scoreSide: { flex: 1, alignItems: 'center' },
    scoreName: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.textMuted },
    scoreValue: { fontSize: 32, fontFamily: fontFamily('800'), marginTop: 2 },
    scoreDash: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.textMuted },
    primaryButton: {
      alignSelf: 'stretch',
      backgroundColor: theme.ink,
      borderRadius: radius.pill,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 22,
    },
    primaryButtonText: { color: theme.onInk, fontSize: 15, fontFamily: fontFamily('800') },
    ghostButton: { alignSelf: 'stretch', paddingVertical: 14, alignItems: 'center', marginTop: 14 },
    ghostButtonText: { color: theme.danger, fontSize: 14, fontFamily: fontFamily('700') },
    rivalBadge: {
      position: 'absolute',
      top: 8,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    rivalBadgeText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.text },
  });
}
