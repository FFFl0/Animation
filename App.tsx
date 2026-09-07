import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
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
import { LanguageProvider } from './src/i18n/LanguageContext';
import { SoundProvider, useSound } from './src/sound/SoundContext';
import BottomTabBar, { TabKey } from './src/components/BottomTabBar';
import AchievementToastHost from './src/components/AchievementToast';
import OnboardingTour from './src/components/OnboardingTour';
import ResponsiveShell from './src/components/ResponsiveShell';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import StatsScreen from './src/screens/StatsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import BattleScreen from './src/screens/BattleScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendProfileScreen from './src/screens/FriendProfileScreen';
import CompareScreen from './src/screens/CompareScreen';
import { Friendship, PlayerSummary } from './src/friends/friendsApi';
import { CategoryId } from './src/data/categories';
import { TierId, getTier } from './src/data/difficulty';
import { GAME_MODES, ModeId } from './src/data/modes';
import { RoundConfig } from './src/quiz/types';
import { Achievement } from './src/data/achievements';
import { dateSeed } from './src/quiz/generateQuiz';
import { todayDateStr } from './src/quiz/today';
import { parseRecoveryUrl, parseAuthTokensFromUrl, RecoveryTokens } from './src/auth/parseRecoveryUrl';

type Screen =
  | 'home'
  | 'categoryDetail'
  | 'quiz'
  | 'result'
  | 'stats'
  | 'achievements'
  | 'profile'
  | 'leaderboard'
  | 'battle'
  | 'friends'
  | 'friendProfile'
  | 'compare';

const TAB_SCREENS: Screen[] = ['home', 'friends', 'stats', 'achievements', 'profile'];

function ScreenTransition({ children, transitionKey }: { children: React.ReactNode; transitionKey: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(10);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: useNative }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: useNative }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey]);

  return <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

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
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<PlayerSummary | null>(null);
  const [selectedFriendship, setSelectedFriendship] = useState<Friendship | null>(null);
  const [challengeUsername, setChallengeUsername] = useState<string | null>(null);

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
    const config: RoundConfig =
      modeId === 'daily' ? { ...mode.config, seed: dateSeed(todayDateStr()) } : mode.config;
    setRoundConfig(config);
    setActiveModeId(modeId);
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  const finishQuiz = async (score: number, total: number) => {
    setResult({ score, total });
    if (roundConfig) {
      const unlocked = await recordRoundResult(roundConfig, activeModeId, score, total);
      if (unlocked.length) setAchievementQueue((q) => [...q, ...unlocked]);
    }
    setScreen('result');
  };

  const restart = () => {
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  const showTabBar = TAB_SCREENS.includes(screen);
  const transitionKey = screen === 'quiz' ? `quiz-${quizKey}` : screen;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        <ScreenTransition transitionKey={transitionKey}>
          {screen === 'home' && (
            <HomeScreen
              onOpenCategory={(id) => {
                setSelectedCategory(id);
                setScreen('categoryDetail');
              }}
              onStartMode={startMode}
              onOpenSettings={() => setScreen('profile')}
              onOpenBattle={() => setScreen('battle')}
            />
          )}
          {screen === 'battle' && (
            <BattleScreen
              onBack={() => {
                setChallengeUsername(null);
                setScreen(challengeUsername ? 'friendProfile' : 'home');
              }}
              challengeFriendUsername={challengeUsername ?? undefined}
            />
          )}
          {screen === 'friends' && (
            <FriendsScreen
              onBack={() => setScreen('home')}
              onOpenFriend={(player, friendship) => {
                setSelectedFriend(player);
                setSelectedFriendship(friendship);
                setScreen('friendProfile');
              }}
            />
          )}
          {screen === 'friendProfile' && selectedFriend && (
            <FriendProfileScreen
              player={selectedFriend}
              friendship={selectedFriendship}
              onBack={() => setScreen('friends')}
              onCompare={() => setScreen('compare')}
              onChallenge={() => {
                setChallengeUsername(selectedFriend.username);
                setScreen('battle');
              }}
            />
          )}
          {screen === 'compare' && selectedFriend && (
            <CompareScreen
              friend={selectedFriend}
              onBack={() => setScreen('friendProfile')}
              onChallenge={() => {
                setChallengeUsername(selectedFriend.username);
                setScreen('battle');
              }}
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
          {screen === 'stats' && <StatsScreen onOpenLeaderboard={() => setScreen('leaderboard')} />}
          {screen === 'leaderboard' && <LeaderboardScreen onBack={() => setScreen('stats')} />}
          {screen === 'achievements' && <AchievementsScreen />}
          {screen === 'profile' && <ProfileScreen />}
        </ScreenTransition>
      </View>
      {showTabBar && (
        <BottomTabBar active={screen as TabKey} onChange={(tab: TabKey) => setScreen(tab)} theme={theme} />
      )}
      <AchievementToastHost queue={achievementQueue} onShown={() => setAchievementQueue((q) => q.slice(1))} />
      <OnboardingTour profileId={profile.id} />
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

/**
 * Handles both deep-link flows that hand back tokens in the URL: the
 * password-recovery link (routes to ResetPasswordScreen) and the web
 * Google OAuth redirect (completes the session in place, since supabase-js
 * has `detectSessionInUrl: false` — it never parses the hash on its own).
 * Lives inside AuthProvider so it can reach useAuth().
 */
function DeepLinkGate({ children }: { children: React.ReactNode }) {
  const { completeGoogleSession } = useAuth();
  const [recoveryTokens, setRecoveryTokens] = useState<RecoveryTokens | null>(null);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const recovery = parseRecoveryUrl(url);
      if (recovery) {
        setRecoveryTokens(recovery);
        return;
      }
      const oauth = parseAuthTokensFromUrl(url);
      if (oauth) completeGoogleSession(oauth.accessToken, oauth.refreshToken);
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (recoveryTokens) {
    return (
      <ResetPasswordScreen
        accessToken={recoveryTokens.accessToken}
        refreshToken={recoveryTokens.refreshToken}
        onDone={() => setRecoveryTokens(null)}
      />
    );
  }

  return <>{children}</>;
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
      <LanguageProvider>
        <SoundProvider>
          <AuthProvider>
            <ResponsiveShell>
              <DeepLinkGate>
                <AppShell />
              </DeepLinkGate>
            </ResponsiveShell>
          </AuthProvider>
        </SoundProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
