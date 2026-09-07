import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../auth/supabaseClient';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';
import Icon from '../components/Icon';
import QuizScreen from './QuizScreen';
import { RoundConfig } from '../quiz/types';
import { dateSeed } from '../quiz/generateQuiz';
import {
  BattleFinishPayload,
  BattlePeer,
  BattleRoom,
  BattleStartPayload,
  generateRoomCode,
  normalizeRoomCode,
} from '../battle/battleRoom';
import { useT } from '../i18n/strings';

type Props = {
  onBack: () => void;
  /** Set when arriving here via a friend's "Бросить вызов" button — skips
   * the menu and immediately creates a room, then opens the share sheet
   * with the code once it's ready (no in-app delivery to a specific
   * player — sharing the code out-of-band is the whole MVP here). */
  challengeFriendUsername?: string;
};

type Phase = 'menu' | 'joinInput' | 'connecting' | 'waiting' | 'countdown' | 'playing' | 'result';

const BATTLE_QUESTION_COUNT = 10;

export default function BattleScreen({ onBack, challengeFriendUsername }: Props) {
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

  const roomRef = useRef<BattleRoom | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      roomRef.current?.leave();
    };
  }, []);

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
  };

  const handleCreate = () => connect(generateRoomCode(), true);

  const handleJoinSubmit = () => {
    const code = normalizeRoomCode(joinCodeInput);
    if (code.length !== 5) {
      setError(t('battle.codeLengthError'));
      return;
    }
    connect(code, false);
  };

  const handleFinish = (score: number, total: number) => {
    setLocalResult({ score, total });
    roomRef.current?.broadcastFinish({ userId: me.userId, score, total });
    setPhase('result');
  };

  useEffect(() => {
    if (challengeFriendUsername && profile) handleCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'waiting' && isHost && challengeFriendUsername && !sharedForChallenge.current) {
      sharedForChallenge.current = true;
      Share.share({
        message: t('battle.shareMessage', roomCode),
      }).catch(() => {});
    }
  }, [phase, isHost, roomCode, challengeFriendUsername]);

  if (!profile) return null;

  if (!isSupabaseConfigured) {
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

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={t('battle.title')} onBack={phase === 'menu' ? onBack : resetToMenu} theme={theme} backLabel={t('battle.back')} />
      <View style={styles.container}>
        {phase === 'menu' && (
          <>
            <Icon name="swords" size={40} color={theme.primary} />
            <Text style={styles.title}>{t('battle.title')}</Text>
            <Text style={styles.subtitle}>{t('battle.menuSubtitle')}</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <PillButton title={t('battle.createBattle')} variant="ink" onPress={handleCreate} style={{ marginTop: 8 }} />
            <PillButton title={t('battle.joinByCode')} variant="outline" onPress={() => setPhase('joinInput')} style={{ marginTop: 12 }} />
          </>
        )}

        {phase === 'joinInput' && (
          <>
            <Icon name="swords" size={40} color={theme.primary} />
            <Text style={styles.title}>{t('battle.roomCodeTitle')}</Text>
            <Text style={styles.subtitle}>{t('battle.roomCodeSubtitle')}</Text>
            {error && <Text style={styles.error}>{error}</Text>}
            <TextInput
              style={styles.codeInput}
              placeholder="ABCDE"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={5}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
            />
            <PillButton title={t('battle.joinRoom')} variant="ink" onPress={handleJoinSubmit} style={{ marginTop: 8 }} />
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
            <Text style={styles.subtitle}>{isHost ? t('battle.shareCodeHint') : t('battle.waitingForStart')}</Text>
            {isHost && (
              <>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{roomCode}</Text>
                </View>
                <PillButton
                  title={t('battle.shareCodeButton')}
                  variant="outline"
                  onPress={() => Share.share({ message: t('battle.shareMessage', roomCode) }).catch(() => {})}
                  style={{ marginTop: 14 }}
                />
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
    codeBox: {
      backgroundColor: theme.primaryLight,
      borderRadius: radius.lg,
      paddingVertical: 18,
      paddingHorizontal: 32,
      marginTop: 12,
    },
    codeText: { fontSize: 34, fontFamily: fontFamily('800'), color: theme.text, letterSpacing: 8 },
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
