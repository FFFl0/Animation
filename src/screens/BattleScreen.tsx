import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../auth/supabaseClient';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';
import Icon, { IconName } from '../components/Icon';
import QuizScreen from './QuizScreen';
import { RoundConfig } from '../quiz/types';
import { dateSeed } from '../quiz/generateQuiz';
import {
  BattleFinishPayload,
  BattlePeer,
  BattleRoom,
  BattleStartPayload,
  generateRoomCode,
} from '../battle/battleRoom';
import { battleInviteUrl, looksLikeInviteLink, roomCodeFromInput } from '../battle/battleLink';
import { useT } from '../i18n/strings';
import { sendBattleInvite } from '../notifications/notificationsApi';
import ImageScrim from '../components/ImageScrim';
import FadeIn from '../components/FadeIn';
import QuestionKindChips from '../components/QuestionKindChips';
import { BATTLE_BANNER } from '../data/modeImages';
import { questionKindsOf } from '../data/roundPreview';
import { isLayoutCheck } from '../monitoring/layoutCheck';
import {
  BattleRecord,
  EMPTY_RECORD,
  battlesPlayed,
  loadBattleRecord,
  outcomeOf,
  saveBattleOutcome,
} from '../battle/battleRecord';

type Props = {
  onBack: () => void;
  /** Set when arriving here via a friend's "Бросить вызов" button — skips
   * the menu, immediately creates a room, notifies the friend in-app (a
   * `battle_invites` row, picked up by NotificationsContext), and opens the
   * share sheet with the invite link as a second delivery path. */
  challengeFriend?: { id: string; username: string };
  /** Set when arriving here by accepting an incoming battle invite, or by
   * opening an invite link — skips the menu and joins this room code
   * directly instead of creating one. */
  autoJoinRoomCode?: string;
};

type Phase = 'menu' | 'joinInput' | 'connecting' | 'waiting' | 'countdown' | 'playing' | 'result';

const BATTLE_QUESTION_COUNT = 10;

