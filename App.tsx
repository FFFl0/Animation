import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import { QuizMode } from './src/quiz/generateQuiz';

type Screen = 'home' | 'quiz' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<QuizMode>('photo');
  const [quizKey, setQuizKey] = useState(0);
  const [result, setResult] = useState({ score: 0, total: 0 });

  const startQuiz = (nextMode: QuizMode) => {
    setMode(nextMode);
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  const finishQuiz = (score: number, total: number) => {
    setResult({ score, total });
    setScreen('result');
  };

  return (
    <>
      {screen === 'home' && <HomeScreen onStart={startQuiz} />}
      {screen === 'quiz' && <QuizScreen key={quizKey} mode={mode} onFinish={finishQuiz} />}
      {screen === 'result' && (
        <ResultScreen
          score={result.score}
          total={result.total}
          onRestart={() => startQuiz(mode)}
          onHome={() => setScreen('home')}
        />
      )}
      <StatusBar style="auto" />
    </>
  );
}
