import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useT } from '../i18n/strings';
import Icon from '../components/Icon';
import QuizScreen from './QuizScreen';
import { RoundConfig } from '../quiz/types';
import {
  DeBracket,
  GAME_QUESTIONS,
  MATCH_DEFS,
  MatchId,
  WINS_PER_MATCH,
  championSeed,
  isDecided,
  isEliminated,
  lossesOf,
  participantsOf,
  playableMatchesFor,
  winsOf,
} from '../tournament/doubleElim';
import {
  WeeklyState,
  canPlayWeekly,
  fetchWeekly,
  hasSubmitted,
  openGameOf,
  registerForWeekly,
  secondsUntil,
  submitGameScore,
  toDeBracket,
  unregisterFromWeekly,
} from '../tournament/weeklyApi';

type Props = {
  onBack: () => void;
  onOpenPractice: () => void;
  onMatchPlayed: (score: number, total: number) => void;
};

type Tab = 'bracket' | 'players' | 'matches' | 'rules';
type Phase = 'loading' | 'offline' | 'view' | 'playing';

const TABS: Tab[] = ['bracket', 'players', 'matches', 'rules'];

export const WEEKLY_MATCH_CONFIG: RoundConfig = {
  categoryId: 'mixed',
  questionCount: GAME_QUESTIONS,
  timerSeconds: 15,
};

/** Re-reads the bracket while a match is waiting on an opponent. */
const POLL_MS = 5000;

/**
 * The weekly tournament: sixteen players, double elimination, matches best of
 * three. Registration runs all week; the bracket is fixed when it starts at
 * the weekend and the highest rated sixteen who signed up get the seats.
 */
