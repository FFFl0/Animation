import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import {
  Friendship,
  PlayerSummary,
  getFriendships,
  getRecommendations,
  isSupabaseConfigured,
  removeFriend,
  respondToRequest,
  searchPlayers,
  sendFriendRequest,
} from '../friends/friendsApi';
import { levelFromTotalCorrect } from '../data/level';
import AnimeAvatar from '../components/AnimeAvatar';
import SoundTouchable from '../sound/SoundTouchable';
import Icon from '../components/Icon';
import { Language, useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';
import { useNotifications } from '../notifications/NotificationsContext';
import { getUnreadCountsByFriend } from '../chat/chatApi';

type Props = {
  onBack: () => void;
  onOpenFriend: (player: PlayerSummary, friendship: Friendship | null) => void;
  onAcceptBattleInvite: (roomCode: string) => void;
};

type Tab = 'friends' | 'requests' | 'recommendations';

const MEDAL_COLORS = ['#D4A017', '#9CA3AF', '#B45309'];

export default function FriendsScreen({ onBack, onOpenFriend, onAcceptBattleInvite }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const { battleInvites, refresh: refreshNotifications, respondToInvite } = useNotifications();

  const [tab, setTab] = useState<Tab>('friends');
  const [friendships, setFriendships] = useState<Friendship[] | null>(null);
  const [recommendations, setRecommendations] = useState<PlayerSummary[] | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSummary[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invitesBusyId, setInvitesBusyId] = useState<string | null>(null);
  const [unreadByFriend, setUnreadByFriend] = useState<Map<string, number>>(new Map());

  const meId = profile?.id ?? '';

  const reload = () => {
    if (!profile) return;
    getFriendships(profile.id).then(setFriendships);
    getUnreadCountsByFriend(profile.id).then(setUnreadByFriend);
    refreshNotifications();
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  useEffect(() => {
    if (!friendships || !profile) return;
    const knownIds = friendships.map((f) => f.player.id);
    getRecommendations(profile.id, knownIds).then(setRecommendations);
  }, [friendships, profile]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || !profile) {
      setSearchResults([]);
      return;
    }
    const handle = setTimeout(() => {
      searchPlayers(trimmed, profile.id).then(setSearchResults);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, profile]);

  if (!profile) return null;

  const friends = (friendships ?? [])
    .filter((f) => f.status === 'accepted')
    .sort((a, b) => levelFromTotalCorrect(b.player.totalCorrect).xp - levelFromTotalCorrect(a.player.totalCorrect).xp);
  const incoming = (friendships ?? []).filter((f) => f.status === 'pending' && !f.isOutgoing);
  const outgoing = (friendships ?? []).filter((f) => f.status === 'pending' && f.isOutgoing);
  const friendshipByPlayerId = new Map((friendships ?? []).map((f) => [f.player.id, f]));

  const handleAdd = async (targetId: string) => {
    setBusyId(targetId);
    await sendFriendRequest(meId, targetId);
    reload();
    setBusyId(null);
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    setBusyId(friendshipId);
    await respondToRequest(friendshipId, accept);
    reload();
    setBusyId(null);
  };

  const handleRemove = async (friendshipId: string) => {
    setBusyId(friendshipId);
    await removeFriend(friendshipId);
    reload();
    setBusyId(null);
  };

  const handleBattleInvite = async (inviteId: string, accept: boolean) => {
    setInvitesBusyId(inviteId);
    const result = await respondToInvite(inviteId, accept);
    setInvitesBusyId(null);
    if (result) onAcceptBattleInvite(result.roomCode);
  };

  const renderPlayerActionRow = (player: PlayerSummary) => {
    const existing = friendshipByPlayerId.get(player.id);
    if (existing?.status === 'accepted') {
      return <Text style={styles.badgeDone}>{t('friends.alreadyFriends')}</Text>;
    }
    if (existing?.status === 'pending' && existing.isOutgoing) {
      return <Text style={styles.badgeMuted}>{t('friends.requestSent')}</Text>;
    }
    if (existing?.status === 'pending' && !existing.isOutgoing) {
      return <Text style={styles.badgeMuted}>{t('friends.awaitingYourResponse')}</Text>;
    }
    return (
      <SoundTouchable
        style={styles.addButton}
        onPress={() => handleAdd(player.id)}
        disabled={busyId === player.id}
        accessibilityRole="button"
      >
        <Icon name="userPlus" size={15} color={theme.onPrimary} />
      </SoundTouchable>
    );
  };

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header title={t('friends.title')} onBack={onBack} theme={theme} backLabel={t('friends.back')} />
        <View style={styles.emptyWrap}>
          <Icon name="user" size={32} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>{t('friends.needsCloudTitle')}</Text>
          <Text style={styles.emptyText}>{t('friends.needsCloudText')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={t('friends.title')} onBack={onBack} theme={theme} backLabel={t('friends.back')} />

      <View style={styles.searchWrap}>
        <Icon name="search" size={15} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('friends.searchPlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {query.trim().length >= 2 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {searchResults.length === 0 ? (
            <Text style={styles.emptyText}>{t('friends.noOneFound')}</Text>
          ) : (
            searchResults.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                theme={theme}
                styles={styles}
                language={language}
                t={t}
                onPress={() => onOpenFriend(player, friendshipByPlayerId.get(player.id) ?? null)}
                right={renderPlayerActionRow(player)}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <>
          <View style={styles.tabs}>
            <TabButton label={t('friends.tabAllFriends')} active={tab === 'friends'} onPress={() => setTab('friends')} styles={styles} />
            <TabButton
              label={`${t('friends.tabRequests')}${incoming.length + battleInvites.length ? ` ${incoming.length + battleInvites.length}` : ''}`}
              active={tab === 'requests'}
              onPress={() => setTab('requests')}
              styles={styles}
            />
            <TabButton label={t('friends.tabRecommendations')} active={tab === 'recommendations'} onPress={() => setTab('recommendations')} styles={styles} />
          </View>

          {friendships === null ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {tab === 'friends' &&
                (friends.length === 0 ? (
                  <Text style={styles.emptyText}>{t('friends.noFriendsYet')}</Text>
                ) : (
                  friends.map((f, i) => (
                    <PlayerRow
                      key={f.friendshipId}
                      player={f.player}
                      theme={theme}
                      styles={styles}
                      language={language}
                      t={t}
                      rank={i < 3 ? i : undefined}
                      hasUnread={unreadByFriend.has(f.player.id)}
                      onPress={() => onOpenFriend(f.player, f)}
                      right={<Text style={styles.xpText}>{levelFromTotalCorrect(f.player.totalCorrect).xp} {t('friends.xp')}</Text>}
                    />
                  ))
                ))}

              {tab === 'requests' && (
                <>
                  {incoming.length === 0 && outgoing.length === 0 && battleInvites.length === 0 && (
                    <Text style={styles.emptyText}>{t('friends.noRequests')}</Text>
                  )}
                  {battleInvites.length > 0 && (
                    <Text style={styles.sectionLabel}>{t('friends.battleInvitesTitle')}</Text>
                  )}
                  {battleInvites.map((invite) => (
                    <PlayerRow
                      key={invite.id}
                      player={invite.fromPlayer}
                      theme={theme}
                      styles={styles}
                      language={language}
                      t={t}
                      onPress={() => onOpenFriend(invite.fromPlayer, friendshipByPlayerId.get(invite.fromPlayer.id) ?? null)}
                      subtitleOverride={t('friends.battleInviteSub')}
                      right={
                        <View style={styles.requestActions}>
                          <SoundTouchable
                            style={styles.acceptButton}
                            onPress={() => handleBattleInvite(invite.id, true)}
                            disabled={invitesBusyId === invite.id}
                            accessibilityRole="button"
                          >
                            <Icon name="swords" size={14} color={theme.onPrimary} />
                          </SoundTouchable>
                          <SoundTouchable
                            style={styles.declineButton}
                            onPress={() => handleBattleInvite(invite.id, false)}
                            disabled={invitesBusyId === invite.id}
                            accessibilityRole="button"
                          >
                            <Icon name="close" size={14} color={theme.textMuted} />
                          </SoundTouchable>
                        </View>
                      }
                    />
                  ))}
                  {(incoming.length > 0 || outgoing.length > 0) && battleInvites.length > 0 && (
                    <Text style={styles.sectionLabel}>{t('friends.tabRequests')}</Text>
                  )}
                  {incoming.map((f) => (
                    <PlayerRow
                      key={f.friendshipId}
                      player={f.player}
                      theme={theme}
                      styles={styles}
                      language={language}
                      t={t}
                      onPress={() => onOpenFriend(f.player, f)}
                      right={
                        <View style={styles.requestActions}>
                          <SoundTouchable
                            style={styles.acceptButton}
                            onPress={() => handleRespond(f.friendshipId, true)}
                            disabled={busyId === f.friendshipId}
                            accessibilityRole="button"
                          >
                            <Icon name="check" size={14} color={theme.onPrimary} />
                          </SoundTouchable>
                          <SoundTouchable
                            style={styles.declineButton}
                            onPress={() => handleRespond(f.friendshipId, false)}
                            disabled={busyId === f.friendshipId}
                            accessibilityRole="button"
                          >
                            <Icon name="close" size={14} color={theme.textMuted} />
                          </SoundTouchable>
                        </View>
                      }
                    />
                  ))}
                  {outgoing.map((f) => (
                    <PlayerRow
                      key={f.friendshipId}
                      player={f.player}
                      theme={theme}
                      styles={styles}
                      language={language}
                      t={t}
                      onPress={() => onOpenFriend(f.player, f)}
                      right={
                        <SoundTouchable onPress={() => handleRemove(f.friendshipId)} disabled={busyId === f.friendshipId}>
                          <Text style={styles.badgeMuted}>{t('friends.cancel')}</Text>
                        </SoundTouchable>
                      }
                    />
                  ))}
                </>
              )}

              {tab === 'recommendations' &&
                (recommendations === null ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : recommendations.length === 0 ? (
                  <Text style={styles.emptyText}>{t('friends.noRecommendations')}</Text>
                ) : (
                  recommendations.map((player) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      theme={theme}
                      styles={styles}
                      language={language}
                      t={t}
                      onPress={() => onOpenFriend(player, null)}
                      right={renderPlayerActionRow(player)}
                    />
                  ))
                ))}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function Header({ title, onBack, theme, backLabel }: { title: string; onBack: () => void; theme: Theme; backLabel: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
      <SoundTouchable onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel} style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.text, fontSize: 15, fontFamily: fontFamily('700') }}>{`‹ ${backLabel}`}</Text>
      </SoundTouchable>
      <Text style={{ fontSize: 26, fontFamily: fontFamily('800'), color: theme.text }}>{title}</Text>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function TabButton({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: Styles }) {
  return (
    <SoundTouchable style={[styles.tab, active && styles.tabActive]} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </SoundTouchable>
  );
}

function PlayerRow({
  player,
  theme,
  styles,
  onPress,
  right,
  rank,
  language,
  t,
  subtitleOverride,
  hasUnread,
}: {
  player: PlayerSummary;
  theme: Theme;
  styles: Styles;
  onPress: () => void;
  right: React.ReactNode;
  rank?: number;
  language: Language;
  t: ReturnType<typeof useT>;
  subtitleOverride?: string;
  hasUnread?: boolean;
}) {
  const { level, title } = levelFromTotalCorrect(player.totalCorrect, language);
  return (
    <SoundTouchable style={styles.row} onPress={onPress} activeOpacity={0.85}>
      {rank !== undefined && <Text style={[styles.rank, { color: MEDAL_COLORS[rank] }]}>#{rank + 1}</Text>}
      <View>
        <AnimeAvatar avatar={player.avatar} size={40} />
        {hasUnread && <View style={[styles.unreadDot, { backgroundColor: theme.danger, borderColor: theme.card }]} />}
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>{player.username}</Text>
        <Text style={styles.rowSub}>{subtitleOverride ?? t('friends.rowSub', level, title, player.streakCount)}</Text>
      </View>
      {right}
    </SoundTouchable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginHorizontal: 20,
      marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 13, fontFamily: fontFamily('500'), color: theme.text, padding: 0 },
    tabs: {
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
    tab: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: 'center' },
    tabActive: { backgroundColor: theme.primary },
    tabText: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted },
    tabTextActive: { color: theme.onPrimary },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
    emptyTitle: { fontSize: 16, fontFamily: fontFamily('700'), color: theme.text, marginTop: 6 },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 19, paddingVertical: 8 },
    list: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
    sectionLabel: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 2 },
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
    rank: { width: 22, textAlign: 'center', fontSize: 13, fontFamily: fontFamily('800') },
    unreadDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
    },
    rowText: { flex: 1 },
    rowName: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    rowSub: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    xpText: { fontSize: 13, fontFamily: fontFamily('800'), color: theme.primary },
    addButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeDone: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.success },
    badgeMuted: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted },
    requestActions: { flexDirection: 'row', gap: 8 },
    acceptButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    declineButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
