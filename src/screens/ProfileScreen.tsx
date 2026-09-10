import { useEffect, useMemo, useState } from 'react';
import { Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useAuth } from '../auth/AuthContext';
import { CHARACTERS, characterName } from '../data/characters';
import { seriesTitleById } from '../data/animeSeries';
import { FrameId, FRAMES } from '../data/cosmetics';
import { FRAME_IMAGES } from '../data/cosmeticImages';
import { pickProfilePhoto } from '../avatar/photoPicker';
import { deleteAvatarPhoto, uploadAvatarPhoto } from '../avatar/avatarStorage';
import { PresetAvatarId, PRESET_AVATAR_IDS, PRESET_AVATAR_IMAGES } from '../data/presetAvatars';
import { levelFromStats } from '../data/level';
import AnimeAvatar from '../components/AnimeAvatar';
import Icon from '../components/Icon';
import { getReminderEnabled, setReminderEnabled } from '../notifications/streakReminder';
import { Language, useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';

export default function ProfileScreen() {
  const { profile, logout, updateAvatar } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { musicEnabled, sfxEnabled, hapticsEnabled, toggleMusic, toggleSfx, toggleHaptics } = useSound();
  const { language, setLanguage } = useLanguage();
  const t = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [search, setSearch] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const THEME_TABS: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: t('profile.themeLight') },
    { key: 'dark', label: t('profile.themeDark') },
    { key: 'system', label: t('profile.themeSystem') },
  ];

  // Three side-by-side pills: the filled state carries on/off, the same way
  // the theme and language rows above do, so the labels stay short enough
  // to fit on a phone.
  const SOUND_TOGGLES = [
    { label: t('profile.musicLabel'), on: musicEnabled, toggle: toggleMusic },
    { label: t('profile.sfxLabel'), on: sfxEnabled, toggle: toggleSfx },
    { label: t('profile.hapticsLabel'), on: hapticsEnabled, toggle: toggleHaptics },
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

  const handlePickPhoto = async () => {
    if (photoBusy || !profile) return;
    setPhotoBusy(true);
    setPhotoError(null);
    const result = await pickProfilePhoto();
    if (result.status === 'ok') {
      // Uploading returns null in fully local mode (and if the bucket is
      // unreachable) — inlining the same bytes still gets the player their
      // avatar, so a picked picture is never lost to a network hiccup.
      const uploaded = await uploadAvatarPhoto(profile.id, result.base64);
      const { presetId, ...rest } = profile.avatar;
      await updateAvatar({ avatar: { ...rest, photoUri: uploaded ?? result.dataUri } });
    } else if (result.status === 'permissionDenied') {
      setPhotoError(t('profile.photoPermissionDenied'));
    } else if (result.status === 'failed') {
      setPhotoError(t('profile.photoFailed'));
    }
    setPhotoBusy(false);
  };

  const handleRemovePhoto = async () => {
    if (!profile) return;
    setPhotoError(null);
    const { photoUri, ...rest } = profile.avatar;
    await updateAvatar({ avatar: rest });
    await deleteAvatarPhoto(profile.id);
  };

  /** Tapping the picture already in use clears it, so the ready-made row
   * doubles as the way back to the plain initial. */
  const handlePickPreset = async (id: PresetAvatarId) => {
    if (!profile) return;
    setPhotoError(null);
    const { photoUri, presetId, ...rest } = profile.avatar;
    await updateAvatar({ avatar: presetId === id ? rest : { ...rest, presetId: id } });
    if (photoUri) await deleteAvatarPhoto(profile.id);
  };

  if (!profile) return null;
  const { avatar } = profile;
  const { level } = levelFromStats(profile.stats);

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
        <AnimeAvatar avatar={avatar} size={120} name={profile.username} />
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.joined}>
          {t('profile.since', new Date(profile.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'ru-RU'))}
        </Text>
        <View style={styles.photoButtons}>
          <SoundTouchable style={styles.photoButton} onPress={handlePickPhoto} disabled={photoBusy}>
            <Icon name="image" size={14} color={theme.primary} />
            <Text style={styles.photoButtonText}>{avatar.photoUri ? t('profile.changePhoto') : t('profile.addPhoto')}</Text>
          </SoundTouchable>
          {avatar.photoUri && (
            <SoundTouchable style={styles.photoButton} onPress={handleRemovePhoto}>
              <Icon name="trash" size={14} color={theme.danger} />
              <Text style={[styles.photoButtonText, { color: theme.danger }]}>{t('profile.removePhoto')}</Text>
            </SoundTouchable>
          )}
        </View>
        <Text style={styles.photoHint}>{t('profile.photoHint')}</Text>
        {photoError && <Text style={styles.photoError}>{photoError}</Text>}
      </View>

      <Text style={styles.sectionTitle}>{t('profile.presetsTitle')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
        {PRESET_AVATAR_IDS.map((id) => (
          <SoundTouchable key={id} style={styles.favItem} onPress={() => handlePickPreset(id)}>
            <View style={[styles.cosmeticThumbWrap, avatar.presetId === id && styles.favAvatarSelected]}>
              <Image source={PRESET_AVATAR_IMAGES[id]} style={styles.cosmeticThumb} resizeMode="cover" />
            </View>
            <Text style={styles.favName} numberOfLines={1}>{t(`profile.presetNames.${id}`)}</Text>
          </SoundTouchable>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>{t('cosmetics.frameLabel')}</Text>
      <CosmeticRow
        styles={styles}
        theme={theme}
        t={t}
        items={FRAMES}
        images={FRAME_IMAGES}
        selectedId={avatar.frameId}
        level={level}
        noneLabel={t('cosmetics.none')}
        onSelect={(id) => updateAvatar({ avatar: { ...avatar, frameId: id as FrameId | undefined } })}
      />

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
        {SOUND_TOGGLES.map((toggle) => (
          <SoundTouchable
            key={toggle.label}
            style={[styles.themeTab, toggle.on && styles.themeTabActive]}
            onPress={toggle.toggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: toggle.on }}
          >
            <Text style={[styles.themeTabText, toggle.on && styles.themeTabTextActive]}>{toggle.label}</Text>
          </SoundTouchable>
        ))}
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

function CosmeticRow<TId extends string>({
  items,
  images,
  selectedId,
  level,
  noneLabel,
  onSelect,
  styles,
  theme,
  t,
}: {
  items: { id: TId; unlockLevel: number }[];
  images: Record<TId, ImageSourcePropType>;
  selectedId: TId | undefined;
  level: number;
  noneLabel: string;
  onSelect: (id: TId | undefined) => void;
  styles: Styles;
  theme: Theme;
  t: ReturnType<typeof useT>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favRow}>
      <SoundTouchable style={styles.favItem} onPress={() => onSelect(undefined)}>
        <View style={[styles.cosmeticThumbWrap, !selectedId && styles.favAvatarSelected]}>
          <Icon name="close" size={16} color={theme.textMuted} />
        </View>
        <Text style={styles.favName} numberOfLines={1}>{noneLabel}</Text>
      </SoundTouchable>

      {items.map((item) => {
        const unlocked = level >= item.unlockLevel;
        return (
          <SoundTouchable
            key={item.id}
            style={styles.favItem}
            disabled={!unlocked}
            onPress={() => onSelect(item.id)}
          >
            <View style={[styles.cosmeticThumbWrap, selectedId === item.id && styles.favAvatarSelected]}>
              <Image source={images[item.id]} style={styles.cosmeticThumb} resizeMode="contain" />
              {!unlocked && (
                <View style={styles.cosmeticLockOverlay}>
                  <Icon name="lock" size={16} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Text style={styles.favName} numberOfLines={1}>
              {unlocked ? t(`cosmetics.frameNames.${item.id}`) : t('cosmetics.lockedAtLevel', item.unlockLevel)}
            </Text>
          </SoundTouchable>
        );
      })}
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
    photoButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
    photoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    photoButtonText: { color: theme.primary, fontFamily: fontFamily('700'), fontSize: 13 },
    photoHint: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 10, textAlign: 'center' },
    photoError: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.danger, marginTop: 6, textAlign: 'center' },
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
    cosmeticThumbWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    cosmeticThumb: { width: '100%', height: '100%' },
    cosmeticLockOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
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
