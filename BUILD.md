# Сборка приложения

Сборкой занимается EAS Build — Expo собирает на своих машинах, локально
ни Android SDK, ни Xcode не нужны. Запускается всё через GitHub Actions:
**Actions → EAS Build → Run workflow**, там выбираются платформа
(`android` / `ios` / `all`) и профиль. Ссылка на готовый файл появляется
в Summary запуска.

При `all` запускаются две независимые задачи, по одной на платформу.
Это не мелочь: iOS без настроенных ключей Apple падает сразу (см. ниже),
и одной командой на обе платформы он утащил бы за собой Android.

Профили описаны в `eas.json`:

| Профиль | Android | iOS |
| --- | --- | --- |
| `preview` | APK, ставится напрямую | ad-hoc `.ipa` для зарегистрированных устройств |
| `production` | AAB для Google Play | сборка для App Store / TestFlight |
| `simulator` | — | `.app` для iOS Simulator |

Ключи Supabase (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
зашиты в `env` профилей — это публичный anon-ключ, он и должен попадать
в клиент. Токен Expo лежит в секрете репозитория `EXPO_TOKEN`.

## Supabase

Серверная часть живёт в `supabase/`. Всё в ней ставится вручную, один раз
(и после каждой правки схемы или функций):

1. **Схема.** SQL Editor → вставить целиком `supabase/schema.sql` → Run.
   Файл идемпотентный, прогонять можно сколько угодно раз в любом
   состоянии базы.
2. **Edge Functions.** По одной команде на каждую:

   ```
   supabase functions deploy auth-helper
   supabase functions deploy delete-account
   supabase functions deploy send-push
   supabase functions deploy tournament
   ```

| Функция | Зачем |
| --- | --- |
| `auth-helper` | вход по имени пользователя, не раскрывая клиенту почту аккаунта |
| `delete-account` | удаление аккаунта (нужен service role) |
| `send-push` | пуши о заявках в друзья и вызовах на бой |
| `tournament` | недельный турнир: регистрация, посев по рейтингу, сведение матчей |

Без задеплоенной `tournament` недельный турнир недоступен, но экран не
падает: он предлагает тренировку — сетку на 32 с ботами на устройстве.

## Отчёты об ошибках (Sentry)

Отчёты о падениях выключены, пока не задан `EXPO_PUBLIC_SENTRY_DSN`. Без
него все вызовы внутри `src/monitoring/sentry.ts` — пустышки, так что
локальная сборка и форк работают как раньше.

Чтобы включить:

1. Заведите проект на [sentry.io](https://sentry.io) (тип — React Native)
   и скопируйте **DSN**. Это публичный ключ: он позволяет только
   отправлять события, поэтому его место рядом с anon-ключом Supabase, а
   не в секретах.
2. Добавьте его в `env` профилей `preview` и `production` в `eas.json`:

   ```json
   "env": {
     "EXPO_PUBLIC_SENTRY_DSN": "https://…@…ingest.sentry.io/…"
   }
   ```

3. Для локального запуска — той же строкой в `.env`.

Стек в отчётах будет минифицированный: читаемым его делает загрузка
source maps, для которой нужен config-плагин `@sentry/react-native/expo`
с вашими `organization` и `project`. Добавлять его до появления проекта
смысла нет — плагин без этих значений ломает сборку.

В отчёт уходят модель устройства, версия системы, версия и номер сборки
приложения и стек ошибки; из аккаунта — только его идентификатор, без
имени пользователя (так написано в политике конфиденциальности, и код
это соблюдает).

## Android

Ничего настраивать не нужно: профиль `preview` даёт APK, который
скачивается по ссылке и ставится на телефон (нужно разрешить установку
из неизвестных источников).

## iOS

APK на iPhone не существует — там `.ipa`, и просто скачать файл нельзя:
iOS запускает только подписанные сборки. Варианты, от бесплатного к
полноценному.

### Expo Go — бесплатно, без аккаунтов

Ставите Expo Go из App Store, на компьютере `npx expo start`, сканируете
QR. Все нативные модули проекта (`expo-haptics`, `expo-image-picker`,
`expo-image-manipulator`, `expo-sharing`, `react-native-view-shot`) входят
в Expo Go, так что работает почти всё — кроме пуш-уведомлений, которых
Expo Go не поддерживает с SDK 53.

Это запуск внутри чужого приложения: своей иконки на экране не будет и
нужен работающий dev-сервер.

### iOS Simulator — бесплатно, нужен Mac

Профиль `simulator` собирает `.app` без всякой подписи и аккаунта Apple.
Запускается только в симуляторе на маке:

```
xcrun simctl install booted /путь/к/AnimeQuiz.app
```

### Apple Developer Program — $99/год, настоящая установка

Единственный способ поставить приложение на iPhone как обычное.

1. Оформите членство в [Apple Developer Program](https://developer.apple.com/programs/).
2. Свяжите аккаунт с EAS — один раз локально, интерактивно:
   ```
   npx eas-cli credentials
   ```
   EAS сам создаст сертификат и provisioning profile и сохранит их у себя;
   после этого сборки в GitHub Actions пойдут без вопросов. **Без этого
   шага сборка iOS упадёт** с `Failed to set up credentials. You're in
   non-interactive mode` — `--non-interactive` в workflow не умеет
   спрашивать пароль от Apple ID. Android при этом соберётся: задачи
   независимы.
3. Дальше:
   - **Ad-hoc** (`preview`): зарегистрируйте UDID устройства
     (`npx eas-cli device:create`), соберите — `.ipa` ставится по ссылке.
     До 100 устройств.
   - **TestFlight** (`production`): соберите, затем
     `npx eas-cli submit --platform ios`. Тестеров до 10 000, ставится как
     обычное приложение, но нужно пройти ревью Apple.

`bundleIdentifier` — `com.animequiz.app`, тот же, что и `package` у
Android. `usesNonExemptEncryption: false` в `app.json` избавляет от
вопроса про экспортные ограничения при каждой загрузке в App Store —
приложение использует только HTTPS, а это исключение из правил.
