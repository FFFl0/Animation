import { Language } from '../i18n/LanguageContext';

export type PolicySection = { title: string; body: string[] };

/**
 * The privacy policy, kept here rather than in a Markdown file because the
 * app has to be able to show it offline and in both languages. PRIVACY.md at
 * the repo root is generated from this — see scripts/generate-privacy.mjs —
 * so the copy a store reviewer reads and the copy in the app cannot drift.
 *
 * When the app starts collecting something new, this is the file to change.
 */
export const POLICY_UPDATED = '2026-09-11';

const RU: PolicySection[] = [
  {
    title: 'Коротко',
    body: [
      'AnimeQuiz — викторина по аниме. Мы храним ровно то, без чего игра и общение с друзьями не работают: имя пользователя, игровую статистику, аватарку и переписку.',
      'Мы не продаём данные, не передаём их рекламным сетям и не показываем рекламу.',
      'Аккаунт можно удалить прямо в приложении — вместе с ним удаляется всё перечисленное ниже.',
    ],
  },
  {
    title: 'Что мы храним',
    body: [
      'Аккаунт: имя пользователя, дата регистрации и пароль в виде хеша (сам пароль мы не видим). Почту указывать не обязательно — она нужна только чтобы восстановить пароль. При входе через Google мы получаем от него адрес почты.',
      'Профиль: аватарка (ваша картинка или одна из готовых), рамка, любимый персонаж, игровая статистика, серия дней и достижения.',
      'Общение: список друзей, личные и групповые сообщения, реакции на них, группы, в которых вы состоите.',
      'Приложение на устройстве: тема оформления, язык, настройки звука и вибрации, недавно использованные эмодзи, включены ли напоминания. Это остаётся на телефоне и никуда не отправляется.',
    ],
  },
  {
    title: 'Что мы НЕ храним',
    body: [
      'Настоящее имя, возраст, пол, номер телефона, адрес и точное местоположение.',
      'Список контактов, содержимое галереи (кроме той картинки, которую вы сами выбрали аватаркой) и историю других приложений.',
      'Рекламные идентификаторы. Мы не следим за вами между приложениями и сайтами.',
    ],
  },
  {
    title: 'Статус «в сети»',
    body: [
      'Пока приложение открыто, друзья видят, что вы в сети. Это не записывается в базу: признак живёт только в памяти сервера, пока держится соединение, и исчезает, когда вы закрываете приложение.',
    ],
  },
  {
    title: 'Уведомления',
    body: [
      'Напоминания о серии дней создаются на самом телефоне и никуда не уходят.',
      'Чтобы доставлять уведомления о заявках в друзья и вызовах на битву при закрытом приложении, мы храним выданный устройству токен уведомлений. Он ни с чем, кроме вашего аккаунта, не связан; уведомления можно отключить в настройках телефона, и тогда токен перестанет использоваться.',
    ],
  },
  {
    title: 'Отчёты об ошибках',
    body: [
      'Если приложение падает, оно может отправить технический отчёт: модель устройства, версия системы, версия приложения и стек ошибки. Отчёт нужен только чтобы починить сбой.',
      'В отчёт не попадают ваши сообщения, пароли и содержимое переписки.',
    ],
  },
  {
    title: 'Кому мы передаём данные',
    body: [
      'Supabase — хранение базы и файлов, вход в аккаунт.',
      'Expo — сборка приложения и доставка push-уведомлений.',
      'Sentry — приём отчётов об ошибках.',
      'Google — только если вы сами выбрали вход через Google.',
      'Это подрядчики, которые обрабатывают данные по нашему поручению. Больше мы данные никому не передаём.',
    ],
  },
  {
    title: 'Сколько мы храним данные',
    body: [
      'Пока существует аккаунт. После удаления аккаунта профиль, статистика, аватарка, дружбы, участие в группах и отправленные вами сообщения удаляются.',
      'Сообщение, которое вы отправили другому человеку, удаляется вместе с вашим аккаунтом и исчезает и у него тоже.',
    ],
  },
  {
    title: 'Ваши права',
    body: [
      'Посмотреть и изменить свои данные — в профиле.',
      'Удалить аккаунт — в профиле, раздел «Удалить аккаунт». Это необратимо и подтверждается отдельно.',
      'Если что-то непонятно или нужна копия данных — напишите на riz_zl@outlook.com.',
    ],
  },
  {
    title: 'Дети',
    body: [
      'Приложение не рассчитано на детей младше 13 лет и не собирает данные о них осознанно. Если вы родитель и считаете, что ребёнок завёл аккаунт, напишите на riz_zl@outlook.com — мы его удалим.',
    ],
  },
  {
    title: 'Изменения',
    body: [
      'Если политика изменится, мы обновим дату вверху этой страницы и, если изменения существенные, сообщим в приложении.',
    ],
  },
];

