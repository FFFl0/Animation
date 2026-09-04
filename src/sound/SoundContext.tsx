import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

const MUSIC_KEY = 'animequiz:musicEnabled';
const SFX_KEY = 'animequiz:sfxEnabled';

const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.7;

export type MusicContext = 'menu' | 'quiz' | 'none';

type SoundContextValue = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  setMusicContext: (context: MusicContext) => void;
  playClick: () => void;
  playCorrect: () => void;
  playWrong: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

// player.play() is typed as returning void, but the web implementation
// actually calls the underlying HTMLMediaElement's play() (a Promise)
// without awaiting or catching it — a rejection (e.g. the browser's
// autoplay policy blocking playback before any user gesture) becomes an
// unhandled rejection *inside expo-audio itself*, which no try/catch on
// our side can intercept. So on web we avoid ever calling play() before a
// real user gesture has happened at all, rather than trying to catch a
// rejection we structurally can't reach.
function safePlay(player: AudioPlayer | null | undefined) {
  if (!player) return;
  try {
    player.play();
  } catch {
    // Playback can legitimately fail before the player finishes loading, or
    // on platforms without audio support — never let this crash the UI.
  }
}

function playFromStart(player: AudioPlayer | null) {
  if (!player) return;
  try {
    player.seekTo(0);
  } catch {
    // ignore — seeking before load can throw, playback still proceeds from 0
  }
  safePlay(player);
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const musicContextRef = useRef<MusicContext>('menu');
  // On native there's no autoplay restriction; on web, wait for a real
  // pointer/key event before ever attempting to start music.
  const unlockedRef = useRef(Platform.OS !== 'web');

  const menuPlayer = useRef<AudioPlayer | null>(null);
  const quizPlayer = useRef<AudioPlayer | null>(null);
  const clickPlayer = useRef<AudioPlayer | null>(null);
  const correctPlayer = useRef<AudioPlayer | null>(null);
  const wrongPlayer = useRef<AudioPlayer | null>(null);

  const syncMusic = () => {
    if (!unlockedRef.current) return;
    const context = musicEnabled ? musicContextRef.current : 'none';
    if (context === 'menu') {
      quizPlayer.current?.pause();
      if (!menuPlayer.current?.playing) safePlay(menuPlayer.current);
    } else if (context === 'quiz') {
      menuPlayer.current?.pause();
      if (!quizPlayer.current?.playing) safePlay(quizPlayer.current);
    } else {
      menuPlayer.current?.pause();
      quizPlayer.current?.pause();
    }
  };

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});

    menuPlayer.current = createAudioPlayer(require('../../assets/audio/theme-menu.mp3'));
    menuPlayer.current.loop = true;
    menuPlayer.current.volume = MUSIC_VOLUME;

    quizPlayer.current = createAudioPlayer(require('../../assets/audio/theme-quiz.mp3'));
    quizPlayer.current.loop = true;
    quizPlayer.current.volume = MUSIC_VOLUME;

    clickPlayer.current = createAudioPlayer(require('../../assets/audio/click.wav'));
    clickPlayer.current.volume = SFX_VOLUME;

    correctPlayer.current = createAudioPlayer(require('../../assets/audio/correct.wav'));
    correctPlayer.current.volume = SFX_VOLUME;

    wrongPlayer.current = createAudioPlayer(require('../../assets/audio/wrong.wav'));
    wrongPlayer.current.volume = SFX_VOLUME;

    AsyncStorage.getItem(MUSIC_KEY).then((v) => {
      if (v === '0') setMusicEnabled(false);
    });
    AsyncStorage.getItem(SFX_KEY).then((v) => {
      if (v === '0') setSfxEnabled(false);
    });

    let cleanupUnlock: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const unlock = () => {
        unlockedRef.current = true;
        syncMusic();
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('pointerdown', unlock);
      document.addEventListener('keydown', unlock);
      cleanupUnlock = () => {
        document.removeEventListener('pointerdown', unlock);
        document.removeEventListener('keydown', unlock);
      };
    }

    return () => {
      cleanupUnlock?.();
      menuPlayer.current?.remove();
      quizPlayer.current?.remove();
      clickPlayer.current?.remove();
      correctPlayer.current?.remove();
      wrongPlayer.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the two music players' play/pause state in sync with both the
  // enabled toggle and which screen context is currently active.
  useEffect(() => {
    syncMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicEnabled]);

  const setMusicContext = (context: MusicContext) => {
    musicContextRef.current = context;
    syncMusic();
  };

  const value = useMemo<SoundContextValue>(
    () => ({
      musicEnabled,
      sfxEnabled,
      toggleMusic: () => {
        setMusicEnabled((prev) => {
          const next = !prev;
          AsyncStorage.setItem(MUSIC_KEY, next ? '1' : '0');
          return next;
        });
      },
      toggleSfx: () => {
        setSfxEnabled((prev) => {
          const next = !prev;
          AsyncStorage.setItem(SFX_KEY, next ? '1' : '0');
          return next;
        });
      },
      setMusicContext,
      playClick: () => {
        if (sfxEnabled) playFromStart(clickPlayer.current);
      },
      playCorrect: () => {
        if (sfxEnabled) playFromStart(correctPlayer.current);
      },
      playWrong: () => {
        if (sfxEnabled) playFromStart(wrongPlayer.current);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [musicEnabled, sfxEnabled]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
