import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';

type Screen = 'home' | 'quiz' | 'result';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [quizKey, setQuizKey] = useState(0);
  const [result, setResult] = useState({ score: 0, total: 0 });

  const startQuiz = () => {
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
      {screen === 'quiz' && <QuizScreen key={quizKey} onFinish={finishQuiz} />}
      {screen === 'result' && (
        <ResultScreen
          score={result.score}
          total={result.total}
          onRestart={startQuiz}
          onHome={() => setScreen('home')}
        />
      )}
      <StatusBar style="auto" />
    </>
  );
}
