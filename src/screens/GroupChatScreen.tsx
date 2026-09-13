import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { Friendship, PlayerSummary, fetchPlayers, getFriendships } from '../friends/friendsApi';
import {
  ChatGroup,
  GroupMessage,
  addGroupMembers,
  deleteGroup,
  deleteGroupMessage,
  getGroupMemberIds,
  getGroupMessages,
  getGroupReactions,
  isSupabaseConfigured,
  removeGroupMember,
  sendGroupMessage,
  setGroupAvatar,
  subscribeGroupMessageDeletes,
  subscribeGroupMessages,
  subscribeGroupReactions,
  toggleGroupReaction,
} from '../chat/groupApi';
import ChatRoom from '../chat/ChatRoom';
import GroupAvatar from '../chat/GroupAvatar';
import { useReactions } from '../chat/useReactions';
import { pickProfilePhoto } from '../avatar/photoPicker';
import { deleteGroupPhoto, uploadGroupPhoto } from '../avatar/avatarStorage';
import AnimeAvatar from '../components/AnimeAvatar';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useT } from '../i18n/strings';

type Props = {
  group: ChatGroup;
  onBack: () => void;
  /** Called after leaving or deleting, so the caller drops it from its list. */
  onLeft: () => void;
};

type Sheet = 'none' | 'settings' | 'addMembers';

