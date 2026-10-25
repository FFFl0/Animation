import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import AnimeAvatar from '../components/AnimeAvatar';
import { useT } from '../i18n/strings';
import GroupAvatar from './GroupAvatar';
import { ChatSummary, listChats } from './chatsApi';

type Props = {
  visible: boolean;
  meId: string;
  /** The conversation being forwarded out of, left out of the list — sending
   * a message back into the chat it already sits in is never the intent. */
  excludeId: string | null;
  onClose: () => void;
  onPick: (chat: ChatSummary) => void;
};

/** Picks where a message goes when it is forwarded. Reads the same chat list
 * the Chats screen does, so the destinations are in the order the person is
 * used to seeing them. */
export default function ForwardSheet({ visible, meId, excludeId, onClose, onPick }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    let alive = true;
    listChats(meId).then((list) => {
      if (alive) setChats(list);
    });
    return () => {
      alive = false;
    };
  }, [visible, meId]);

  const needle = query.trim().toLowerCase();
  const shown = chats.filter(
    (chat) => chat.id !== excludeId && (!needle || chat.title.toLowerCase().includes(needle))
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('chat.forwardTitle')}</Text>

          <View style={styles.searchRow}>
            <Icon name="search" size={15} color={theme.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('chat.forwardSearch')}
              placeholderTextColor={theme.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {shown.length === 0 ? (
              <Text style={styles.empty}>{t('chat.forwardEmpty')}</Text>
            ) : (
              shown.map((chat) => (
                <SoundTouchable key={`${chat.kind}-${chat.id}`} style={styles.row} onPress={() => onPick(chat)}>
                  {chat.kind === 'direct' && chat.player ? (
                    <AnimeAvatar avatar={chat.player.avatar} size={38} name={chat.player.username} />
                  ) : (
                    <GroupAvatar url={chat.group?.avatarUrl ?? null} size={38} />
                  )}
                  <Text style={styles.rowName} numberOfLines={1}>
                    {chat.title}
                  </Text>
                  <Icon name="send" size={15} color={theme.primary} />
                </SoundTouchable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1.5,
      borderColor: theme.border,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 28,
      maxHeight: '72%',
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, marginBottom: 14 },
    title: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 12 },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    searchInput: { flex: 1, fontSize: 14, fontFamily: fontFamily('500'), color: theme.text, padding: 0 },
    list: { marginTop: 10 },
    empty: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', paddingVertical: 28 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    rowName: { flex: 1, fontSize: 15, fontFamily: fontFamily('700'), color: theme.text },
  });
}
