import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { ANIME_SERIES, seriesTags, seriesTitle } from '../data/animeSeries';
import { CHARACTERS, characterName } from '../data/characters';
import { getTier, tierLabel } from '../data/difficulty';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';
import SoundTouchable from '../sound/SoundTouchable';
import Icon from './Icon';

type SectionKey = 'anime' | 'characters';

/**
 * What the quiz is actually made of — every series and every character the
 * questions are drawn from.
 *
 * Both lists start collapsed. Seventy-odd rows is the point of the thing, but
 * it is not what somebody opening "About" came to read, so each section
 * announces its size and opens on request.
 */
export default function ContentCatalogue() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { language } = useLanguage();
  const t = useT();
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({ anime: false, characters: false });

  // Alphabetical by the title as it is actually shown: a catalogue is read to
  // answer "is my show in here?", and the authored order cannot be searched.
  const series = useMemo(
    () =>
      [...ANIME_SERIES].sort((a, b) =>
        seriesTitle(a, language).localeCompare(seriesTitle(b, language), language)
      ),
    [language]
  );

  // Characters sit under their series rather than in one flat list of 54
  // names, which would repeat the series on every row.
  const cast = useMemo(
    () =>
      series
        .map((s) => ({ series: s, members: CHARACTERS.filter((c) => c.seriesId === s.id) }))
        .filter((group) => group.members.length > 0),
    [series]
  );

  const toggle = (key: SectionKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const header = (key: SectionKey, label: string, count: number) => (
    <SoundTouchable
      style={styles.header}
      onPress={() => toggle(key)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open[key] }}
      accessibilityLabel={`${label}, ${count}`}
    >
      <Text style={styles.headerLabel}>{label}</Text>
      <View style={styles.countPill}>
        <Text style={styles.countText}>{count}</Text>
      </View>
      <View style={open[key] ? styles.chevronOpen : undefined}>
        <Icon name="chevronRight" size={16} color={theme.textMuted} />
      </View>
    </SoundTouchable>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionHint}>{t('about.contentHint')}</Text>

      <View style={styles.card}>
        {header('anime', t('about.animeSection'), ANIME_SERIES.length)}

        {open.anime &&
          series.map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{seriesTitle(s, language)}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {[String(s.year), ...seriesTags(s, language)].join(' · ')}
                </Text>
              </View>
            </View>
          ))}
      </View>

      <View style={[styles.card, styles.cardSpaced]}>
        {header('characters', t('about.charactersSection'), CHARACTERS.length)}

        {open.characters &&
          cast.map((group) => (
            <View key={group.series.id} style={styles.group}>
              <Text style={styles.groupTitle}>{seriesTitle(group.series, language)}</Text>
              {group.members.map((character) => {
                const tier = getTier(character.tier);
                return (
                  <View key={character.id} style={styles.castRow}>
                    <Text style={styles.castName} numberOfLines={1}>
                      {characterName(character, language)}
                    </Text>
                    {/* The tier says where in the game they turn up, which is
                        the one thing a player can act on. */}
                    <View style={[styles.tierPill, { backgroundColor: tier.colorBg }]}>
                      <Text style={[styles.tierText, { color: tier.color }]}>{tierLabel(tier, language)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    wrap: { marginTop: 16 },
    sectionHint: {
      fontSize: 12,
      fontFamily: fontFamily('500'),
      color: theme.textMuted,
      marginBottom: 8,
      marginLeft: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      overflow: 'hidden',
    },
    cardSpaced: { marginTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
    headerLabel: { flex: 1, fontSize: 14, fontFamily: fontFamily('800'), color: theme.text },
    countPill: {
      minWidth: 28,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
    },
    countText: { fontSize: 11, fontFamily: fontFamily('800'), color: theme.primary },
    // The icon set has no downward chevron, and rotating the one it has beats
    // adding a variant used in a single place.
    chevronOpen: { transform: [{ rotate: '90deg' }] },
    row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border },
    rowText: { gap: 2 },
    rowTitle: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    rowMeta: { fontSize: 11, fontFamily: fontFamily('500'), color: theme.textMuted },
    group: { paddingTop: 12, paddingBottom: 4, borderTopWidth: 1, borderTopColor: theme.border },
    groupTitle: {
      fontSize: 11,
      fontFamily: fontFamily('800'),
      color: theme.primary,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    castRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
    castName: { flex: 1, fontSize: 13, fontFamily: fontFamily('600'), color: theme.text },
    tierPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
    tierText: { fontSize: 10, fontFamily: fontFamily('800') },
  });
}