export default function BattleScreen({ onBack, challengeFriend, autoJoinRoomCode }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();

  const [phase, setPhase] = useState<Phase>('menu');
  const sharedForChallenge = useRef(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<BattlePeer | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [opponentProgress, setOpponentProgress] = useState<{ answered: number; score: number } | null>(null);
  const [opponentFinish, setOpponentFinish] = useState<BattleFinishPayload | null>(null);
  const [battleConfig, setBattleConfig] = useState<RoundConfig | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [localResult, setLocalResult] = useState<{ score: number; total: number } | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);
  const [record, setRecord] = useState<BattleRecord>(EMPTY_RECORD);
  /** Set once this battle's outcome is written down, so a re-render cannot count it twice. */
  const recorded = useRef(false);

  useEffect(() => {
    if (profile) void loadBattleRecord(profile.id).then(setRecord);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A battle counts once both scores are in. One where the rival left
  // before finishing is not counted either way: it was not played out.
  useEffect(() => {
    if (!profile || !localResult || !opponentFinish || recorded.current) return;
    recorded.current = true;
    void saveBattleOutcome(profile.id, outcomeOf(localResult.score, opponentFinish.score)).then(setRecord);
  }, [localResult, opponentFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  const roomRef = useRef<BattleRoom | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      roomRef.current?.leave();
    };
  }, []);

  /** The link that drops a friend straight into this room. */
  const inviteUrl = useMemo(() => (roomCode ? battleInviteUrl(roomCode) : ''), [roomCode]);
  const joinInputIsLink = looksLikeInviteLink(joinCodeInput);

  // Falls back to an empty id only in the impossible case profile is still
  // null here — the JSX that could actually invoke these callbacks is gated
  // behind the `if (!profile) return null` below, so this is never exercised.
  const me: BattlePeer = { userId: profile?.id ?? '', username: profile?.username ?? '' };

  const beginCountdown = (payload: BattleStartPayload) => {
    setBattleConfig(payload.config);
    setPhase('countdown');
    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((payload.startAt - Date.now()) / 1000));
      setCountdown(secondsLeft);
      if (secondsLeft <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        setPhase('playing');
      }
    };
    tick();
    countdownTimer.current = setInterval(tick, 200);
  };

  const connect = async (code: string, host: boolean) => {
    setError(null);
    setIsHost(host);
    setRoomCode(code);
    setPhase('connecting');

    const room = new BattleRoom(code, me);
    try {
      await room.connect({
        onPeerJoin: (peer) => {
          setOpponent(peer);
          setOpponentLeft(false);
          if (host) {
            const config: RoundConfig = { categoryId: 'mixed', questionCount: BATTLE_QUESTION_COUNT, seed: dateSeed(code + Date.now()) };
            const startAt = Date.now() + 4000;
            room.broadcastStart({ config, startAt });
            beginCountdown({ config, startAt });
          }
        },
        onPeerLeave: () => {
          setOpponent(null);
          setOpponentLeft(true);
        },
        onStart: (payload) => {
          if (!host) beginCountdown(payload);
        },
        onProgress: (payload) => {
          if (payload.userId !== me.userId) setOpponentProgress({ answered: payload.answered, score: payload.score });
        },
        onFinish: (payload) => {
          if (payload.userId !== me.userId) setOpponentFinish(payload);
        },
      });
      roomRef.current = room;
      setPhase('waiting');
    } catch {
      setError(t('battle.connectError'));
      setPhase('menu');
    }
  };

  const resetToMenu = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    roomRef.current?.leave();
    roomRef.current = null;
    setPhase('menu');
    setRoomCode('');
    setJoinCodeInput('');
    setOpponent(null);
    setOpponentLeft(false);
    setOpponentProgress(null);
    setOpponentFinish(null);
    setBattleConfig(null);
    setLocalResult(null);
    recorded.current = false;
  };

  const handleCreate = () => connect(generateRoomCode(), true);

  /** Left exactly as typed or pasted: the field holds either a code or a
   * whole link, and rewriting the text as it goes in mangles one of them.
   * Whitespace and case are sorted out when it is read, not while it is
   * being entered. */
  const handleJoinInputChange = (text: string) => {
    setJoinCodeInput(text);
    if (error) setError(null);
  };

  const handleJoinSubmit = () => {
    const code = roomCodeFromInput(joinCodeInput);
    if (!code) {
      setError(t('battle.inviteInputError'));
      return;
    }
    connect(code, false);
  };

  /** One tap for the common case: the link is already in the clipboard,
   * because the friend who sent it is in the chat app next door. */
  const handlePasteInvite = async () => {
    const clipboard = await Clipboard.getStringAsync().catch(() => '');
    const code = roomCodeFromInput(clipboard);
    if (!code) {
      // Whatever is already in the field is the player's own typing — the
      // clipboard turning out to hold something else is no reason to lose it.
      setError(t('battle.clipboardNoInvite'));
      return;
    }
    connect(code, false);
  };

  const copyToClipboard = async (what: 'link' | 'code', value: string) => {
    await Clipboard.setStringAsync(value).catch(() => {});
    setCopied(what);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), 2200);
  };

  const shareInvite = () => {
    Share.share({ message: t('battle.shareMessage', roomCode, inviteUrl) }).catch(() => {});
  };

  const handleFinish = (score: number, total: number) => {
    setLocalResult({ score, total });
    roomRef.current?.broadcastFinish({ userId: me.userId, score, total });
    setPhase('result');
  };

  useEffect(() => {
    if (autoJoinRoomCode && profile) connect(autoJoinRoomCode, false);
    else if (challengeFriend && profile) handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'waiting' && isHost && challengeFriend && !sharedForChallenge.current) {
      sharedForChallenge.current = true;
      sendBattleInvite(me.userId, challengeFriend.id, roomCode).catch(() => {});
      shareInvite();
    }
  }, [phase, isHost, roomCode, challengeFriend]);

  if (!profile) return null;

  // The layout check has no server, but still wants to see the menu laid out.
  if (!isSupabaseConfigured && !isLayoutCheck) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={t('battle.title')} onBack={onBack} theme={theme} backLabel={t('battle.back')} />
        <View style={styles.centerFill}>
          <Icon name="swords" size={40} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>{t('battle.needsCloudTitle')}</Text>
          <Text style={styles.emptyText}>{t('battle.needsCloudText')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'playing' && battleConfig) {
    return (
      <View style={{ flex: 1 }}>
        <QuizScreen
          // a bought hint against another player is an advantage nobody agreed to
          allowItems={false}
          config={battleConfig}
          onFinish={handleFinish}
          onClose={resetToMenu}
          onAnswer={(_correct, answered, score) => roomRef.current?.broadcastProgress({ userId: me.userId, answered, score })}
        />
        {opponent && (
          <View style={styles.opponentBadge} pointerEvents="none">
            <Icon name="swords" size={13} color={theme.primary} />
            <Text style={styles.opponentBadgeText}>
              {opponent.username}: {opponentProgress ? `${opponentProgress.answered}/${BATTLE_QUESTION_COUNT}` : '0/' + BATTLE_QUESTION_COUNT}
            </Text>
          </View>
        )}
        {opponentLeft && (
          <View style={styles.opponentLeftBanner} pointerEvents="none">
            <Text style={styles.opponentLeftText}>{t('battle.opponentLeftPlay')}</Text>
          </View>
        )}
      </View>
    );
  }

  if (phase === 'menu') {
    const played = battlesPlayed(record);
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={t('battle.title')} onBack={onBack} theme={theme} backLabel={t('battle.back')} />
        <ScrollView contentContainerStyle={styles.menu}>
          <Text style={styles.menuTitle}>{t('battle.title')}</Text>
          <Text style={styles.menuSubtitle}>{t('battle.menuSubtitle')}</Text>

          <FadeIn duration={260}>
            <View style={styles.hero}>
              <Image source={BATTLE_BANNER} style={styles.heroImage} resizeMode="cover" />
              <ImageScrim />
              <View style={styles.heroChips}>
                <HeroChip icon="swords" label={t('battle.ruleDuel')} styles={styles} />
                <HeroChip icon="target" label={t('battle.ruleQuestions', BATTLE_QUESTION_COUNT)} styles={styles} />
                <HeroChip icon="eye" label={t('battle.ruleLive')} styles={styles} />
                <HeroChip icon="lock" label={t('battle.ruleNoItems')} styles={styles} />
              </View>
            </View>
          </FadeIn>

          {error && <Text style={styles.error}>{error}</Text>}
          <PillButton title={t('battle.createBattle')} variant="ink" onPress={handleCreate} style={{ marginTop: 14 }} />
          <PillButton
            title={t('battle.joinByLinkOrCode')}
            variant="outline"
            onPress={() => setPhase('joinInput')}
            style={{ marginTop: 10 }}
          />

          <FadeIn duration={300} delay={80}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t('battle.howTitle')}</Text>
              {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                <View key={step} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{t(`battle.${step}`)}</Text>
                </View>
              ))}
            </View>
          </FadeIn>

          <FadeIn duration={300} delay={140}>
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t('battle.kindsTitle')}</Text>
              <Text style={styles.infoText}>{t('battle.kindsHint')}</Text>
              <View style={{ marginTop: 10 }}>
                <QuestionKindChips kinds={questionKindsOf('mixed')} color={theme.primary} background={theme.primaryLight} />
              </View>
            </View>
          </FadeIn>

          <FadeIn duration={300} delay={200}>
            <View style={styles.infoCard} testID="battle-record">
              <View style={styles.recordHead}>
                <Icon name="trophy" size={17} color={theme.primary} />
                <Text style={styles.infoTitle}>{t('battle.recordTitle')}</Text>
              </View>
              {played > 0 ? (
                <>
                  <View style={styles.recordRow}>
                    <RecordCell value={record.wins} label={t('battle.wins')} color={theme.success} styles={styles} />
                    <RecordCell value={record.losses} label={t('battle.losses')} color={theme.danger} styles={styles} />
                    <RecordCell value={record.draws} label={t('battle.draws')} color={theme.textMuted} styles={styles} />
                  </View>
                  <Text style={styles.recordNote}>{t('battle.recordNote')}</Text>
                </>
              ) : (
                <Text style={styles.infoText}>{t('battle.recordEmpty')}</Text>
              )}
            </View>
          </FadeIn>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={t('battle.title')} onBack={resetToMenu} theme={theme} backLabel={t('battle.back')} />
      <View style={styles.container}>

        {phase === 'joinInput' && (
          <>
            <Icon name="swords" size={40} color={theme.primary} />
            <Text style={styles.title}>{t('battle.roomCodeTitle')}</Text>
            <Text style={styles.subtitle}>{t('battle.roomCodeSubtitle')}</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput
              style={[styles.codeInput, joinInputIsLink && styles.linkInput]}
              placeholder={t('battle.codeOrLinkPlaceholder')}
              placeholderTextColor={theme.textMuted}
              // A pasted link must not be auto-capitalized, and it is longer
              // than a code, so neither setting can be fixed up front.
              autoCapitalize={joinInputIsLink ? 'none' : 'characters'}
              autoCorrect={false}
              value={joinCodeInput}
              onChangeText={handleJoinInputChange}
              onSubmitEditing={handleJoinSubmit}
              returnKeyType="go"
            />
            <PillButton title={t('battle.joinRoom')} variant="ink" onPress={handleJoinSubmit} style={{ marginTop: 8 }} />
            <PillButton
              title={t('battle.pasteLink')}
              variant="outline"
              onPress={handlePasteInvite}
              style={{ marginTop: 10 }}
            />
          </>
        )}

        {phase === 'connecting' && (
          <>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.subtitle}>{t('battle.connecting')}</Text>
          </>
        )}

        {phase === 'waiting' && (
          <>
            <Text style={styles.subtitle}>{isHost ? t('battle.shareInviteHint') : t('battle.waitingForStart')}</Text>
            {isHost && (
              <>
                <PillButton title={t('battle.shareLinkButton')} variant="ink" onPress={shareInvite} />
                <PillButton
                  title={copied === 'link' ? t('battle.linkCopied') : t('battle.copyLinkButton')}
                  variant="outline"
                  onPress={() => copyToClipboard('link', inviteUrl)}
                  style={{ marginTop: 10 }}
                />
                <Text style={styles.linkText} numberOfLines={1}>
                  {inviteUrl}
                </Text>
                {/* The code stays for the cases a link cannot cover: reading
                    it out over voice chat, or a messenger that mangles URLs. */}
                <SoundTouchable
                  style={styles.codeBox}
                  onPress={() => copyToClipboard('code', roomCode)}
                  accessibilityRole="button"
                  accessibilityLabel={t('battle.copyCodeButton')}
                >
                  <Text style={styles.codeText}>{roomCode}</Text>
                </SoundTouchable>
                <Text style={styles.codeHint}>
                  {copied === 'code' ? t('battle.codeCopied') : t('battle.tapCodeToCopy')}
                </Text>
              </>
            )}
            <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
            <Text style={styles.subtitle}>{t('battle.waitingForOpponent')}</Text>
          </>
        )}

        {phase === 'countdown' && (
          <>
            <Text style={styles.subtitle}>{t('battle.opponentFound')}</Text>
            <Text style={styles.countdownNumber}>{countdown > 0 ? countdown : t('battle.started')}</Text>
          </>
        )}

        {phase === 'result' && localResult && (
          <>
            <Icon
              name="trophy"
              size={40}
              color={
                !opponentFinish
                  ? theme.textMuted
                  : localResult.score > opponentFinish.score
                    ? theme.primary
                    : localResult.score < opponentFinish.score
                      ? theme.danger
                      : theme.textMuted
              }
            />
            <Text style={styles.title}>
              {!opponentFinish
                ? t('battle.waitingOpponentFinish')
                : localResult.score > opponentFinish.score
                  ? t('battle.win')
                  : localResult.score < opponentFinish.score
                    ? t('battle.lose')
                    : t('battle.draw')}
            </Text>
            <View style={styles.resultRow}>
              <View style={styles.resultCard}>
                <Text style={styles.resultName}>{profile.username}</Text>
                <Text style={styles.resultScore}>{localResult.score}/{localResult.total}</Text>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultName}>{opponent?.username ?? '—'}</Text>
                {opponentFinish ? (
                  <Text style={styles.resultScore}>{opponentFinish.score}/{opponentFinish.total}</Text>
                ) : opponentLeft ? (
                  <Text style={styles.resultScore}>—</Text>
                ) : (
                  <ActivityIndicator size="small" color={theme.primary} />
                )}
              </View>
            </View>
            {opponentLeft && !opponentFinish && (
              <Text style={styles.subtitle}>{t('battle.opponentLeftResult')}</Text>
            )}
            <PillButton title={t('battle.playAgain')} variant="ink" onPress={resetToMenu} style={{ marginTop: 20 }} />
          </>
        )}
      </View>
    </SafeAreaView>
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

