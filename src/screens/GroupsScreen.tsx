import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { Friendship, getFriendships, isSupabaseConfigured } from '../friends/friendsApi';
import { ChatGroup, createGroup, listMyGroups } from '../chat/groupApi';
import AnimeAvatar from '../components/AnimeAvatar';
import GroupAvatar from '../chat/GroupAvatar';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useT } from '../i18n/strings';

type Props = {
  onBack: () => void;
  onOpenGroup: (group: ChatGroup) => void;
};

export default function GroupsScreen({ onBack, onOpenGroup }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [groups, setGroups] = useState<ChatGroup[] | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || !isSupabaseConfigured) {
      setGroups([]);
      return;
    }
    listMyGroups().then(setGroups);
    getFriendships(profile.id).then((all) => setFriends(all.filter((f) => f.status === 'accepted')));
  }, [profile?.id]);

  if (!profile) return null;

  const togglePicked = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const group = await createGroup(name, profile.id, Array.from(picked));
    setBusy(false);
    if (!group) {
      setError(t('groups.createFailed'));
      return;
    }
    setGroups((prev) => [group, ...(prev ?? [])]);
    setCreating(false);
    setName('');
    setPicked(new Set());
    onOpenGroup(group);
  };

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={onBack} title={t('groups.title')} styles={styles} t={t} onCreate={null} theme={theme} />
        <View style={styles.emptyWrap}>
          <Icon name="users" size={26} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>{t('groups.needCloud')}</Text>
          <Text style={styles.emptyText}>{t('groups.needCloudHint')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header onBack={onBack} title={t('groups.title')} styles={styles} t={t} onCreate={() => setCreating(true)} theme={theme} />

      {groups === null ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="users" size={26} color={theme.textMuted} />
          <Text style={styles.emptyTitle}>{t('groups.noGroups')}</Text>
          <Text style={styles.emptyText}>{t('groups.noGroupsHint')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {groups.map((group) => (
            <SoundTouchable key={group.id} style={styles.row} onPress={() => onOpenGroup(group)} activeOpacity={0.85}>
              <GroupAvatar url={group.avatarUrl} size={40} />
              <View style={styles.rowText}>
                <Text style={styles.rowName} numberOfLines={1}>{group.name}</Text>
                {group.ownerId === profile.id && <Text style={styles.rowSub}>{t('groups.yours')}</Text>}
              </View>
              <Icon name="chevronRight" size={16} color={theme.textMuted} />
            </SoundTouchable>
          ))}
        </ScrollView>
      )}

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreating(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.cardTitle}>{t('groups.newGroupTitle')}</Text>

            <TextInput
              style={styles.nameInput}
              placeholder={t('groups.namePlaceholder')}
              placeholderTextColor={theme.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />

            <Text style={styles.pickLabel}>{t('groups.pickMembers')}</Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>{t('groups.noFriendsYet')}</Text>
            ) : (
              <ScrollView style={styles.pickList}>
                {friends.map(({ player }) => {
                  const on = picked.has(player.id);
                  return (
                    <SoundTouchable key={player.id} style={styles.pickRow} onPress={() => togglePicked(player.id)}>
                      <AnimeAvatar avatar={player.avatar} size={32} name={player.username} />
                      <Text style={styles.pickName} numberOfLines={1}>{player.username}</Text>
                      <View style={[styles.checkbox, on && styles.checkboxOn]}>
                        {on && <Icon name="check" size={12} color={theme.onPrimary} strokeWidth={3} />}
                      </View>
                    </SoundTouchable>
                  );
                })}
              </ScrollView>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <SoundTouchable
              style={[styles.createButton, (!name.trim() || busy) && styles.createButtonOff]}
              onPress={handleCreate}
              disabled={!name.trim() || busy}
            >
              <Text style={styles.createText}>{t('groups.create')}</Text>
            </SoundTouchable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Header({
  onBack,
  title,
  onCreate,
  styles,
  theme,
  t,
}: {
  onBack: () => void;
  title: string;
  onCreate: (() => void) | null;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
}) {
  return (
    <View style={styles.header}>
      <SoundTouchable onPress={onBack} accessibilityRole="button">
        <Text style={styles.backText}>{`‹ ${t('chat.back')}`}</Text>
      </SoundTouchable>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {onCreate && (
          <SoundTouchable style={styles.newButton} onPress={onCreate} accessibilityRole="button">
            <Icon name="userPlus" size={15} color={theme.primary} />
            <Text style={styles.newButtonText}>{t('groups.newGroupButton')}</Text>
          </SoundTouchable>
        )}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700'), marginBottom: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    title: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, flexShrink: 1 },
    newButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: theme.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    newButtonText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.primary },
    loader: { marginTop: 40 },
    list: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 30, gap: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowText: { flex: 1 },
    rowName: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
    rowSub: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 8 },
    emptyTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text, textAlign: 'center' },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 19 },
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
    cardTitle: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 12 },
    nameInput: {
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.text,
    },
    pickLabel: {
      fontSize: 11,
      fontFamily: fontFamily('700'),
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 16,
      marginBottom: 6,
    },
    pickList: { maxHeight: 220 },
    pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
    pickName: { flex: 1, fontSize: 14, fontFamily: fontFamily('600'), color: theme.text },
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
    error: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.danger, marginTop: 10 },
    createButton: {
      marginTop: 16,
      alignItems: 'center',
      paddingVertical: 13,
      borderRadius: radius.pill,
      backgroundColor: theme.primary,
    },
    createButtonOff: { opacity: 0.5 },
    createText: { fontSize: 15, fontFamily: fontFamily('700'), color: theme.onPrimary },
  });
}
