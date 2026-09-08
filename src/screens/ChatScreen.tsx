import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { PlayerSummary } from '../friends/friendsApi';
import {
  ChatMessage,
  getConversation,
  isSupabaseConfigured,
  markConversationRead,
  sendMessage,
  subscribeIncomingMessages,
} from '../chat/chatApi';
import AnimeAvatar from '../components/AnimeAvatar';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { useT } from '../i18n/strings';

type Props = {
  friend: PlayerSummary;
  onBack: () => void;
};

export default function ChatScreen({ friend, onBack }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const meId = profile?.id ?? '';

  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;
    getConversation(meId, friend.id).then(setMessages);
    markConversationRead(meId, friend.id);
    const unsubscribe = subscribeIncomingMessages(meId, friend.id, (m) => setMessages((prev) => [...prev, m]));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, friend.id]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  if (!profile) return null;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    const sent = await sendMessage(meId, friend.id, text);
    if (sent) setMessages((prev) => [...prev, sent]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <SoundTouchable onPress={onBack} accessibilityRole="button" accessibilityLabel={t('chat.back')} style={styles.backButton}>
            <Text style={styles.backText}>{`‹ ${t('chat.back')}`}</Text>
          </SoundTouchable>
          <View style={styles.headerRow}>
            <AnimeAvatar avatar={friend.avatar} size={36} />
            <Text style={styles.headerName} numberOfLines={1}>{friend.username}</Text>
          </View>
        </View>

        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.list}>
          {messages.length === 0 ? (
            <Text style={styles.emptyText}>{t('chat.empty')}</Text>
          ) : (
            messages.map((m) => {
              const isMine = m.senderId === meId;
              return (
                <View key={m.id} style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{m.body}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={theme.textMuted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
            multiline
          />
          <SoundTouchable style={styles.sendButton} onPress={handleSend} accessibilityRole="button">
            <Icon name="send" size={17} color={theme.onPrimary} />
          </SoundTouchable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    backButton: { marginBottom: 10 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerName: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text, flexShrink: 1 },
    list: { paddingHorizontal: 16, paddingVertical: 16, gap: 8, flexGrow: 1 },
    emptyText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', marginTop: 40 },
    bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
    bubbleRowMine: { justifyContent: 'flex-end' },
    bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
    bubbleTheirs: { backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border, borderBottomLeftRadius: 4 },
    bubbleMine: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
    bubbleText: { fontSize: 14, fontFamily: fontFamily('500'), color: theme.text, lineHeight: 19 },
    bubbleTextMine: { color: theme.onPrimary },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    input: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.text,
      maxHeight: 100,
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
