import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { PlayerSummary, fetchPlayers } from '../friends/friendsApi';
import {
  ChatGroup,
  GroupMessage,
  deleteGroupMessage,
  getGroupMemberIds,
  getGroupMessages,
  getGroupReactions,
  isSupabaseConfigured,
  removeGroupMember,
  sendGroupMessage,
  subscribeGroupMessageDeletes,
  subscribeGroupMessages,
  subscribeGroupReactions,
  toggleGroupReaction,
} from '../chat/groupApi';
import ChatRoom from '../chat/ChatRoom';
import { useReactions } from '../chat/useReactions';
import AnimeAvatar from '../components/AnimeAvatar';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useT } from '../i18n/strings';

type Props = {
  group: ChatGroup;
  onBack: () => void;
  /** Called after leaving, so the caller can drop the group from its list. */
  onLeft: () => void;
};

export default function GroupChatScreen({ group, onBack, onLeft }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<PlayerSummary[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const meId = profile?.id ?? '';

  const toggle = useCallback(
    (messageId: string, userId: string, emoji: string, current: string | null) =>
      toggleGroupReaction(messageId, userId, emoji, current),
    []
  );
  const { refresh, grouped, mineFor, apply } = useReactions(meId, { fetch: getGroupReactions, toggle });

  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;

    const loadAll = async () => {
      const [list, memberIds] = await Promise.all([getGroupMessages(group.id), getGroupMemberIds(group.id)]);
      setMessages(list);
      refresh(list.map((m) => m.id));
      const byId = await fetchPlayers(memberIds);
      setMembers(memberIds.map((id) => byId.get(id)).filter((p): p is PlayerSummary => !!p));
    };
    loadAll();

    const unsubMessages = subscribeGroupMessages(group.id, (m) => {
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
    });
    const unsubDeletes = subscribeGroupMessageDeletes(group.id, (id) => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    });
    const unsubReactions = subscribeGroupReactions(() => {
      setMessages((prev) => {
        refresh(prev.map((m) => m.id));
        return prev;
      });
    });

    return () => {
      unsubMessages();
      unsubDeletes();
      unsubReactions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, group.id]);

  if (!profile) return null;

  const handleSend = async (text: string, replyToId: string | null) => {
    const sent = await sendGroupMessage(group.id, meId, text, replyToId);
    if (sent) setMessages((prev) => [...prev, sent]);
  };

  const handleDelete = async (message: GroupMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    await deleteGroupMessage(message.id);
  };

  const handleLeave = async () => {
    setShowMembers(false);
    await removeGroupMember(group.id, meId);
    onLeft();
  };

  /** Someone who left is no longer in the roster, so their old messages fall
   * back to a placeholder rather than showing a blank name. */
  const labelFor = (senderId: string) =>
    members.find((m) => m.id === senderId)?.username ?? t('groups.formerMember');

  return (
    <>
      <ChatRoom
        onBack={onBack}
        header={
          <SoundTouchable style={styles.headerRow} onPress={() => setShowMembers(true)} accessibilityRole="button">
            <View style={styles.groupBadge}>
              <Icon name="users" size={18} color={theme.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName} numberOfLines={1}>{group.name}</Text>
              <Text style={styles.headerSub}>{t('groups.memberCount', members.length)}</Text>
            </View>
            <Icon name="chevronRight" size={16} color={theme.textMuted} />
          </SoundTouchable>
        }
        messages={messages}
        meId={meId}
        labelFor={labelFor}
        showAuthors
        emptyText={t('groups.empty')}
        reactionsFor={grouped}
        myReactionFor={mineFor}
        onSend={handleSend}
        onToggleReaction={apply}
        onDelete={handleDelete}
        canDelete={(m) => m.senderId === meId}
      />

      <Modal visible={showMembers} transparent animationType="fade" onRequestClose={() => setShowMembers(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowMembers(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.cardTitle}>{group.name}</Text>
            <ScrollView style={styles.memberList}>
              {members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <AnimeAvatar avatar={member.avatar} size={32} name={member.username} />
                  <Text style={styles.memberName} numberOfLines={1}>{member.username}</Text>
                  {member.id === group.ownerId && <Text style={styles.ownerTag}>{t('groups.owner')}</Text>}
                </View>
              ))}
            </ScrollView>
            <SoundTouchable style={styles.leaveButton} onPress={handleLeave}>
              <Text style={styles.leaveText}>{t('groups.leave')}</Text>
            </SoundTouchable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    groupBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1 },
    headerName: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text },
    headerSub: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 28 },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 18,
    },
    cardTitle: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 12 },
    memberList: { maxHeight: 260 },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
    memberName: { flex: 1, fontSize: 14, fontFamily: fontFamily('600'), color: theme.text },
    ownerTag: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.primary, textTransform: 'uppercase' },
    leaveButton: {
      marginTop: 14,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    leaveText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.danger },
  });
}
