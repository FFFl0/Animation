import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { hapticError, hapticHeavy, hapticSuccess, hapticTap } from '../haptics/haptics';

const MUSIC_KEY = 'animequiz.musicEnabled';
const SFX_KEY = 'animequiz.sfxEnabled';
const HAPTICS_KEY = 'animequiz.hapticsEnabled';

export type MusicContext = 'menu' | 'quiz' | 'silent';

type SoundContextValue = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  hapticsEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleHaptics: () => void;
  setMusicContext: (ctx: MusicContext) => void;
  // Sound and vibration are two ways of saying the same thing, so they are
  // triggered together from one call rather than by every screen remembering
  // to fire both.
  playClick: () => void;
  playCorrect: () => void;
  playWrong: () => void;
  /** Vibration without a sound, for moments that have no sound of their own. */
  buzz: (kind: 'tap' | 'success' | 'error' | 'heavy') => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const musicContextRef = useRef<MusicContext>('menu');

  const unlockedRef = useRef(Platform.OS !== 'web');
  const menuPlayerRef = useRef<AudioPlayer | null>(null);
  const quizPlayerRef = useRef<AudioPlayer | null>(null);
  const clickPlayerRef = useRef<AudioPlayer | null>(null);
  const correctPlayerRef = useRef<AudioPlayer | null>(null);
  const wrongPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(MUSIC_KEY),
      AsyncStorage.getItem(SFX_KEY),
      AsyncStorage.getItem(HAPTICS_KEY),
    ]).then(([m, s, h]) => {
      if (m !== null) setMusicEnabled(m === '1');
      if (s !== null) setSfxEnabled(s === '1');
      if (h !== null) setHapticsEnabled(h === '1');
      setLoaded(true);
    });

    menuPlayerRef.current = createAudioPlayer(require('../../assets/audio/theme-menu.mp3'));
    quizPlayerRef.current = createAudioPlayer(require('../../assets/audio/theme-quiz.mp3'));
    clickPlayerRef.current = createAudioPlayer(require('../../assets/audio/click.wav'));
    correctPlayerRef.current = createAudioPlayer(require('../../assets/audio/correct.wav'));
    wrongPlayerRef.current = createAudioPlayer(require('../../assets/audio/wrong.wav'));

    menuPlayerRef.current.loop = true;
    quizPlayerRef.current.loop = true;
    menuPlayerRef.current.volume = 0.35;
    quizPlayerRef.current.volume = 0.35;

    if (Platform.OS === 'web') {
      const unlock = () => {
        unlockedRef.current = true;
        syncMusic();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock);
      window.addEventListener('keydown', unlock);
    }

    return () => {
      menuPlayerRef.current?.remove();
      quizPlayerRef.current?.remove();
      clickPlayerRef.current?.remove();
      correctPlayerRef.current?.remove();
      wrongPlayerRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncMusic() {
    const menu = menuPlayerRef.current;
    const quiz = quizPlayerRef.current;
    if (!menu || !quiz) return;

    if (!musicEnabled || (Platform.OS === 'web' && !unlockedRef.current)) {
      menu.pause();
      quiz.pause();
      return;
    }

    if (musicContextRef.current === 'silent') {
      menu.pause();
      quiz.pause();
      return;
    }

    if (musicContextRef.current === 'menu') {
      quiz.pause();
      menu.play();
    } else {
      menu.pause();
      quiz.play();
    }
  }

  useEffect(() => {
    if (!loaded) return;
    syncMusic();
    AsyncStorage.setItem(MUSIC_KEY, musicEnabled ? '1' : '0');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicEnabled, loaded]);

  useEffect(() => {
    AsyncStorage.setItem(SFX_KEY, sfxEnabled ? '1' : '0');
  }, [sfxEnabled]);

  useEffect(() => {
    AsyncStorage.setItem(HAPTICS_KEY, hapticsEnabled ? '1' : '0');
  }, [hapticsEnabled]);

  const setMusicContext = (ctx: MusicContext) => {
    musicContextRef.current = ctx;
    syncMusic();
  };

  function playSfx(player: AudioPlayer | null) {
    if (!sfxEnabled || !player) return;
    if (Platform.OS === 'web' && !unlockedRef.current) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // ignore playback errors (e.g. not yet unlocked on web)
    }
  }

  function buzz(kind: 'tap' | 'success' | 'error' | 'heavy') {
    if (!hapticsEnabled) return;
    if (kind === 'tap') hapticTap();
    else if (kind === 'success') hapticSuccess();
    else if (kind === 'error') hapticError();
    else hapticHeavy();
  }

  const value = useMemo<SoundContextValue>(
    () => ({
      musicEnabled,
      sfxEnabled,
      hapticsEnabled,
      toggleMusic: () => setMusicEnabled((v) => !v),
      toggleSfx: () => setSfxEnabled((v) => !v),
      toggleHaptics: () =>
        setHapticsEnabled((v) => {
          // Buzz on the way *on* so the player feels what they just enabled.
          if (!v) hapticTap();
          return !v;
        }),
      setMusicContext,
      playClick: () => {
        playSfx(clickPlayerRef.current);
        buzz('tap');
      },
      playCorrect: () => {
        playSfx(correctPlayerRef.current);
        buzz('success');
      },
      playWrong: () => {
        playSfx(wrongPlayerRef.current);
        buzz('error');
      },
      buzz,
    }),
    [musicEnabled, sfxEnabled, hapticsEnabled]
  );

  if (!loaded) return null;

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
