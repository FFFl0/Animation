import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import Icon from '../components/Icon';
import { openingVideoFor } from '../data/openingVideos';

/** Side padding the quiz screen already applies, doubled. */
const SCREEN_PADDING = 48;
const MAX_WIDTH = 420;

type Props = {
  seriesId: string;
  /** Shown when a series has no clip yet, so a missing file degrades to a
   * readable message instead of a black rectangle. */
  missingLabel: string;
};

/**
 * Plays a series' theme clip. It loops and starts on its own: the player is
 * meant to watch, recognise and answer without hunting for a play button,
 * and a short clip that only ran once would be gone before they looked up.
 */
export default function VideoPrompt({ seriesId, missingLabel }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const [playing, setPlaying] = useState(false);
  const source = openingVideoFor(seriesId) ?? null;

  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.play();
  });

  // Autoplay is refused outright in a browser until the page has been
  // interacted with, and can be declined on a device too, so the component
  // follows what actually happens rather than assuming play() worked.
  useEffect(() => {
    setPlaying(player.playing);
    const subscription = player.addListener('playingChange', ({ isPlaying }) => setPlaying(isPlaying));
    return () => subscription.remove();
  }, [player]);

  const videoWidth = Math.min(width - SCREEN_PADDING, MAX_WIDTH);
  const videoHeight = Math.round((videoWidth * 9) / 16);

  if (!source) {
    return (
      <View style={[styles.missing, { width: videoWidth, height: videoHeight }]}>
        <Text style={styles.missingText}>{missingLabel}</Text>
      </View>
    );
  }

  return (
    <View style={{ width: videoWidth, height: videoHeight }}>
      <VideoView
        player={player}
        style={[styles.video, { width: videoWidth, height: videoHeight }]}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
        allowsPictureInPicture={false}
      />
      {!playing && (
        <Pressable
          style={[styles.overlay, { borderRadius: radius.lg }]}
          onPress={() => player.play()}
          accessibilityRole="button"
        >
          <View style={styles.playBadge}>
            <Icon name="play" size={26} color="#FFFFFF" />
          </View>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    video: { borderRadius: radius.lg, backgroundColor: '#000', overflow: 'hidden' },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    playBadge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    missing: {
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.card,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    missingText: {
      fontSize: 13,
      fontFamily: fontFamily('600'),
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
}
