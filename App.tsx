import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from '@expo-google-fonts/manrope/useFonts';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { SoundProvider, useSound } from './src/sound/SoundContext';
import BottomTabBar, { TabKey } from './src/components/BottomTabBar';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import StatsScreen from './src/screens/StatsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { CategoryId } from './src/data/categories';
import { TierId, getTier } from './src/data/difficulty';
import { GAME_MODES, ModeId } from './src/data/modes';
import { RoundConfig } from './src/quiz/types';

type Screen = 'home' | 'categoryDetail' | 'quiz' | 'result' | 'stats' | 'achievements' | 'profile';

const TAB_SCREENS: Screen[] = ['home', 'stats', 'achievements', 'profile'];

function AppShell() {
  const { profile, loading, recordRoundResult } = useAuth();
  const { theme, resolvedScheme } = useTheme();
  const { setMusicContext } = useSound();

  const [preAuthScreen, setPreAuthScreen] = useState<'welcome' | 'auth'>('welcome');
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [roundConfig, setRoundConfig] = useState<RoundConfig | null>(null);
  const [activeModeId, setActiveModeId] = useState<ModeId | null>(null);
  const [quizKey, setQuizKey] = useState(0);
  const [result, setResult] = useState({ score: 0, total: 0 });

  useEffect(() => {
    setScreen('home');
    setPreAuthScreen('welcome');
  }, [profile?.id]);

  useEffect(() => {
    setMusicContext(screen === 'quiz' ? 'quiz' : 'menu');
  }, [screen, setMusicContext]);

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
        {preAuthScreen === 'welcome' ? (
          <WelcomeScreen onStart={() => setPreAuthScreen('auth')} />
        ) : (
          <AuthScreen onBack={() => setPreAuthScreen('welcome')} />
        )}
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      </>
    );
  }

  const startTier = (categoryId: CategoryId, tier: TierId | undefined) => {
    const config: RoundConfig = {
      categoryId,
      tier,
      questionCount: tier ? getTier(tier).questionsPerRound : 15,
    };
    setRoundConfig(config);
    setActiveModeId(null);
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  const startMode = (modeId: ModeId) => {
    const mode = GAME_MODES.find((m) => m.id === modeId)!;
    setRoundConfig(mode.config);
    setActiveModeId(modeId);
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  const finishQuiz = (score: number, total: number) => {
    setResult({ score, total });
    if (roundConfig) recordRoundResult(roundConfig, activeModeId, score, total);
    setScreen('result');
  };

  const restart = () => {
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  const showTabBar = TAB_SCREENS.includes(screen);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        {screen === 'home' && (
          <HomeScreen
            onOpenCategory={(id) => {
              setSelectedCategory(id);
              setScreen('categoryDetail');
            }}
            onStartMode={startMode}
            onOpenSettings={() => setScreen('profile')}
          />
        )}
        {screen === 'categoryDetail' && selectedCategory && (
          <CategoryDetailScreen categoryId={selectedCategory} onBack={() => setScreen('home')} onStartTier={startTier} />
        )}
        {screen === 'quiz' && roundConfig && (
          <QuizScreen key={quizKey} config={roundConfig} onFinish={finishQuiz} onClose={() => setScreen('home')} />
        )}
        {screen === 'result' && (
          <ResultScreen score={result.score} total={result.total} onRestart={restart} onChooseCategory={() => setScreen('home')} />
        )}
        {screen === 'stats' && <StatsScreen />}
        {screen === 'achievements' && <AchievementsScreen />}
        {screen === 'profile' && <ProfileScreen />}
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
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF9F6' }}>
        <ActivityIndicator size="large" color="#1F2937" />
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
