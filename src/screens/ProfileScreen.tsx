import { ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useAuth } from '../auth/AuthContext';
import { CHARACTERS } from '../data/characters';
import { HairStyle } from '../data/avatar';
import AnimeAvatar from '../components/AnimeAvatar';

const HAIR_STYLES: HairStyle[] = ['long', 'twin', 'bob', 'short', 'spiky', 'ponytail'];
const COLOR_SWATCHES = ['#2B2B33', '#8B5E3C', '#D9B24C', '#E8632E', '#E85D9C', '#5FB8E0', '#7C5CB8', '#3E3E3E'];
const ACCENT_SWATCHES = ['#FADDE1', '#DCEFFB', '#E4F7E1', '#FBE9D0', '#EDE3FB', '#FDE2E2'];

const THEME_TABS: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: 'Светлая' },
  { key: 'dark', label: 'Тёмная' },
  { key: 'system', label: 'Системная' },
];

function cycle<T>(list: T[], current: T, dir: 1 | -1): T {
  const i = list.indexOf(current);
  return list[(i + dir + list.length) % list.length];
}

export default function ProfileScreen() {
  const { profile, logout, updateAvatar } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } = useSound();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [editing, setEditing] = useState(false);

  if (!profile) return null;
  const { avatar } = profile;

  const favoriteCharacter = CHARACTERS.find((c) => c.id === profile.favoriteCharacterId) ?? null;

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Профиль</Text>

      <View style={styles.avatarSection}>
        <AnimeAvatar avatar={avatar} size={120} />
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.joined}>
          С нами с {new Date(profile.createdAt).toLocaleDateString('ru-RU')}
        </Text>
        <SoundTouchable style={styles.editToggle} onPress={() => setEditing((v) => !v)}>
          <Text style={styles.editToggleText}>{editing ? 'Готово' : 'Настроить аватар'}</Text>
        </SoundTouchable>
      </View>

      {editing && (
        <View style={styles.editor}>
          <EditorRow styles={styles} label="Причёска">
            <SoundTouchable onPress={() => updateAvatar({ avatar: { ...avatar, hairStyle: cycle(HAIR_STYLES, avatar.hairStyle, -1) } })}>
              <Text style={styles.arrow}>‹</Text>
            </SoundTouchable>
            <Text style={styles.editorValue}>{avatar.hairStyle}</Text>
            <SoundTouchable onPress={() => updateAvatar({ avatar: { ...avatar, hairStyle: cycle(HAIR_STYLES, avatar.hairStyle, 1) } })}>
              <Text style={styles.arrow}>›</Text>
            </SoundTouchable>
          </EditorRow>

          <EditorRow styles={styles} label="Волосы">
            <SwatchRow styles={styles} colors={COLOR_SWATCHES} selected={avatar.hairColor} onSelect={(c) => updateAvatar({ avatar: { ...avatar, hairColor: c } })} />
          </EditorRow>

          <EditorRow styles={styles} label="Глаза">
            <SwatchRow styles={styles} colors={COLOR_SWATCHES} selected={avatar.eyeColor} onSelect={(c) => updateAvatar({ avatar: { ...avatar, eyeColor: c } })} />
          </EditorRow>

          <EditorRow styles={styles} label="Фон">
            <SwatchRow styles={styles} colors={ACCENT_SWATCHES} selected={avatar.accent} onSelect={(c) => updateAvatar({ avatar: { ...avatar, accent: c } })} />
          </EditorRow>
        </View>
      )}

      <Text style={styles.sectionTitle}>Любимый персонаж</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
        {CHARACTERS.map((c) => (
          <SoundTouchable
            key={c.id}
            style={styles.favItem}
            onPress={() => updateAvatar({ favoriteCharacterId: c.id === profile.favoriteCharacterId ? null : c.id })}
          >
            <View style={[styles.favAvatarWrap, c.id === profile.favoriteCharacterId && styles.favAvatarSelected]}>
              <AnimeAvatar avatar={c.avatar} size={56} />
            </View>
            <Text style={styles.favName} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
          </SoundTouchable>
        ))}
      </ScrollView>
      {favoriteCharacter && (
        <Text style={styles.favSummary}>Любимый персонаж: {favoriteCharacter.name}</Text>
      )}

      <Text style={styles.sectionTitle}>Тема оформления</Text>
      <View style={styles.themeTabs}>
        {THEME_TABS.map((tab) => (
          <SoundTouchable
            key={tab.key}
            style={[styles.themeTab, mode === tab.key && styles.themeTabActive]}
            onPress={() => setMode(tab.key)}
          >
            <Text style={[styles.themeTabText, mode === tab.key && styles.themeTabTextActive]}>{tab.label}</Text>
          </SoundTouchable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Звук</Text>
      <View style={styles.themeTabs}>
        <SoundTouchable
          style={[styles.themeTab, musicEnabled && styles.themeTabActive]}
          onPress={toggleMusic}
        >
          <Text style={[styles.themeTabText, musicEnabled && styles.themeTabTextActive]}>
            🎵 Музыка {musicEnabled ? 'вкл' : 'выкл'}
          </Text>
        </SoundTouchable>
        <SoundTouchable
          style={[styles.themeTab, sfxEnabled && styles.themeTabActive]}
          onPress={toggleSfx}
        >
          <Text style={[styles.themeTabText, sfxEnabled && styles.themeTabTextActive]}>
            🔊 Звуки {sfxEnabled ? 'вкл' : 'выкл'}
          </Text>
        </SoundTouchable>
      </View>

      <SoundTouchable style={styles.logout} onPress={logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </SoundTouchable>
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function EditorRow({ label, children, styles }: { label: string; children: ReactNode; styles: Styles }) {
  return (
    <View style={styles.editorRow}>
      <Text style={styles.editorLabel}>{label}</Text>
      <View style={styles.editorControls}>{children}</View>
    </View>
  );
}

function SwatchRow({ colors, selected, onSelect, styles }: { colors: string[]; selected: string; onSelect: (c: string) => void; styles: Styles }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {colors.map((c) => (
        <SoundTouchable
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

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    container: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 26, fontFamily: fontFamily('800'), color: theme.text, marginBottom: 16 },
    avatarSection: { alignItems: 'center', marginBottom: 12 },
    username: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text, marginTop: 12 },
    joined: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 2 },
    editToggle: {
      marginTop: 14,
      borderWidth: 1.5,
      borderColor: theme.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 18,
      paddingVertical: 8,
    },
    editToggleText: { color: theme.primary, fontFamily: fontFamily('700'), fontSize: 13 },
    editor: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 14,
      marginTop: 16,
      gap: 10,
    },
    editorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    editorLabel: { width: 78, fontSize: 13, fontFamily: fontFamily('700'), color: theme.textMuted },
    editorControls: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    editorValue: { fontSize: 14, fontFamily: fontFamily('600'), color: theme.text, minWidth: 80 },
    arrow: { fontSize: 22, color: theme.primary, fontFamily: fontFamily('800'), paddingHorizontal: 6 },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
      marginRight: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchSelected: { borderColor: theme.text },
    sectionTitle: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.text, marginTop: 24, marginBottom: 10 },
    favRow: { gap: 14, paddingRight: 12 },
    favItem: { alignItems: 'center', width: 64 },
    favAvatarWrap: { borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
    favAvatarSelected: { borderColor: theme.primary },
    favName: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4, textAlign: 'center' },
    favSummary: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.text, marginTop: 10 },
    themeTabs: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 4,
      gap: 4,
    },
    themeTab: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, alignItems: 'center' },
    themeTabActive: { backgroundColor: theme.primary },
    themeTabText: { fontSize: 12, fontFamily: fontFamily('700'), color: theme.textMuted },
    themeTabTextActive: { color: theme.onPrimary },
    logout: {
      marginTop: 30,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    logoutText: { color: theme.danger, fontFamily: fontFamily('700'), fontSize: 15 },
  });
}
