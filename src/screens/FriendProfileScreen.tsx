import { useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { Friendship, PlayerSummary, removeFriend, respondToRequest, sendFriendRequest } from '../friends/friendsApi';
import { levelFromTotalCorrect } from '../data/level';
import { topCategories } from '../data/favoriteCategories';
import { ACHIEVEMENTS } from '../data/achievements';
import { getCategory } from '../data/categories';
import AnimeAvatar from '../components/AnimeAvatar';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';
import Icon from '../components/Icon';

type Props = {
  player: PlayerSummary;
  friendship: Friendship | null;
  onBack: () => void;
  onCompare: () => void;
  onChallenge: () => void;
};

function initialStatus(friendship: Friendship | null): 'none' | 'pending-out' | 'pending-in' | 'accepted' {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'accepted';
  return friendship.isOutgoing ? 'pending-out' : 'pending-in';
}

export default function FriendProfileScreen({ player, friendship, onBack, onCompare, onChallenge }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [status, setStatus] = useState(initialStatus(friendship));
  const [busy, setBusy] = useState(false);
  const [id, setId] = useState(friendship?.friendshipId ?? null);

  if (!profile) return null;

  const { level, title } = levelFromTotalCorrect(player.totalCorrect);
  const accuracy = player.totalQuestions > 0 ? Math.round((player.totalCorrect / player.totalQuestions) * 100) : 0;
  const unlockedAchievements = ACHIEVEMENTS.filter((a) => player.achievements.includes(a.id));
  const favoriteCategories = topCategories(player.stats);

  const handleAdd = async () => {
    setBusy(true);
    await sendFriendRequest(profile.id, player.id);
    setStatus('pending-out');
    setBusy(false);
  };

  const handleRemove = async () => {
    if (!id) return;
    setBusy(true);
    await removeFriend(id);
    setStatus('none');
    setId(null);
    setBusy(false);
  };

  const handleAccept = async () => {
    if (!id) return;
    setBusy(true);
    await respondToRequest(id, true);
    setStatus('accepted');
    setBusy(false);
  };

  const handleMessage = () => {
    Alert.alert('Скоро', 'Сообщения друзьям появятся в одном из следующих обновлений.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <SoundTouchable onPress={onBack} accessibilityRole="button" accessibilityLabel="Назад" style={{ marginBottom: 12 }}>
          <Text style={styles.backText}>‹ Назад</Text>
        </SoundTouchable>

        <View style={styles.header}>
          <AnimeAvatar avatar={player.avatar} size={110} />
          <Text style={styles.name}>{player.username}</Text>
          <Text style={styles.levelLine}>Уровень {level} · {title}</Text>
        </View>

        <View style={styles.actionsRow}>
          {status === 'accepted' && (
            <>
              <PillButton title="Написать" variant="outline" onPress={handleMessage} fullWidth={false} style={styles.actionButton} />
              <PillButton title="Сравнить" variant="outline" onPress={onCompare} fullWidth={false} style={styles.actionButton} />
            </>
          )}
          {status === 'none' && (
            <PillButton title="Добавить в друзья" variant="ink" icon="＋" onPress={handleAdd} disabled={busy} />
          )}
          {status === 'pending-out' && <PillButton title="Запрос отправлен" variant="outline" disabled onPress={() => {}} />}
          {status === 'pending-in' && (
            <>
              <PillButton title="Принять" variant="ink" onPress={handleAccept} disabled={busy} fullWidth={false} style={styles.actionButton} />
              <PillButton title="Отклонить" variant="outline" onPress={handleRemove} disabled={busy} fullWidth={false} style={styles.actionButton} />
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{levelFromTotalCorrect(player.totalCorrect).xp}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Точность</Text>
          </View>
          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="flame" size={14} color={theme.primary} />
              <Text style={styles.statValue}>{player.streakCount}</Text>
            </View>
            <Text style={styles.statLabel}>Серия</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Достижения</Text>
        {unlockedAchievements.length === 0 ? (
          <Text style={styles.emptyText}>Пока нет открытых достижений.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {unlockedAchievements.map((a) => (
              <View key={a.id} style={styles.achievementTile}>
                <View style={styles.achievementIconWrap}>
                  <Icon name={a.icon} size={18} color={theme.primary} />
                </View>
                <Text style={styles.achievementLabel} numberOfLines={2}>{a.title}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {favoriteCategories.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Любимые категории</Text>
            <View style={styles.categoryRow}>
              {favoriteCategories.map((id) => {
                const cat = getCategory(id);
                return (
                  <View key={id} style={styles.categoryTile}>
                    <View style={[styles.categoryIconWrap, { backgroundColor: cat.colorBg }]}>
                      <Icon name={cat.icon} size={16} color={cat.color} />
                    </View>
                    <Text style={styles.categoryLabel} numberOfLines={1}>{cat.title}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {status === 'accepted' && (
          <PillButton title="Бросить вызов" variant="primary" icon="⚔" onPress={onChallenge} style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    header: { alignItems: 'center', marginBottom: 16 },
    name: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text, marginTop: 12 },
    levelLine: { fontSize: 13, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 2 },
    actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    actionButton: { flex: 1 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingVertical: 14,
      alignItems: 'center',
    },
    statValue: { fontSize: 17, fontFamily: fontFamily('800'), color: theme.text },
    statLabel: { fontSize: 10, fontFamily: fontFamily('600'), color: theme.textMuted, marginTop: 4 },
    sectionTitle: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 10 },
    emptyText: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginBottom: 8 },
    achievementTile: { width: 78, alignItems: 'center' },
    achievementIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    achievementLabel: { fontSize: 10, fontFamily: fontFamily('600'), color: theme.textMuted, textAlign: 'center' },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    categoryTile: { alignItems: 'center', width: 64 },
    categoryIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    categoryLabel: { fontSize: 10, fontFamily: fontFamily('600'), color: theme.textMuted, textAlign: 'center' },
  });
}