const EN: PolicySection[] = [
  {
    title: 'In short',
    body: [
      'AnimeQuiz is an anime trivia game. We keep exactly what the game and talking to friends need: your username, your game stats, your avatar and your messages.',
      'We do not sell your data, hand it to ad networks, or show ads.',
      'You can delete your account from inside the app, and everything listed below goes with it.',
    ],
  },
  {
    title: 'What we store',
    body: [
      'Account: username, sign-up date, and your password as a hash (we never see the password itself). An email address is optional and only used to reset a password. If you sign in with Google, we receive your email address from them.',
      'Profile: avatar (your own picture or one of the ready-made ones), frame, favourite character, game stats, day streak and achievements.',
      'Talking: your friends, direct and group messages, reactions to them, and the groups you belong to.',
      'On the device: theme, language, sound and vibration settings, recently used emoji, whether reminders are on. This stays on your phone and is never sent anywhere.',
    ],
  },
  {
    title: 'What we do NOT store',
    body: [
      'Your real name, age, gender, phone number, address or precise location.',
      'Your contacts, your photo gallery (beyond the one picture you chose as an avatar), or what other apps you use.',
      'Advertising identifiers. We do not track you across apps or websites.',
    ],
  },
  {
    title: 'Online status',
    body: [
      'While the app is open your friends can see that you are online. This is not written to the database: it lives in server memory for as long as the connection holds and disappears when you close the app.',
    ],
  },
  {
    title: 'Notifications',
    body: [
      'Streak reminders are created on the phone itself and are never sent anywhere.',
      'To deliver friend requests and battle invites while the app is closed, we store the notification token your device was issued. It is tied to nothing but your account; turn notifications off in your phone settings and the token stops being used.',
    ],
  },
  {
    title: 'Crash reports',
    body: [
      'If the app crashes it may send a technical report: device model, OS version, app version and the error stack. It exists only so the crash can be fixed.',
      'Your messages, passwords and conversation contents are not part of a report.',
    ],
  },
  {
    title: 'Who else sees the data',
    body: [
      'Supabase — database and file storage, signing in.',
      'Expo — building the app and delivering push notifications.',
      'Sentry — receiving crash reports.',
      'Google — only if you chose to sign in with Google.',
      'These are contractors processing data on our behalf. We share it with nobody else.',
    ],
  },
  {
    title: 'How long we keep it',
    body: [
      'For as long as the account exists. Deleting the account removes the profile, stats, avatar, friendships, group memberships and the messages you sent.',
      'A message you sent to somebody else is deleted along with your account and disappears on their side too.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'See and change your data — in the profile.',
      'Delete the account — in the profile, "Delete account". It cannot be undone and is confirmed separately.',
      'If something is unclear or you want a copy of your data, write to riz_zl@outlook.com.',
    ],
  },
  {
    title: 'Children',
    body: [
      'The app is not aimed at children under 13 and does not knowingly collect data about them. If you are a parent and believe your child made an account, write to riz_zl@outlook.com and we will remove it.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'If this policy changes we will update the date at the top of this page, and tell you in the app if the change is significant.',
    ],
  },
];

export function privacyPolicy(lang: Language): PolicySection[] {
  return lang === 'en' ? EN : RU;
}