function RecordCell({
  value,
  label,
  color,
  styles,
}: {
  value: number;
  label: string;
  color: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.recordCell}>
      <Text style={[styles.recordValue, { color }]}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
    </View>
  );
}

function Header({ title, onBack, theme, backLabel }: { title: string; onBack: () => void; theme: Theme; backLabel: string }) {
  return (
    <SoundTouchable
      onPress={onBack}
      style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={backLabel}
    >
      <Text style={{ color: theme.text, fontSize: 15, fontFamily: fontFamily('700') }}>‹ {title}</Text>
    </SoundTouchable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 4 },
    menu: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    menuTitle: { fontSize: 26, lineHeight: 32, fontFamily: fontFamily('800'), color: theme.text },
    menuSubtitle: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 6, marginBottom: 18 },
    hero: { height: 180, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: theme.primary },
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
      marginTop: 14,
    },
    infoTitle: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily('800'), color: theme.text },
    infoText: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4 },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10 },
    stepNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumberText: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily('800'), color: theme.primary },
    stepText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.text },
    recordHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    recordRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    recordCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: radius.md,
      backgroundColor: theme.background,
    },
    recordValue: { fontSize: 22, lineHeight: 28, fontFamily: fontFamily('800') },
    recordLabel: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily('700'), color: theme.textMuted, marginTop: 2 },
    recordNote: { fontSize: 11, lineHeight: 15, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 8 },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 8 },
    title: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text, marginTop: 10, textAlign: 'center' },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4, marginBottom: 8, textAlign: 'center', lineHeight: 19 },
    emptyTitle: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.text, marginTop: 6, textAlign: 'center' },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 19 },
    error: { color: theme.danger, fontSize: 14, fontFamily: fontFamily('500'), marginBottom: 4, textAlign: 'center' },
    codeInput: {
      width: '100%',
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 18,
      paddingVertical: 14,
      fontSize: 22,
      letterSpacing: 6,
      textAlign: 'center',
      fontFamily: fontFamily('800'),
      color: theme.text,
      marginBottom: 4,
    },
    linkInput: { fontSize: 13, letterSpacing: 0, textAlign: 'left', fontFamily: fontFamily('500') },
    linkText: {
      fontSize: 11,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      marginTop: 12,
      maxWidth: '100%',
    },
    codeBox: {
      backgroundColor: theme.primaryLight,
      borderRadius: radius.lg,
      paddingVertical: 14,
      paddingHorizontal: 32,
      marginTop: 16,
    },
    codeText: { fontSize: 28, fontFamily: fontFamily('800'), color: theme.text, letterSpacing: 8 },
    codeHint: {
      fontSize: 11,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      marginTop: 8,
      textAlign: 'center',
    },
    countdownNumber: { fontSize: 56, fontFamily: fontFamily('800'), color: theme.primary, marginTop: 12 },
    resultRow: { flexDirection: 'row', gap: 14, marginTop: 18, width: '100%' },
    resultCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 6,
    },
    resultName: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.textMuted },
    resultScore: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text },
    opponentBadge: {
      position: 'absolute',
      top: 14,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    opponentBadgeText: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.text },
    opponentLeftBanner: {
      position: 'absolute',
      top: 60,
      left: 20,
      right: 20,
      backgroundColor: theme.dangerBg,
      borderRadius: radius.lg,
      paddingVertical: 8,
      paddingHorizontal: 14,
      alignItems: 'center',
    },
    opponentLeftText: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.danger, textAlign: 'center' },
  });
}
