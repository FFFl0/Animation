import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { ChatGroup } from '../chat/groupApi';
import { PlayerSummary } from '../friends/friendsApi';
import { ChatSummary, isSupabaseConfigured, listChats, subscribeChatList } from '../chat/chatsApi';
import { attachmentPreview } from '../chat/attachments';
import { formatListStamp } from '../chat/messageGroups';
import { presenceOf } from '../chat/presence';
import GroupAvatar from '../chat/GroupAvatar';
import AnimeAvatar from '../components/AnimeAvatar';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';
import { useNotifications } from '../notifications/NotificationsContext';

type Props = {
  onOpenDirect: (player: PlayerSummary) => void;
  onOpenGroup: (group: ChatGroup) => void;
  /** Friends, requests and groups — where a conversation that doesn't exist
   * yet gets started from. */
  onOpenContacts: () => void;
};

/**
 * Every conversation in one place, newest first — the screen the messenger
 * actually opens on. Direct chats and groups used to be reachable only by
 * walking into a friend's profile or the groups list, which meant there was
 * no single answer to "who wrote to me".
 */
export default function ChatsScreen({ onOpenDirect, onOpenGroup, onOpenContacts }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const { badgeCount } = useNotifications();

  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const meId = profile?.id ?? '';

  const reload = useCallback(async () => {
    if (!meId) return;
    const list = await listChats(meId);
    setChats(list);
  }, [meId]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChats([]);
      return;
    }
    void reload();
    return subscribeChatList(() => {
      void reload();
    });
  }, [reload]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const needle = query.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!chats) return [];
    if (!needle) return chats;
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(needle) || (chat.lastMessage?.body ?? '').toLowerCase().includes(needle)
    );
  }, [chats, needle]);

  const emptyText = !isSupabaseConfigured ? t('chats.emptyLocal') : needle ? t('chats.searchEmpty') : t('chats.empty');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('chats.title')}</Text>
        <SoundTouchable
          style={styles.contactsButton}
          onPress={onOpenContacts}
          accessibilityRole="button"
          accessibilityLabel={t('chats.contacts')}
        >
          <Icon name="users" size={19} color={theme.text} />
          {badgeCount > 0 && (
            <View style={[styles.contactsBadge, { backgroundColor: theme.danger }]}>
              <Text style={styles.contactsBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
            </View>
          )}
        </SoundTouchable>
      </View>

      <View style={styles.searchWrap}>
        <Icon name="search" size={15} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('chats.searchPlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {chats === null ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          {shown.length === 0 ? (
            <Text style={styles.emptyText}>{emptyText}</Text>
          ) : (
            shown.map((chat) => (
              <ChatRow
                key={`${chat.kind}-${chat.id}`}
                chat={chat}
                meId={meId}
                theme={theme}
                styles={styles}
                stamp={chat.lastMessage ? formatListStamp(chat.lastMessage.createdAt, language) : ''}
                youPrefix={t('chats.youPrefix')}
                noMessagesText={t('chats.noMessages')}
                attachmentLabels={{ photo: t('chats.photo'), file: t('chats.file') }}
                onPress={() => {
                  if (chat.kind === 'direct' && chat.player) onOpenDirect(chat.player);
                  else if (chat.group) onOpenGroup(chat.group);
                }}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

type RowProps = {
  chat: ChatSummary;
  meId: string;
  theme: Theme;
  styles: ReturnType<typeof makeStyles>;
  stamp: string;
  youPrefix: string;
  noMessagesText: string;
  /** What a photo or an unnamed file reads as when it came with no caption. */
  attachmentLabels: { photo: string; file: string };
  onPress: () => void;
};

function ChatRow({
  chat,
  meId,
  theme,
  styles,
  stamp,
  youPrefix,
  noMessagesText,
  attachmentLabels,
  onPress,
}: RowProps) {
  const last = chat.lastMessage;
  const mine = last?.senderId === meId;
  const preview = last
    ? `${mine ? youPrefix : ''}${attachmentPreview(last.body, last.attachment, attachmentLabels)}`
    : noMessagesText;
  const online = chat.kind === 'direct' && presenceOf(chat.player?.lastSeenAt).online;

  return (
    <SoundTouchable style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View>
        {chat.kind === 'direct' && chat.player ? (
          <AnimeAvatar avatar={chat.player.avatar} size={48} name={chat.player.username} />
        ) : (
          <GroupAvatar url={chat.group?.avatarUrl ?? null} size={48} />
        )}
        {online && <View style={[styles.onlineDot, { borderColor: theme.background }]} />}
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {chat.title}
        </Text>
        <Text style={[styles.rowPreview, chat.unread > 0 && styles.rowPreviewUnread]} numberOfLines={1}>
          {preview}
        </Text>
      </View>

      <View style={styles.rowMeta}>
        {!!stamp && <Text style={styles.rowStamp}>{stamp}</Text>}
        {chat.unread > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.unreadBadgeText}>{chat.unread > 99 ? '99+' : chat.unread}</Text>
          </View>
        )}
      </View>
    </SoundTouchable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 10,
    },
    title: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text },
    contactsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactsBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    contactsBadgeText: { fontSize: 9, fontFamily: fontFamily('800'), color: '#FFFFFF' },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 6,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    searchInput: { flex: 1, fontSize: 14, fontFamily: fontFamily('500'), color: theme.text, padding: 0 },
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 28 },
    emptyText: {
      fontSize: 13,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: 48,
      paddingHorizontal: 24,
      lineHeight: 19,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 10, paddingHorizontal: 4 },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 1,
      width: 13,
      height: 13,
      borderRadius: 7,
      borderWidth: 2.5,
      backgroundColor: '#34C759',
    },
    rowBody: { flex: 1, gap: 3 },
    rowTitle: { fontSize: 16, fontFamily: fontFamily('800'), color: theme.text },
    rowPreview: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted },
    rowPreviewUnread: { color: theme.text, fontFamily: fontFamily('600') },
    rowMeta: { alignItems: 'flex-end', gap: 6, minWidth: 44 },
    rowStamp: { fontSize: 11, fontFamily: fontFamily('600'), color: theme.textMuted },
    unreadBadge: {
      minWidth: 21,
      height: 21,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadBadgeText: { fontSize: 11, fontFamily: fontFamily('800'), color: '#FFFFFF' },
  });
}
