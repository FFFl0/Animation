import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { fetchLeaderboard, isSupabaseConfigured, LeaderboardPeriod, LeaderboardRow } from '../leaderboard/leaderboardApi';
import { PlayerSummary, sendFriendRequest } from '../friends/friendsApi';
import { usePresence } from '../presence/PresenceContext';
import AnimeAvatar from '../components/AnimeAvatar';
import PillButton from '../components/PillButton';
import Icon from '../components/Icon';
import { useT } from '../i18n/strings';

type Props = {
  onBack: () => void;
  onOpenChat: (player: PlayerSummary) => void;
  onChallenge: (player: PlayerSummary) => void;
};

const MEDAL_COLORS = ['#D4A017', '#9CA3AF', '#B45309'];

function toPlayerSummary(row: LeaderboardRow): PlayerSummary {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    streakCount: 0,
    achievements: [],
    stats: {},
    totalScore: row.score,
    totalCorrect: row.totalCorrect,
    totalQuestions: row.totalQuestions,
    totalGames: 0,
  };
}

export default function LeaderboardScreen({ onBack, onOpenChat, onChallenge }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { isOnline } = usePresence();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [selectedRow, setSelectedRow] = useState<LeaderboardRow | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setRows([]);
      return;
    }
    setRows(null);
    fetchLeaderboard(period).then(setRows);
  }, [period]);

  const handleAddFriend = async (targetId: string) => {
    if (!profile) return;
    setRequestedIds((prev) => new Set(prev).add(targetId));
    await sendFriendRequest(profile.id, targetId);
  };

  const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
    { key: 'all', label: t('leaderboardPeriod.allTime') },
    { key: 'week', label: t('leaderboardPeriod.week') },
    { key: 'season', label: t('leaderboardPeriod.season') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <SoundTouchable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('leaderboard.backLabel')}>
          <Text style={styles.backText}>{t('leaderboard.back')}</Text>
        </SoundTouchable>
        <Text style={styles.title}>{t('leaderboard.title')}</Text>
      </View>

      {isSupabaseConfigured && (
        <View style={styles.periodTabs}>
          {PERIODS.map((p) => (
            <SoundTouchable
              key={p.key}
              style={[styles.periodTab, period === p.key && styles.periodTabActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodTabText, period === p.key && styles.periodTabTextActive]}>{p.label}</Text>
            </SoundTouchable>
          ))}
        </View>
      )}

      {!isSupabaseConfigured ? (
        <View style={styles.emptyWrap}>
          <Icon name="globe" size={32} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>{t('leaderboard.unavailableTitle')}</Text>
          <Text style={styles.emptyText}>{t('leaderboard.unavailableText')}</Text>
        </View>
      ) : rows === null ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="trophy" size={32} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>{t('leaderboard.emptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('leaderboard.emptyText')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {rows.map((row, i) => {
            const isMe = row.username === profile?.username;
            const accuracy = row.totalQuestions > 0 ? Math.round((row.totalCorrect / row.totalQuestions) * 100) : 0;
            const online = isOnline(row.id);
            return (
              <SoundTouchable
                key={row.username}
                style={[styles.row, isMe && styles.rowMe]}
                onPress={() => !isMe && setSelectedRow(row)}
                activeOpacity={isMe ? 1 : 0.7}
              >
                <Text style={[styles.rank, i < 3 && { color: MEDAL_COLORS[i] }]}>#{i + 1}</Text>
                <View style={styles.avatarWrap}>
                  <AnimeAvatar avatar={row.avatar} size={36} name={row.username} />
                  <View style={[styles.statusDot, { backgroundColor: online ? theme.success : theme.textMuted, borderColor: theme.card }]} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {row.username}
                    {isMe ? t('leaderboard.youSuffix') : ''}
                  </Text>
                  <Text style={styles.rowSub}>{t('leaderboard.accuracyLine', accuracy)}</Text>
                </View>
                <Text style={styles.rowScore}>{row.score}</Text>
              </SoundTouchable>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!selectedRow} transparent animationType="fade" onRequestClose={() => setSelectedRow(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedRow(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selectedRow && (
              <>
                <View style={styles.modalAvatarWrap}>
                  <AnimeAvatar avatar={selectedRow.avatar} size={64} name={selectedRow.username} />
                  <View
                    style={[
                      styles.statusDotLarge,
                      { backgroundColor: isOnline(selectedRow.id) ? theme.success : theme.textMuted, borderColor: theme.card },
                    ]}
                  />
                </View>
                <Text style={styles.modalName}>{selectedRow.username}</Text>
                <Text style={styles.modalStatusText}>
                  {isOnline(selectedRow.id) ? t('leaderboard.online') : t('leaderboard.offline')}
                </Text>

                <PillButton
                  title={t('friendProfile.write')}
                  variant="outline"
                  fullWidth
                  onPress={() => {
                    const player = toPlayerSummary(selectedRow);
                    setSelectedRow(null);
                    onOpenChat(player);
                  }}
                  style={{ marginTop: 18 }}
                />
                <PillButton
                  title={requestedIds.has(selectedRow.id) ? t('friendProfile.requestSentButton') : t('friendProfile.addFriend')}
                  variant="ink"
                  disabled={requestedIds.has(selectedRow.id)}
                  fullWidth
                  onPress={() => handleAddFriend(selectedRow.id)}
                  style={{ marginTop: 10 }}
                />
                <PillButton
                  title={t('friendProfile.challenge')}
                  variant="primary"
                  icon="⚔"
                  fullWidth
                  onPress={() => {
                    const player = toPlayerSummary(selectedRow);
                    setSelectedRow(null);
                    onChallenge(player);
                  }}
                  style={{ marginTop: 10 }}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    backButton: { marginBottom: 12 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    title: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text },
    periodTabs: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 4,
      gap: 4,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    periodTab: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
    periodTabActive: { backgroundColor: theme.primary },
    periodTabText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    periodTabTextActive: { color: theme.onPrimary },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
    emptyTitle: { fontSize: 16, fontFamily: fontFamily('700'), color: theme.text, marginTop: 6 },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 19 },
    list: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 10,
      gap: 10,
    },
    rowMe: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    rank: { width: 30, textAlign: 'center', fontSize: 13, fontFamily: fontFamily('800'), color: theme.textMuted },
    avatarWrap: { position: 'relative' },
    statusDot: {
      position: 'absolute',
      right: -1,
      bottom: -1,
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 2,
    },
    rowText: { flex: 1 },
    rowName: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    rowSub: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted },
    rowScore: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.primary },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
    },
    modalCard: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 24,
      alignItems: 'center',
    },
    modalAvatarWrap: { position: 'relative', marginBottom: 12 },
    statusDotLarge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 2.5,
    },
    modalName: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.text },
    modalStatusText: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 2 },
  });
}