export default function TournamentScreen({ onBack, onOpenPractice, onMatchPlayed }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { buzz } = useSound();
  const t = useT();

  const [state, setState] = useState<WeeklyState | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [tab, setTab] = useState<Tab>('bracket');
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<MatchId | null>(null);
  const [quizKey, setQuizKey] = useState(0);
  const [tick, setTick] = useState(0);

  const bracket = useMemo(() => (state ? toDeBracket(state) : null), [state]);
  const mySeat = state?.mySeat ?? null;
  const myMatch = bracket && mySeat !== null ? playableMatchesFor(bracket, mySeat)[0] ?? null : null;
  const mySide: 'a' | 'b' | null =
    bracket && myMatch && mySeat !== null ? (participantsOf(bracket, myMatch)[0] === mySeat ? 'a' : 'b') : null;
  const waiting = !!(state && myMatch && mySide && hasSubmitted(state, myMatch, mySide));

  const load = async () => {
    const next = await fetchWeekly();
    setState(next);
    setPhase('view');
  };

  useEffect(() => {
    if (!canPlayWeekly) {
      setPhase('offline');
      return;
    }
    load().catch(() => setPhase('offline'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the countdown moving, and re-reads the server while a match is
  // waiting on the other side to hand a score in.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (phase !== 'view' || !waiting) return;
    const id = setInterval(() => {
      load().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, waiting]);

  const toggleRegistration = async () => {
    if (busy || !state) return;
    setBusy(true);
    buzz('tap');
    try {
      setState(state.amRegistered ? await unregisterFromWeekly() : await registerForWeekly());
    } catch {
      await load().catch(() => {});
    }
    setBusy(false);
  };

  const finishGame = async (score: number) => {
    const match = playing;
    setPlaying(null);
    if (!match) return;
    onMatchPlayed(score, GAME_QUESTIONS);
    setPhase('view');
    setBusy(true);
    try {
      setState(await submitGameScore(match, score));
      buzz('success');
    } catch {
      await load().catch(() => {});
    }
    setBusy(false);
  };

  if (phase === 'playing' && playing) {
    return (
      <View style={{ flex: 1 }}>
        <QuizScreen
          key={quizKey}
          config={WEEKLY_MATCH_CONFIG}
          onFinish={(score) => finishGame(score)}
          onClose={() => {
            setPlaying(null);
            setPhase('view');
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <SoundTouchable onPress={onBack} style={styles.back} accessibilityRole="button">
          <Text style={styles.backText}>{`‹ ${t('tournament.back')}`}</Text>
        </SoundTouchable>
        <Text style={styles.headerTitle}>{t('tournament.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('tournament.format')}</Text>
      </View>

      {phase === 'loading' && <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />}

      {phase === 'offline' && (
        <View style={styles.offlineWrap}>
          <Icon name="globe" size={32} color={theme.textMuted} />
          <Text style={styles.offlineTitle}>{t('tournament.offlineTitle')}</Text>
          <Text style={styles.offlineText}>{t('tournament.offlineText')}</Text>
          <SoundTouchable style={styles.primaryButton} onPress={onOpenPractice} activeOpacity={0.88}>
            <Text style={styles.primaryButtonText}>{t('tournament.toPractice')}</Text>
          </SoundTouchable>
        </View>
      )}

      {phase === 'view' && state && (
        <>
          <View style={styles.tabs}>
            {TABS.map((key) => (
              <SoundTouchable
                key={key}
                style={[styles.tab, tab === key && styles.tabActive]}
                onPress={() => setTab(key)}
              >
                <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{t(`tournament.tab.${key}`)}</Text>
              </SoundTouchable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {state.tournament.status === 'registration' ? (
              <Registration
                state={state}
                styles={styles}
                theme={theme}
                t={t}
                busy={busy}
                onToggle={toggleRegistration}
              />
            ) : (
              <MyStanding
                state={state}
                bracket={bracket}
                myMatch={myMatch}
                waiting={waiting}
                styles={styles}
                theme={theme}
                t={t}
                busy={busy}
                onPlay={() => {
                  setQuizKey((k) => k + 1);
                  setPhase('playing');
                  setPlaying(myMatch);
                }}
                onRefresh={() => load().catch(() => {})}
              />
            )}

            {tab === 'bracket' && bracket && <BracketView bracket={bracket} state={state} styles={styles} theme={theme} t={t} />}
            {tab === 'players' && <Players state={state} styles={styles} theme={theme} t={t} bracket={bracket} />}
            {tab === 'matches' && bracket && <Matches bracket={bracket} state={state} styles={styles} t={t} theme={theme} />}
            {tab === 'rules' && <Rules styles={styles} theme={theme} t={t} />}

            <SoundTouchable style={styles.practiceLink} onPress={onOpenPractice} activeOpacity={0.85}>
              <Icon name="target" size={15} color={theme.primary} />
              <Text style={styles.practiceLinkText}>{t('tournament.practiceLink')}</Text>
              <Icon name="chevronRight" size={14} color={theme.textMuted} />
            </SoundTouchable>
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function formatCountdown(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м ${s}с`;
}

function Registration({
  state,
  styles,
  theme,
  t,
  busy,
  onToggle,
}: {
  state: WeeklyState;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  busy: boolean;
  onToggle: () => void;
}) {
  const left = secondsUntil(state.tournament.startsAt);
  const overflow = state.registeredCount > state.size;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{t('tournament.startsIn')}</Text>
      <Text style={styles.countdown}>{formatCountdown(left)}</Text>
      <Text style={styles.cardText}>{t('tournament.registeredCount', state.registeredCount, state.size)}</Text>
      {overflow && <Text style={styles.warnText}>{t('tournament.ratingCut', state.size)}</Text>}

      <SoundTouchable
        style={[styles.primaryButton, state.amRegistered && styles.ghostOutline]}
        onPress={onToggle}
        activeOpacity={0.88}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={state.amRegistered ? theme.text : theme.onInk} />
        ) : (
          <Text style={[styles.primaryButtonText, state.amRegistered && styles.ghostOutlineText]}>
            {state.amRegistered ? t('tournament.unregister') : t('tournament.register')}
          </Text>
        )}
      </SoundTouchable>
      {state.amRegistered && <Text style={styles.cardText}>{t('tournament.registeredHint')}</Text>}
    </View>
  );
}

/** The player's own situation: their open match, or why they have none. */
function MyStanding({
  state,
  bracket,
  myMatch,
  waiting,
  styles,
  theme,
  t,
  busy,
  onPlay,
  onRefresh,
}: {
  state: WeeklyState;
  bracket: DeBracket | null;
  myMatch: MatchId | null;
  waiting: boolean;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  busy: boolean;
  onPlay: () => void;
  onRefresh: () => void;
}) {
  const seat = state.mySeat;
  const finished = state.tournament.status === 'finished';
  const champion = bracket ? championSeed(bracket) : null;

  if (seat === null) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('tournament.notPlaying')}</Text>
        <Text style={styles.cardText}>
          {finished && champion !== null && bracket
            ? t('tournament.championIs', bracket.entrants[champion].name)
            : t('tournament.watchOnly')}
        </Text>
      </View>
    );
  }

  if (!bracket) return null;

  if (champion === seat) {
    return (
      <View style={styles.card}>
        <Icon name="crown" size={28} color={theme.primary} />
        <Text style={styles.cardLabel}>{t('tournament.youChampion')}</Text>
      </View>
    );
  }

  if (isEliminated(bracket, seat)) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('tournament.youOut')}</Text>
        <Text style={styles.cardText}>
          {champion !== null ? t('tournament.championIs', bracket.entrants[champion].name) : t('tournament.youOutHint')}
        </Text>
      </View>
    );
  }

  if (!myMatch) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t('tournament.waitingBracket')}</Text>
        <Text style={styles.cardText}>{t('tournament.waitingBracketHint')}</Text>
        <SoundTouchable style={styles.ghostOutline} onPress={onRefresh} activeOpacity={0.85} disabled={busy}>
          <Text style={styles.ghostOutlineText}>{t('tournament.refresh')}</Text>
        </SoundTouchable>
      </View>
    );
  }

  const [a, b] = participantsOf(bracket, myMatch);
  const rivalSeed = a === seat ? b! : a!;
  const rival = bracket.entrants[rivalSeed];
  const [winsA, winsB] = winsOf(bracket, myMatch);
  const myWins = a === seat ? winsA : winsB;
  const theirWins = a === seat ? winsB : winsA;
  const open = openGameOf(state, myMatch);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{t('tournament.yourMatch', matchName(myMatch, t))}</Text>
      <View style={styles.rivalRow}>
        <View style={styles.rivalAvatar}>
          <Text style={styles.rivalInitial}>{rival.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rivalName}>{rival.name}</Text>
          <Text style={styles.rivalKind}>
            {rival.userId === null ? t('tournament.bot') : t('tournament.player')} · {t('tournament.rating', rival.rating)}
          </Text>
        </View>
        <Text style={styles.seriesScore}>
          {myWins}:{theirWins}
        </Text>
      </View>

      {waiting ? (
        <>
          <Text style={styles.cardText}>{t('tournament.waitingRival', rival.name)}</Text>
          {open?.deadline && (
            <Text style={styles.cardText}>{t('tournament.deadlineIn', formatCountdown(secondsUntil(open.deadline)))}</Text>
          )}
          <SoundTouchable style={styles.ghostOutline} onPress={onRefresh} activeOpacity={0.85} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={theme.text} />
            ) : (
              <Text style={styles.ghostOutlineText}>{t('tournament.refresh')}</Text>
            )}
          </SoundTouchable>
        </>
      ) : (
        <>
          <Text style={styles.cardText}>
            {t('tournament.gameOf', (open?.game_no ?? 1), WINS_PER_MATCH * 2 - 1, GAME_QUESTIONS)}
          </Text>
          <SoundTouchable style={styles.primaryButton} onPress={onPlay} activeOpacity={0.88} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={theme.onInk} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('tournament.playGame')}</Text>
            )}
          </SoundTouchable>
        </>
      )}
    </View>
  );
}

/** "1/8", "Финал нижней сетки", "Гранд-финал" — a round a player can recognise. */
function matchName(id: MatchId, t: ReturnType<typeof useT>): string {
  const def = MATCH_DEFS.find((d) => d.id === id)!;
  if (def.bracket === 'gf') return t('tournament.grandFinal');
  if (def.bracket === 'wb') return t(`tournament.wbRound.${def.round}`);
  return t(`tournament.lbRound.${def.round}`);
}

function BracketView({
  bracket,
  state,
  styles,
  theme,
  t,
}: {
  bracket: DeBracket;
  state: WeeklyState;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
}) {
  const rounds = [
    { bracket: 'wb' as const, title: t('tournament.upperTitle'), hint: t('tournament.upperHint'), count: 4 },
    { bracket: 'lb' as const, title: t('tournament.lowerTitle'), hint: t('tournament.lowerHint'), count: 6 },
  ];

  return (
    <>
      {rounds.map((section) => (
        <View key={section.bracket}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionHint}>{section.hint}</Text>
          {Array.from({ length: section.count }, (_, round) => (
            <View key={round} style={styles.roundBlock}>
              <Text style={styles.roundLabel}>
                {section.bracket === 'wb' ? t(`tournament.wbRound.${round}`) : t(`tournament.lbRound.${round}`)}
              </Text>
              {MATCH_DEFS.filter((d) => d.bracket === section.bracket && d.round === round).map((def) => (
                <MatchRow key={def.id} id={def.id} bracket={bracket} state={state} styles={styles} theme={theme} t={t} />
              ))}
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.sectionTitle}>{t('tournament.grandFinal')}</Text>
      <View style={styles.roundBlock}>
        <MatchRow id="gf" bracket={bracket} state={state} styles={styles} theme={theme} t={t} highlight />
      </View>
    </>
  );
}

function MatchRow({
  id,
  bracket,
  state,
  styles,
  theme,
  t,
  highlight,
}: {
  id: MatchId;
  bracket: DeBracket;
  state: WeeklyState;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
  highlight?: boolean;
}) {
  const [a, b] = participantsOf(bracket, id);
  const [winsA, winsB] = winsOf(bracket, id);
  const done = isDecided(bracket, id);
  const mine = state.mySeat !== null && (a === state.mySeat || b === state.mySeat);

  const Side = ({ seed, wins, other }: { seed: number | null; wins: number; other: number }) => {
    const entrant = seed === null ? null : bracket.entrants[seed];
    const won = done && wins > other;
    return (
      <View style={styles.matchSide}>
        <Text
          style={[styles.matchName, !entrant && styles.matchNamePending, won && styles.matchNameWon]}
          numberOfLines={1}
        >
          {entrant ? entrant.name : '—'}
        </Text>
        <Text style={[styles.matchScore, won && styles.matchNameWon]}>{entrant ? wins : ''}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.matchCard, mine && styles.matchCardMine, highlight && styles.matchCardFinal]}>
      <Side seed={a} wins={winsA} other={winsB} />
      <View style={styles.matchDivider} />
      <Side seed={b} wins={winsB} other={winsA} />
    </View>
  );
}

function Players({
  state,
  bracket,
  styles,
  theme,
  t,
}: {
  state: WeeklyState;
  bracket: DeBracket | null;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
}) {
  if (!state.entrants.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardText}>{t('tournament.noEntrantsYet')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      {state.entrants.map((entrant, i) => {
        const losses = bracket ? lossesOf(bracket, entrant.seed) : 0;
        const out = losses >= 2;
        return (
          <View key={entrant.seed} style={[styles.listRow, i > 0 && styles.listRowDivided]}>
            <Text style={styles.listSeed}>{entrant.seed + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listName, entrant.isMe && styles.listNameMe, out && styles.listNameOut]} numberOfLines={1}>
                {entrant.name}
              </Text>
              <Text style={styles.listMeta}>
                {entrant.isBot ? t('tournament.bot') : t('tournament.player')} · {t('tournament.rating', entrant.rating)}
              </Text>
            </View>
            <Text style={[styles.listLosses, out && styles.listNameOut]}>
              {out ? t('tournament.outShort') : t('tournament.lossesShort', losses)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Matches({
  bracket,
  state,
  styles,
  t,
  theme,
}: {
  bracket: DeBracket;
  state: WeeklyState;
  styles: Styles;
  t: ReturnType<typeof useT>;
  theme: Theme;
}) {
  const played = MATCH_DEFS.filter((d) => isDecided(bracket, d.id)).reverse();
  if (!played.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardText}>{t('tournament.noMatchesYet')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      {played.map((def, i) => {
        const [a, b] = participantsOf(bracket, def.id);
        const [winsA, winsB] = winsOf(bracket, def.id);
        return (
          <View key={def.id} style={[styles.listRow, i > 0 && styles.listRowDivided]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listName} numberOfLines={1}>
                {bracket.entrants[a!].name} — {bracket.entrants[b!].name}
              </Text>
              <Text style={styles.listMeta}>{matchName(def.id, t)}</Text>
            </View>
            <Text style={styles.listLosses}>
              {winsA}:{winsB}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Rules({ styles, theme, t }: { styles: Styles; theme: Theme; t: ReturnType<typeof useT> }) {
  const rules = [
    t('tournament.rule.weekly'),
    t('tournament.rule.register'),
    t('tournament.rule.rating'),
    t('tournament.rule.double'),
    t('tournament.rule.series'),
    t('tournament.rule.deadline'),
    t('tournament.rule.bots'),
  ];
  return (
    <View style={styles.listCard}>
      {rules.map((rule, i) => (
        <View key={rule} style={[styles.listRow, i > 0 && styles.listRowDivided]}>
          <Icon name="check" size={15} color={theme.primary} />
          <Text style={styles.ruleText}>{rule}</Text>
        </View>
      ))}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
    back: { alignSelf: 'flex-start', paddingVertical: 4 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    headerTitle: { fontSize: 24, fontFamily: fontFamily('800'), color: theme.text, marginTop: 4 },
    headerSubtitle: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 2 },
    tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 10 },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tabText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    tabTextActive: { color: theme.onPrimary },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    card: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      padding: 16,
      alignItems: 'center',
      marginBottom: 20,
    },
    cardLabel: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text, textAlign: 'center' },
    cardText: {
      fontSize: 12,
      lineHeight: 17,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 6,
    },
    warnText: {
      fontSize: 12,
      fontFamily: fontFamily('600'),
      color: theme.primary,
      textAlign: 'center',
      marginTop: 6,
    },
    countdown: { fontSize: 30, fontFamily: fontFamily('800'), color: theme.text, marginTop: 4 },
    rivalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', marginTop: 12 },
    rivalAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rivalInitial: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.primary },
    rivalName: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text },
    rivalKind: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    seriesScore: { fontSize: 20, fontFamily: fontFamily('800'), color: theme.text },
    primaryButton: {
      alignSelf: 'stretch',
      backgroundColor: theme.ink,
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 16,
    },
    primaryButtonText: { color: theme.onInk, fontSize: 14, fontFamily: fontFamily('800') },
    ghostOutline: {
      alignSelf: 'stretch',
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      borderRadius: radius.pill,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 14,
    },
    ghostOutlineText: { color: theme.text, fontSize: 14, fontFamily: fontFamily('700') },
    sectionTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text, marginTop: 12 },
    sectionHint: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2, marginBottom: 10 },
    roundBlock: { marginBottom: 14 },
    roundLabel: {
      alignSelf: 'flex-start',
      fontSize: 11,
      fontFamily: fontFamily('700'),
      color: theme.primary,
      backgroundColor: theme.primaryLight,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 8,
      overflow: 'hidden',
    },
    matchCard: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.md ?? 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 6,
    },
    matchCardMine: { borderColor: theme.primary },
    matchCardFinal: { backgroundColor: theme.primaryLight, borderColor: theme.primaryLight },
    matchSide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 3 },
    matchDivider: { height: 1, backgroundColor: theme.border },
    matchName: { flex: 1, fontSize: 13, fontFamily: fontFamily('600'), color: theme.text },
    matchNamePending: { color: theme.textMuted },
    matchNameWon: { fontFamily: fontFamily('800'), color: theme.text },
    matchScore: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.textMuted, minWidth: 12, textAlign: 'right' },
    listCard: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    listRowDivided: { borderTopWidth: 1, borderTopColor: theme.border },
    listSeed: { width: 20, fontSize: 12, fontFamily: fontFamily('800'), color: theme.textMuted, textAlign: 'center' },
    listName: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    listNameMe: { color: theme.primary },
    listNameOut: { color: theme.textMuted, textDecorationLine: 'line-through' },
    listMeta: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    listLosses: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    ruleText: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: fontFamily('600'), color: theme.text },
    practiceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginTop: 16,
    },
    practiceLinkText: { flex: 1, fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    offlineWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 6 },
    offlineTitle: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.text, marginTop: 8, textAlign: 'center' },
    offlineText: {
      fontSize: 13,
      lineHeight: 18,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
    },
  });
}
