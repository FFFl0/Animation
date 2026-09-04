import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';

const MUSIC_KEY = 'animequiz.musicEnabled';
const SFX_KEY = 'animequiz.sfxEnabled';

export type MusicContext = 'menu' | 'quiz';

type SoundContextValue = {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  setMusicContext: (ctx: MusicContext) => void;
  playClick: () => void;
  playCorrect: () => void;
  playWrong: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const musicContextRef = useRef<MusicContext>('menu');

  const unlockedRef = useRef(Platform.OS !== 'web');
  const menuPlayerRef = useRef<AudioPlayer | null>(null);
  const quizPlayerRef = useRef<AudioPlayer | null>(null);
  const clickPlayerRef = useRef<AudioPlayer | null>(null);
  const correctPlayerRef = useRef<AudioPlayer | null>(null);
  const wrongPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(MUSIC_KEY), AsyncStorage.getItem(SFX_KEY)]).then(([m, s]) => {
      if (m !== null) setMusicEnabled(m === '1');
      if (s !== null) setSfxEnabled(s === '1');
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

  const value = useMemo<SoundContextValue>(
    () => ({
      musicEnabled,
      sfxEnabled,
      toggleMusic: () => setMusicEnabled((v) => !v),
      toggleSfx: () => setSfxEnabled((v) => !v),
      setMusicContext,
      playClick: () => playSfx(clickPlayerRef.current),
      playCorrect: () => playSfx(correctPlayerRef.current),
      playWrong: () => playSfx(wrongPlayerRef.current),
    }),
    [musicEnabled, sfxEnabled]
  );

  if (!loaded) return null;

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
}
