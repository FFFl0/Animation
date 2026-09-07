import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useAuth } from '../auth/AuthContext';
import { CHARACTERS, characterName } from '../data/characters';
import { seriesTitleById } from '../data/animeSeries';
import { HairStyle } from '../data/avatar';
import AnimeAvatar from '../components/AnimeAvatar';
import Icon from '../components/Icon';
import { getReminderEnabled, setReminderEnabled } from '../notifications/streakReminder';
import { Language, useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

const HAIR_STYLES: HairStyle[] = ['long', 'twin', 'bob', 'short', 'spiky', 'ponytail'];
const COLOR_SWATCHES = ['#2B2B33', '#8B5E3C', '#D9B24C', '#E8632E', '#E85D9C', '#5FB8E0', '#7C5CB8', '#3E3E3E'];
const ACCENT_SWATCHES = ['#FADDE1', '#DCEFFB', '#E4F7E1', '#FBE9D0', '#EDE3FB', '#FDE2E2'];

function cycle<T>(list: T[], current: T, dir: 1 | -1): T {
  const i = list.indexOf(current);
  return list[(i + dir + list.length) % list.length];
}

export default function ProfileScreen() {
  const { profile, logout, updateAvatar } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { musicEnabled, sfxEnabled, toggleMusic, toggleSfx } = useSound();
  const { language, setLanguage } = useLanguage();
  const t = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const THEME_TABS: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: t('profile.themeLight') },
    { key: 'dark', label: t('profile.themeDark') },
    { key: 'system', label: t('profile.themeSystem') },
  ];

  const LANGUAGE_TABS: { key: Language; label: string }[] = [
    { key: 'ru', label: t('profile.languageRu') },
    { key: 'en', label: t('profile.languageEn') },
  ];

  useEffect(() => {
    getReminderEnabled().then(setReminderOn);
  }, []);

  const handleToggleReminder = async () => {
    setReminderError(null);
    const next = !reminderOn;
    const result = await setReminderEnabled(next, language);
    if (result.ok) {
      setReminderOn(next);
    } else {
      setReminderError(result.reason === 'permissionDenied' ? t('profile.reminderPermissionDenied') : t('profile.reminderFallbackError'));
    }
  };

  if (!profile) return null;
  const { avatar } = profile;

  const favoriteCharacter = CHARACTERS.find((c) => c.id === profile.favoriteCharacterId) ?? null;

  const query = search.trim().toLowerCase();
  const visibleCharacters = query
    ? CHARACTERS.filter(
        (c) => characterName(c, language).toLowerCase().includes(query) || seriesTitleById(c.seriesId, language).toLowerCase().includes(query)
      )
    : CHARACTERS;

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>{t('profile.pageTitle')}</Text>

      <View style={styles.avatarSection}>
        <AnimeAvatar avatar={avatar} size={120} />
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.joined}>
          {t('profile.since', new Date(profile.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU'))}
        </Text>
        <SoundTouchable style={styles.editToggle} onPress={() => setEditing((v) => !v)}>
          <Text style={styles.editToggleText}>{editing ? t('profile.doneEditing') : t('profile.editAvatar')}</Text>
        </SoundTouchable>
      </View>

      {editing && (
        <View style={styles.editor}>
          <EditorRow styles={styles} label={t('profile.hairStyleLabel')}>
            <SoundTouchable onPress={() => updateAvatar({ avatar: { ...avatar, hairStyle: cycle(HAIR_STYLES, avatar.hairStyle, -1) } })}>
              <Text style={styles.arrow}>‹</Text>
            </SoundTouchable>
            <Text style={styles.editorValue}>{avatar.hairStyle}</Text>
            <SoundTouchable onPress={() => updateAvatar({ avatar: { ...avatar, hairStyle: cycle(HAIR_STYLES, avatar.hairStyle, 1) } })}>
              <Text style={styles.arrow}>›</Text>
            </SoundTouchable>
          </EditorRow>

          <EditorRow styles={styles} label={t('profile.hairLabel')}>
            <SwatchRow styles={styles} colors={COLOR_SWATCHES} selected={avatar.hairColor} onSelect={(c) => updateAvatar({ avatar: { ...avatar, hairColor: c } })} />
          </EditorRow>

          <EditorRow styles={styles} label={t('profile.eyesLabel')}>
            <SwatchRow styles={styles} colors={COLOR_SWATCHES} selected={avatar.eyeColor} onSelect={(c) => updateAvatar({ avatar: { ...avatar, eyeColor: c } })} />
          </EditorRow>

          <EditorRow styles={styles} label={t('profile.backgroundLabel')}>
            <SwatchRow styles={styles} colors={ACCENT_SWATCHES} selected={avatar.accent} onSelect={(c) => updateAvatar({ avatar: { ...avatar, accent: c } })} />
          </EditorRow>
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('profile.favoriteCharacterTitle')}</Text>
      <View style={styles.searchWrap}>
        <Icon name="search" size={15} color={theme.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('profile.searchPlaceholder')}
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {visibleCharacters.length === 0 ? (
        <Text style={styles.searchEmpty}>{t('profile.searchEmpty')}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
          {visibleCharacters.map((c) => (
            <SoundTouchable
              key={c.id}
              style={styles.favItem}
              onPress={() => updateAvatar({ favoriteCharacterId: c.id === profile.favoriteCharacterId ? null : c.id })}
            >
              <View style={[styles.favAvatarWrap, c.id === profile.favoriteCharacterId && styles.favAvatarSelected]}>
                <AnimeAvatar avatar={c.avatar} characterId={c.id} size={56} />
              </View>
              <Text style={styles.favName} numberOfLines={1}>{characterName(c, language).split(' ')[0]}</Text>
            </SoundTouchable>
          ))}
        </ScrollView>
      )}
      {favoriteCharacter && (
        <Text style={styles.favSummary}>{t('profile.favoriteSummary', characterName(favoriteCharacter, language))}</Text>
      )}

      <Text style={styles.sectionTitle}>{t('profile.themeTitle')}</Text>
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

      <Text style={styles.sectionTitle}>{t('profile.languageTitle')}</Text>
      <View style={styles.themeTabs}>
        {LANGUAGE_TABS.map((tab) => (
          <SoundTouchable
            key={tab.key}
            style={[styles.themeTab, language === tab.key && styles.themeTabActive]}
            onPress={() => setLanguage(tab.key)}
          >
            <Text style={[styles.themeTabText, language === tab.key && styles.themeTabTextActive]}>{tab.label}</Text>
          </SoundTouchable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{t('profile.soundTitle')}</Text>
      <View style={styles.themeTabs}>
        <SoundTouchable
          style={[styles.themeTab, musicEnabled && styles.themeTabActive]}
          onPress={toggleMusic}
        >
          <Text style={[styles.themeTabText, musicEnabled && styles.themeTabTextActive]}>
            {musicEnabled ? t('profile.musicOn') : t('profile.musicOff')}
          </Text>
        </SoundTouchable>
        <SoundTouchable
          style={[styles.themeTab, sfxEnabled && styles.themeTabActive]}
          onPress={toggleSfx}
        >
          <Text style={[styles.themeTabText, sfxEnabled && styles.themeTabTextActive]}>
            {sfxEnabled ? t('profile.sfxOn') : t('profile.sfxOff')}
          </Text>
        </SoundTouchable>
      </View>

      <Text style={styles.sectionTitle}>{t('profile.remindersTitle')}</Text>
      <View style={styles.themeTabs}>
        <SoundTouchable style={[styles.themeTab, reminderOn && styles.themeTabActive]} onPress={handleToggleReminder}>
          <Text style={[styles.themeTabText, reminderOn && styles.themeTabTextActive]}>
            {reminderOn ? t('profile.streakReminderOn') : t('profile.streakReminderOff')}
          </Text>
        </SoundTouchable>
      </View>
      {reminderError && <Text style={styles.reminderError}>{reminderError}</Text>}

      <SoundTouchable style={styles.logout} onPress={logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
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
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 13, fontFamily: fontFamily('500'), color: theme.text, padding: 0 },
    searchEmpty: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, paddingVertical: 8 },
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
    reminderError: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.danger, marginTop: 8 },
  });
}
