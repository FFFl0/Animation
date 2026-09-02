# Angel Quiz

Мобильная викторина "угадай аниме-героиню": на экране показывается подсказка
(описание персонажа), нужно выбрать правильное имя из четырёх вариантов.
Сделано на Expo (React Native + TypeScript), без сторонних изображений —
аватары персонажей рисуются как цветные плейсхолдеры с инициалом.

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
App.tsx                    # переключение экранов (home / quiz / result)
src/data/characters.ts     # база персонажей (имя, аниме, подсказка, цвет)
src/quiz/generateQuiz.ts   # генерация вопросов и вариантов ответа
src/screens/HomeScreen.tsx
src/screens/QuizScreen.tsx
src/screens/ResultScreen.tsx
src/components/AvatarPlaceholder.tsx
src/theme.ts                # цветовая палитра приложения
```

## Как добавить персонажей

Допишите объект в `src/data/characters.ts`:

```ts
{ id: 'unique-id', name: 'Имя', series: 'Аниме', hint: 'Подсказка', color: '#HEX' }
```
