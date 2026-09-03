import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { QuizMode } from './src/quiz/generateQuiz';
import { theme } from './src/theme';

type Screen = 'home' | 'quiz' | 'result' | 'profile';

function AppShell() {
  const { profile, loading, recordQuizResult } = useAuth();
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<QuizMode>('photo');
  const [quizKey, setQuizKey] = useState(0);
  const [result, setResult] = useState({ score: 0, total: 0 });

  useEffect(() => {
    setScreen('home');
  }, [profile?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!profile) {
    return <AuthScreen />;
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

  return (
    <>
      {screen === 'home' && <HomeScreen onStart={startQuiz} onOpenProfile={() => setScreen('profile')} />}
      {screen === 'quiz' && <QuizScreen key={quizKey} mode={mode} onFinish={finishQuiz} />}
      {screen === 'result' && (
        <ResultScreen
          score={result.score}
          total={result.total}
          onRestart={() => startQuiz(mode)}
          onHome={() => setScreen('home')}
        />
      )}
      {screen === 'profile' && <ProfileScreen onBack={() => setScreen('home')} />}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