export default function GroupChatScreen({ group: initialGroup, onBack, onLeft }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [group, setGroup] = useState(initialGroup);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<PlayerSummary[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [sheet, setSheet] = useState<Sheet>('none');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const meId = profile?.id ?? '';
  const isOwner = group.ownerId === meId;

  const toggle = useCallback(
    (messageId: string, userId: string, emoji: string, current: string | null) =>
      toggleGroupReaction(messageId, userId, emoji, current),
    []
  );
  const { refresh, grouped, mineFor, apply } = useReactions(meId, { fetch: getGroupReactions, toggle });

  const loadMembers = useCallback(async () => {
    const memberIds = await getGroupMemberIds(group.id);
    const byId = await fetchPlayers(memberIds);
    setMembers(memberIds.map((id) => byId.get(id)).filter((p): p is PlayerSummary => !!p));
  }, [group.id]);

  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;

    const loadAll = async () => {
      const list = await getGroupMessages(group.id);
      setMessages(list);
      refresh(list.map((m) => m.id));
      await loadMembers();
    };
    loadAll();
    getFriendships(profile.id).then((all) => setFriends(all.filter((f) => f.status === 'accepted')));

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

  const handleDeleteMessage = async (message: GroupMessage) => {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
    await deleteGroupMessage(message.id);
  };

  const handlePickAvatar = async () => {
    if (busy) return;
    setBusy(true);
    setPhotoError(null);
    const result = await pickProfilePhoto();
    if (result.status === 'ok') {
      // Unlike a profile photo there is no inline fallback: a group row is
      // read by every member, so its picture has to be a URL they can fetch.
      // A failed upload therefore has to be said out loud rather than
      // quietly leaving the old picture in place.
      const url = await uploadGroupPhoto(meId, group.id, result.base64);
      const updated = url ? await setGroupAvatar(group.id, url) : null;
      if (updated) setGroup(updated);
      else setPhotoError(t('groups.photoFailed'));
    } else if (result.status === 'permissionDenied') {
      setPhotoError(t('profile.photoPermissionDenied'));
    } else if (result.status === 'failed') {
      setPhotoError(t('profile.photoFailed'));
    }
    setBusy(false);
  };

  const handleClearAvatar = async () => {
    const updated = await setGroupAvatar(group.id, null);
    if (updated) setGroup(updated);
    await deleteGroupPhoto(meId, group.id);
  };

  const handleAddMembers = async () => {
    if (picked.size === 0) return;
    setBusy(true);
    await addGroupMembers(group.id, Array.from(picked));
    await loadMembers();
    setPicked(new Set());
    setBusy(false);
    setSheet('settings');
  };

  const handleRemoveMember = async (userId: string) => {
    await removeGroupMember(group.id, userId);
    setMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleLeave = async () => {
    setSheet('none');
    await removeGroupMember(group.id, meId);
    onLeft();
  };

  const handleDeleteGroup = async () => {
    setSheet('none');
    setConfirmDelete(false);
    // The picture is not cascaded away with the row — Storage knows nothing
    // about the table — so it goes first.
    await deleteGroupPhoto(meId, group.id);
    await deleteGroup(group.id);
    onLeft();
  };

  /** Someone who left is no longer in the roster, so their old messages fall
   * back to a placeholder rather than showing a blank name. */
  const labelFor = (senderId: string) =>
    members.find((m) => m.id === senderId)?.username ?? t('groups.formerMember');

  const addable = friends.filter(({ player }) => !members.some((m) => m.id === player.id));

  return (
    <>
      <ChatRoom
        onBack={onBack}
        header={
          <SoundTouchable style={styles.headerRow} onPress={() => setSheet('settings')} accessibilityRole="button">
            <GroupAvatar url={group.avatarUrl} size={36} />
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
        onDelete={handleDeleteMessage}
        canDelete={(m) => m.senderId === meId}
      />

      <Modal visible={sheet !== 'none'} transparent animationType="fade" onRequestClose={() => setSheet('none')}>
        <Pressable style={styles.backdrop} onPress={() => setSheet('none')}>
          <Pressable style={styles.card} onPress={() => {}}>
            {sheet === 'settings' ? (
              <>
                <View style={styles.avatarBlock}>
                  <GroupAvatar url={group.avatarUrl} size={72} />
                  <Text style={styles.cardTitle} numberOfLines={1}>{group.name}</Text>
                  {isOwner && (
                    <View style={styles.avatarActions}>
                      <SoundTouchable style={styles.smallButton} onPress={handlePickAvatar} disabled={busy}>
                        <Icon name="image" size={13} color={theme.primary} />
                        <Text style={styles.smallButtonText}>
                          {group.avatarUrl ? t('groups.changePhoto') : t('groups.addPhoto')}
                        </Text>
                      </SoundTouchable>
                      {group.avatarUrl && (
                        <SoundTouchable style={styles.smallButton} onPress={handleClearAvatar}>
                          <Icon name="trash" size={13} color={theme.danger} />
                          <Text style={[styles.smallButtonText, { color: theme.danger }]}>
                            {t('groups.removePhoto')}
                          </Text>
                        </SoundTouchable>
                      )}
                    </View>
                  )}
                  {busy && <ActivityIndicator style={styles.busy} color={theme.primary} />}
                  {photoError && <Text style={styles.photoError}>{photoError}</Text>}
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>{t('groups.membersTitle')}</Text>
                  {isOwner && addable.length > 0 && (
                    <SoundTouchable style={styles.smallButton} onPress={() => setSheet('addMembers')}>
                      <Icon name="userPlus" size={13} color={theme.primary} />
                      <Text style={styles.smallButtonText}>{t('groups.addMembers')}</Text>
                    </SoundTouchable>
                  )}
                </View>

                <ScrollView style={styles.list}>
                  {members.map((member) => (
                    <View key={member.id} style={styles.row}>
                      <AnimeAvatar avatar={member.avatar} size={32} name={member.username} />
                      <Text style={styles.rowName} numberOfLines={1}>{member.username}</Text>
                      {member.id === group.ownerId ? (
                        <Text style={styles.ownerTag}>{t('groups.owner')}</Text>
                      ) : (
                        isOwner && (
                          <SoundTouchable
                            onPress={() => handleRemoveMember(member.id)}
                            accessibilityRole="button"
                            accessibilityLabel={t('groups.removeMember')}
                          >
                            <Icon name="close" size={16} color={theme.textMuted} />
                          </SoundTouchable>
                        )
                      )}
                    </View>
                  ))}
                </ScrollView>

                {confirmDelete ? (
                  <View style={styles.confirmBlock}>
                    <Text style={styles.confirmText}>{t('groups.deleteConfirm')}</Text>
                    <View style={styles.confirmRow}>
                      <SoundTouchable style={styles.confirmCancel} onPress={() => setConfirmDelete(false)}>
                        <Text style={styles.confirmCancelText}>{t('groups.cancel')}</Text>
                      </SoundTouchable>
                      <SoundTouchable style={styles.confirmDelete} onPress={handleDeleteGroup}>
                        <Text style={styles.confirmDeleteText}>{t('groups.deleteConfirmYes')}</Text>
                      </SoundTouchable>
                    </View>
                  </View>
                ) : (
                  <SoundTouchable
                    style={styles.dangerButton}
                    onPress={isOwner ? () => setConfirmDelete(true) : handleLeave}
                  >
                    <Text style={styles.dangerText}>{isOwner ? t('groups.deleteGroup') : t('groups.leave')}</Text>
                  </SoundTouchable>
                )}
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>{t('groups.addMembers')}</Text>
                {addable.length === 0 ? (
                  <Text style={styles.emptyText}>{t('groups.everyoneAdded')}</Text>
                ) : (
                  <ScrollView style={styles.list}>
                    {addable.map(({ player }) => {
                      const on = picked.has(player.id);
                      return (
                        <SoundTouchable
                          key={player.id}
                          style={styles.row}
                          onPress={() =>
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (next.has(player.id)) next.delete(player.id);
                              else next.add(player.id);
                              return next;
                            })
                          }
                        >
                          <AnimeAvatar avatar={player.avatar} size={32} name={player.username} />
                          <Text style={styles.rowName} numberOfLines={1}>{player.username}</Text>
                          <View style={[styles.checkbox, on && styles.checkboxOn]}>
                            {on && <Icon name="check" size={12} color={theme.onPrimary} strokeWidth={3} />}
                          </View>
                        </SoundTouchable>
                      );
                    })}
                  </ScrollView>
                )}

                <SoundTouchable
                  style={[styles.primaryButton, (picked.size === 0 || busy) && styles.primaryButtonOff]}
                  onPress={handleAddMembers}
                  disabled={picked.size === 0 || busy}
                >
                  <Text style={styles.primaryText}>{t('groups.add')}</Text>
                </SoundTouchable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerText: { flex: 1 },
    headerName: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text },
    headerSub: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 28 },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 18,
    },
    avatarBlock: { alignItems: 'center', gap: 8, marginBottom: 6 },
    avatarActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    busy: { marginTop: 4 },
    photoError: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.danger, textAlign: 'center' },
    cardTitle: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, textAlign: 'center' },
    smallButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },
    smallButtonText: { fontSize: 11, fontFamily: fontFamily('700'), color: theme.primary },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 16,
      marginBottom: 4,
    },
    sectionLabel: {
      fontSize: 11,
      fontFamily: fontFamily('700'),
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    list: { maxHeight: 220 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
    rowName: { flex: 1, fontSize: 14, fontFamily: fontFamily('600'), color: theme.text },
    ownerTag: { fontSize: 10, fontFamily: fontFamily('800'), color: theme.primary, textTransform: 'uppercase' },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', marginTop: 14 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
    primaryButton: {
      marginTop: 16,
      alignItems: 'center',
      paddingVertical: 13,
      borderRadius: radius.pill,
      backgroundColor: theme.primary,
    },
    primaryButtonOff: { opacity: 0.5 },
    primaryText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.onPrimary },
    dangerButton: {
      marginTop: 14,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    dangerText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.danger },
    confirmBlock: { marginTop: 14, gap: 10 },
    confirmText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.text, textAlign: 'center', lineHeight: 18 },
    confirmRow: { flexDirection: 'row', gap: 10 },
    confirmCancel: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    confirmCancelText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    confirmDelete: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.pill,
      backgroundColor: theme.danger,
    },
    confirmDeleteText: { fontSize: 14, fontFamily: fontFamily('700'), color: '#FFFFFF' },
  });
}
