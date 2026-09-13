import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useSound } from '../sound/SoundContext';
import Icon from '../components/Icon';
import SoundTouchable from '../sound/SoundTouchable';
import { quoteAudioFor } from '../data/quoteAudio';
import { useT } from '../i18n/strings';

type Props = {
  characterId: string;
};

/**
 * The voiced version of a quote, offered next to the written one rather than
 * instead of it — the text stays readable with the sound off, in a noisy room
 * or for a player who would rather not wait.
 *
 * It plays once by itself when the question appears and can be replayed; the
 * app's own soundtrack is held for as long as it is speaking, so the line is
 * never competing with the quiz music.
 */
export default function QuoteAudio({ characterId }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { setMusicSuspended } = useSound();
  const t = useT();
  const source = quoteAudioFor(characterId) ?? null;
  const player = useAudioPlayer(source ?? undefined);
  const status = useAudioPlayerStatus(player);
  const autoplayedRef = useRef(false);

  const playing = status.playing;

  useEffect(() => {
    setMusicSuspended(playing);
  }, [playing, setMusicSuspended]);

  // Whatever happens — the clip ends, the question changes, the round is
  // abandoned — the soundtrack has to come back.
  useEffect(() => {
    return () => setMusicSuspended(false);
  }, [setMusicSuspended]);

  useEffect(() => {
    if (!source || autoplayedRef.current || !status.isLoaded) return;
    autoplayedRef.current = true;
    player.play();
  }, [source, status.isLoaded, player]);

  if (!source) return null;

  const replay = () => {
    if (playing) {
      player.pause();
      return;
    }
    player.seekTo(0);
    player.play();
  };

  return (
    <SoundTouchable style={styles.button} onPress={replay} accessibilityRole="button">
      <View style={styles.badge}>
        <Icon name={playing ? 'pause' : 'play'} size={14} color={theme.onPrimary} />
      </View>
      <Text style={styles.label}>{playing ? t('quiz.quoteAudioPlaying') : t('quiz.quoteAudioListen')}</Text>
    </SoundTouchable>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 9,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: radius.pill,
      paddingLeft: 6,
      paddingRight: 16,
      paddingVertical: 6,
      marginBottom: 16,
    },
    badge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { fontSize: 13, fontFamily: fontFamily('700'), color: theme.text },
  });
}
