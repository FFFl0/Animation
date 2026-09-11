import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme, ThemeMode } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import { useAuth, AuthError } from '../auth/AuthContext';
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
import { USERNAME_MAX } from '../auth/validation';
import { Language, useLanguage } from '../i18n/LanguageContext';
import { useT, translateAuthError } from '../i18n/strings';

type Props = {
  onOpenAbout: () => void;
  onOpenPrivacy: () => void;
};

export default function ProfileScreen({ onOpenAbout, onOpenPrivacy }: Props) {
  const { profile, logout, deleteAccount, updateAvatar, rename } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { musicEnabled, sfxEnabled, hapticsEnabled, toggleMusic, toggleSfx, toggleHaptics } = useSound();
  const { language, setLanguage } = useLanguage();
  const t = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [search, setSearch] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
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

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      // No navigation to do: losing the profile drops the whole app back to
      // the welcome screen on its own.
    } catch {
      setDeleteError(t('profile.deleteFailed'));
      setDeleting(false);
    }
  };

  const startRename = () => {
    if (!profile) return;
    setRenameError(null);
    setDraftName(profile.username);
    setRenaming(true);
  };

  const handleRename = async () => {
    if (renameBusy || !profile) return;
    if (draftName.trim() === profile.username) {
      setRenaming(false);
      return;
    }
    setRenameBusy(true);
    setRenameError(null);
    try {
      await rename(draftName);
      setRenaming(false);
    } catch (e) {
      setRenameError(e instanceof AuthError ? translateAuthError(e, t) : t('authErrors.renameFailed'));
    }
    setRenameBusy(false);
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
        {renaming ? (
          <View style={styles.renameBlock}>
            <TextInput
              style={styles.renameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder={t('profile.renamePlaceholder')}
              placeholderTextColor={theme.textMuted}
              maxLength={USERNAME_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!renameBusy}
              onSubmitEditing={handleRename}
              returnKeyType="done"
            />
            <View style={styles.renameActions}>
              <SoundTouchable style={styles.renameCancel} onPress={() => setRenaming(false)} disabled={renameBusy}>
                <Text style={styles.renameCancelText}>{t('profile.renameCancel')}</Text>
              </SoundTouchable>
              <SoundTouchable style={styles.renameSave} onPress={handleRename} disabled={renameBusy}>
                {renameBusy ? (
                  <ActivityIndicator color={theme.onInk} />
                ) : (
                  <Text style={styles.renameSaveText}>{t('profile.renameSave')}</Text>
                )}
              </SoundTouchable>
            </View>
            {renameError && <Text style={styles.photoError}>{renameError}</Text>}
            <Text style={styles.photoHint}>{t('profile.renameHint')}</Text>
          </View>
        ) : (
          <SoundTouchable style={styles.usernameRow} onPress={startRename} accessibilityRole="button">
            <Text style={styles.username}>{profile.username}</Text>
            <Icon name="edit" size={16} color={theme.primary} />
          </SoundTouchable>
        )}
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

      <Text style={styles.sectionTitle}>{t('profile.aboutTitle')}</Text>
      <SoundTouchable style={styles.linkRow} onPress={onOpenAbout} accessibilityRole="button">
        <Icon name="sparkles" size={16} color={theme.primary} />
        <Text style={styles.linkText}>{t('about.title')}</Text>
        <Icon name="chevronRight" size={15} color={theme.textMuted} />
      </SoundTouchable>
      <SoundTouchable style={styles.linkRow} onPress={onOpenPrivacy} accessibilityRole="button">
        <Icon name="lock" size={16} color={theme.primary} />
        <Text style={styles.linkText}>{t('legal.privacyTitle')}</Text>
        <Icon name="chevronRight" size={15} color={theme.textMuted} />
      </SoundTouchable>

      <SoundTouchable style={styles.logout} onPress={logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </SoundTouchable>

      {confirmDelete ? (
        <View style={styles.dangerBlock}>
          <Text style={styles.dangerTitle}>{t('profile.deleteTitle')}</Text>
          <Text style={styles.dangerText}>{t('profile.deleteWarning')}</Text>
          {deleteError && <Text style={styles.dangerError}>{deleteError}</Text>}
          <View style={styles.dangerActions}>
            <SoundTouchable
              style={styles.dangerCancel}
              onPress={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              <Text style={styles.dangerCancelText}>{t('groups.cancel')}</Text>
            </SoundTouchable>
            <SoundTouchable style={styles.dangerConfirm} onPress={handleDeleteAccount} disabled={deleting}>
              {deleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.dangerConfirmText}>{t('profile.deleteConfirm')}</Text>
              )}
            </SoundTouchable>
          </View>
        </View>
      ) : (
        <SoundTouchable style={styles.deleteLink} onPress={() => setConfirmDelete(true)} activeOpacity={0.85}>
          <Text style={styles.deleteLinkText}>{t('profile.deleteTitle')}</Text>
        </SoundTouchable>
      )}
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
    usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
    username: { fontSize: 22, fontFamily: fontFamily('800'), color: theme.text },
    renameBlock: { alignSelf: 'stretch', marginTop: 14 },
    renameInput: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: fontFamily('700'),
      color: theme.text,
      textAlign: 'center',
    },
    renameActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    renameCancel: {
      flex: 1,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingVertical: 10,
    },
    renameCancelText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    renameSave: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: theme.ink,
      borderRadius: radius.pill,
      paddingVertical: 10,
    },
    renameSaveText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.onInk },
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
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    linkText: { flex: 1, fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    logout: {
      marginTop: 30,
      alignItems: 'center',
      paddingVertical: 14,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    logoutText: { color: theme.danger, fontFamily: fontFamily('700'), fontSize: 15 },
    deleteLink: { marginTop: 14, alignItems: 'center', paddingVertical: 12 },
    deleteLinkText: { color: theme.textMuted, fontFamily: fontFamily('600'), fontSize: 13, textDecorationLine: 'underline' },
    dangerBlock: {
      marginTop: 16,
      borderWidth: 1.5,
      borderColor: theme.danger,
      borderRadius: radius.lg,
      padding: 16,
    },
    dangerTitle: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.danger, marginBottom: 6 },
    dangerText: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.text, lineHeight: 19 },
    dangerError: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.danger, marginTop: 10 },
    dangerActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
    dangerCancel: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    dangerCancelText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    dangerConfirm: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      paddingVertical: 12,
      borderRadius: radius.pill,
      backgroundColor: theme.danger,
    },
    dangerConfirmText: { fontSize: 14, fontFamily: fontFamily('700'), color: '#FFFFFF' },
    reminderError: { fontSize: 12, fontFamily: fontFamily('500'), color: theme.danger, marginTop: 8 },
  });
}
