import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from '@expo-google-fonts/plus-jakarta-sans/useFonts';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SoundProvider, useSound } from './src/sound/SoundContext';
import BottomTabBar, { TabKey } from './src/components/BottomTabBar';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import { QuizMode } from './src/quiz/generateQuiz';

type Screen = 'home' | 'quiz' | 'result' | 'profile' | 'leaderboard';

const TAB_SCREENS: Screen[] = ['home', 'leaderboard', 'profile'];

function AppShell() {
  const { profile, loading, recordQuizResult } = useAuth();
  const { theme, resolvedScheme } = useTheme();
  const { setMusicContext } = useSound();
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<QuizMode>('photo');
  const [quizKey, setQuizKey] = useState(0);
  const [result, setResult] = useState({ score: 0, total: 0 });

  useEffect(() => {
    setScreen('home');
  }, [profile?.id]);

  useEffect(() => {
    setMusicContext(!profile ? 'menu' : screen === 'quiz' ? 'quiz' : 'menu');
  }, [profile, screen, setMusicContext]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <>
        <AuthScreen />
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  const startQuiz = (nextMode: QuizMode) => {
    setMode(nextMode);
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  const finishQuiz = (score: number, total: number) => {
    setResult({ score, total });
    recordQuizResult(mode, score, total);
    setScreen('result');
  };

  const showTabBar = TAB_SCREENS.includes(screen);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        {screen === 'home' && <HomeScreen onStart={startQuiz} onOpenProfile={() => setScreen('profile')} />}
        {screen === 'quiz' && (
          <QuizScreen key={quizKey} mode={mode} onFinish={finishQuiz} onClose={() => setScreen('home')} />
        )}
        {screen === 'result' && (
          <ResultScreen
            score={result.score}
            total={result.total}
            onRestart={() => startQuiz(mode)}
            onHome={() => setScreen('home')}
          />
        )}
        {screen === 'profile' && <ProfileScreen />}
        {screen === 'leaderboard' && <LeaderboardScreen />}
      </View>
      {showTabBar && (
        <BottomTabBar active={screen as TabKey} onChange={(tab: TabKey) => setScreen(tab)} theme={theme} />
      )}
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F1E7' }}>
        <ActivityIndicator size="large" color="#211D18" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <SoundProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </SoundProvider>
    </ThemeProvider>
  );
}
