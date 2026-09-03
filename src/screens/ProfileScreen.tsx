import { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { CHARACTERS, HairStyle } from '../data/characters';
import { QuizMode, QUESTIONS_PER_QUIZ } from '../quiz/generateQuiz';
import AnimeAvatar from '../components/AnimeAvatar';

type Props = {
  onBack: () => void;
};

const HAIR_STYLES: HairStyle[] = ['long', 'twin', 'bob', 'wavy', 'odango', 'animalEars', 'horns', 'wild'];
const COLOR_SWATCHES = ['#2B2B33', '#8B5E3C', '#D9B24C', '#E8632E', '#E85D9C', '#5FB8E0', '#7C5CB8', '#EDEDED'];
const ACCENT_SWATCHES = ['#F3D9E7', '#D6F0FA', '#F2DFC4', '#E9E1F7', '#DFF2DD', '#FCDCCB', '#DCE3E8', '#FBF0C9'];
const BADGE_OPTIONS = ['⭐', '🎀', '🌸', '🦋', '🔥', '💎', '🎵', '👑', '🍀', '☕'];

const MODE_LABEL: Record<QuizMode, string> = {
  photo: 'По фото',
  eyes: 'По глазам',
  description: 'По описанию',
  trivia: 'Вопросы',
};

function cycle<T>(list: T[], current: T, dir: 1 | -1): T {
  const i = list.indexOf(current);
  return list[(i + dir + list.length) % list.length];
}

export default function ProfileScreen({ onBack }: Props) {
  const { profile, logout, updateAvatar } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!profile) return null;
  const { avatar } = profile;

  const favoriteCharacter = CHARACTERS.find((c) => c.id === profile.favoriteCharacterId) ?? null;

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>‹ Назад</Text>
      </TouchableOpacity>

      <View style={styles.avatarSection}>
        <AnimeAvatar avatar={avatar} size={120} />
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.joined}>
          С нами с {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
        </Text>
        <TouchableOpacity style={styles.editToggle} onPress={() => setEditing((v) => !v)}>
          <Text style={styles.editToggleText}>{editing ? 'Готово' : 'Настроить аватар'}</Text>
        </TouchableOpacity>
      </View>

      {editing && (
        <View style={styles.editor}>
          <EditorRow label="Причёска">
            <TouchableOpacity onPress={() => updateAvatar({ avatar: { ...avatar, hairStyle: cycle(HAIR_STYLES, avatar.hairStyle, -1) } })}>
              <Text style={styles.arrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.editorValue}>{avatar.hairStyle}</Text>
            <TouchableOpacity onPress={() => updateAvatar({ avatar: { ...avatar, hairStyle: cycle(HAIR_STYLES, avatar.hairStyle, 1) } })}>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </EditorRow>

          <EditorRow label="Волосы">
            <SwatchRow colors={COLOR_SWATCHES} selected={avatar.hairColor} onSelect={(c) => updateAvatar({ avatar: { ...avatar, hairColor: c } })} />
          </EditorRow>

          <EditorRow label="Глаза">
            <SwatchRow colors={COLOR_SWATCHES} selected={avatar.eyeColor} onSelect={(c) => updateAvatar({ avatar: { ...avatar, eyeColor: c } })} />
          </EditorRow>

          <EditorRow label="Фон">
            <SwatchRow colors={ACCENT_SWATCHES} selected={avatar.accent} onSelect={(c) => updateAvatar({ avatar: { ...avatar, accent: c } })} />
          </EditorRow>

          <EditorRow label="Значок">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {BADGE_OPTIONS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.badgeOption, b === avatar.badge && styles.badgeOptionSelected]}
                  onPress={() => updateAvatar({ avatar: { ...avatar, badge: b } })}
                >
                  <Text style={styles.badgeOptionText}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </EditorRow>
        </View>
      )}

      <Text style={styles.sectionTitle}>Любимый персонаж</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
        {CHARACTERS.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.favItem}
            onPress={() => updateAvatar({ favoriteCharacterId: c.id === profile.favoriteCharacterId ? null : c.id })}
          >
            <View style={[styles.favAvatarWrap, c.id === profile.favoriteCharacterId && styles.favAvatarSelected]}>
              <AnimeAvatar avatar={c.avatar} size={56} />
            </View>
            <Text style={styles.favName} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {favoriteCharacter && (
        <Text style={styles.favSummary}>Любимица: {favoriteCharacter.name} ({favoriteCharacter.series})</Text>
      )}

      <Text style={styles.sectionTitle}>Статистика</Text>
      <View style={styles.statsGrid}>
        {(Object.keys(profile.stats) as QuizMode[]).map((mode) => {
          const s = profile.stats[mode];
          const accuracy = s.totalQuestions > 0 ? Math.round((s.totalCorrect / s.totalQuestions) * 100) : 0;
          return (
            <View key={mode} style={styles.statCard}>
              <Text style={styles.statTitle}>{MODE_LABEL[mode]}</Text>
              <Text style={styles.statBig}>{s.bestScore}/{QUESTIONS_PER_QUIZ}</Text>
              <Text style={styles.statLine}>Игр: {s.gamesPlayed}</Text>
              <Text style={styles.statLine}>Точность: {accuracy}%</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function EditorRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.editorRow}>
      <Text style={styles.editorLabel}>{label}</Text>
      <View style={styles.editorControls}>{children}</View>
    </View>
  );
}

function SwatchRow({ colors, selected, onSelect }: { colors: string[]; selected: string; onSelect: (c: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {colors.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => onSelect(c)}
          style={[
            styles.swatch,
            { backgroundColor: c },
            c === selected && styles.swatchSelected,
          ]}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backButton: { marginBottom: 8 },
  backText: { color: theme.primary, fontSize: 15, fontWeight: '700' },
  avatarSection: { alignItems: 'center', marginBottom: 12 },
  username: { fontSize: 22, fontWeight: '800', color: theme.text, marginTop: 12 },
  joined: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  editToggle: {
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: theme.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  editToggleText: { color: theme.primary, fontWeight: '700', fontSize: 13 },
  editor: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  editorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editorLabel: { width: 78, fontSize: 13, fontWeight: '700', color: theme.textMuted },
  editorControls: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  editorValue: { fontSize: 14, fontWeight: '600', color: theme.text, minWidth: 80 },
  arrow: { fontSize: 22, color: theme.primary, fontWeight: '800', paddingHorizontal: 6 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: { borderColor: theme.text },
  badgeOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  badgeOptionSelected: { borderColor: theme.primary },
  badgeOptionText: { fontSize: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: theme.text, marginTop: 24, marginBottom: 10 },
  favRow: { gap: 14, paddingRight: 12 },
  favItem: { alignItems: 'center', width: 64 },
  favAvatarWrap: { borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  favAvatarSelected: { borderColor: theme.primary },
  favName: { fontSize: 11, color: theme.textMuted, marginTop: 4, textAlign: 'center' },
  favSummary: { fontSize: 13, color: theme.text, marginTop: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: theme.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    padding: 12,
    alignItems: 'center',
  },
  statTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textAlign: 'center' },
  statBig: { fontSize: 20, fontWeight: '800', color: theme.primary, marginVertical: 4 },
  statLine: { fontSize: 11, color: theme.textMuted },
  logout: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  logoutText: { color: theme.danger, fontWeight: '700', fontSize: 15 },
});
