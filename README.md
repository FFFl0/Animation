# Angel Quiz

Мобильная викторина про аниме-героинь на Expo (React Native + TypeScript),
с тремя режимами:

- **Угадай по фото** — по стилизованному SVG-портрету персонажа выбрать имя из 4 вариантов
- **Угадай по описанию** — то же самое, но по короткой текстовой подсказке
- **Вопросы про персонажа** — конкретный факт про названного персонажа (например, "Кто подарил Микасе красный шарф?")

Никаких сторонних изображений: портреты — это оригинальные векторные
(SVG) аватары, собранные по параметрам персонажа (цвет/причёска волос,
цвет глаз, значок-акцент), а не скопированный чужой арт.

## Запуск

```bash
npm install
npm start        # откроет Expo DevTools / Metro
npm run web       # запустить в браузере
npm run ios       # запустить в iOS-симуляторе (нужен macOS)
npm run android   # запустить в Android-эмуляторе
```

## Структура

```
App.tsx                    # переключение экранов (home / quiz / result) и режима викторины
src/data/characters.ts     # база из 25 персонажей: имя, аниме, описание, вопрос/ответ, аватар
src/quiz/generateQuiz.ts   # генерация вопросов под каждый из трёх режимов
src/screens/HomeScreen.tsx # выбор режима викторины
src/screens/QuizScreen.tsx
src/screens/ResultScreen.tsx
src/components/AnimeAvatar.tsx  # SVG-портрет персонажа (react-native-svg)
src/theme.ts                # цветовая палитра приложения
```

## Как добавить персонажа

Допишите объект в `src/data/characters.ts`:

```ts
{
  id: 'unique-id', name: 'Имя', nameEn: 'Name', series: 'Аниме',
  description: 'Короткая подсказка про персонажа',
  question: 'Вопрос про факт из сюжета', answer: 'Правильный ответ',
  distractors: ['Неверный 1', 'Неверный 2', 'Неверный 3'],
  avatar: { hairColor: '#HEX', hairStyle: 'long', eyeColor: '#HEX', accent: '#HEX', badge: '🎀' },
}
```

`hairStyle` — один из: `long`, `twin`, `bob`, `wavy`, `odango`, `animalEars`, `horns`, `wild`.
