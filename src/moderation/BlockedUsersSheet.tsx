import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import AnimeAvatar from '../components/AnimeAvatar';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { PlayerSummary } from '../friends/friendsApi';
import { fetchBlockedPlayers } from './moderationApi';
import { useModeration } from './ModerationContext';

/**
 * Everybody this player has blocked, with the way back.
 *
 * A block that cannot be undone is a trap: the person blocked is no longer
 * a friend and no longer in any list, so without this screen there would be
 * nowhere left to find them and change one's mind.
 */
export default function BlockedUsersSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { unblock } = useModeration();
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setPlayers(null);
    setFailed(false);
    fetchBlockedPlayers()
      .then(setPlayers)
      .catch(() => setFailed(true));
  }, [visible]);

  const release = async (id: string) => {
    if (await unblock(id)) setPlayers((list) => (list ?? []).filter((player) => player.id !== id));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t('moderation.blockedTitle')}</Text>

          {failed ? (
            <Text style={styles.text}>{t('moderation.failed')}</Text>
          ) : players === null ? (
            <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
          ) : players.length === 0 ? (
            <Text style={styles.text}>{t('moderation.blockedEmpty')}</Text>
          ) : (
            <ScrollView style={styles.list}>
              {players.map((player, i) => (
                <View key={player.id} style={[styles.row, i > 0 && styles.rowDivided]}>
                  <AnimeAvatar avatar={player.avatar} size={36} name={player.username} />
                  <Text style={styles.name} numberOfLines={1}>
                    {player.username}
                  </Text>
                  <SoundTouchable style={styles.unblock} onPress={() => release(player.id)} accessibilityRole="button">
                    <Text style={styles.unblockText}>{t('moderation.unblock')}</Text>
                  </SoundTouchable>
                </View>
              ))}
            </ScrollView>
          )}

          <SoundTouchable style={styles.close} onPress={onClose} accessibilityRole="button">
            <Text style={styles.closeText}>{t('moderation.done')}</Text>
          </SoundTouchable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
    card: {
      maxHeight: '80%',
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 20,
    },
    title: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 8 },
    text: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.textMuted, marginVertical: 12 },
    list: { flexGrow: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    rowDivided: { borderTopWidth: 1, borderTopColor: theme.border },
    name: { flex: 1, fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    unblock: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    unblockText: { fontSize: 12, fontFamily: fontFamily('800'), color: theme.text },
    close: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
    closeText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.textMuted },
  });
}
