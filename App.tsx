import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, Modal, Platform, ToastAndroid, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { useFonts } from '@expo-google-fonts/manrope/useFonts';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { NotificationsProvider } from './src/notifications/NotificationsContext';
import { PresenceProvider } from './src/presence/PresenceContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LanguageProvider, useLanguage } from './src/i18n/LanguageContext';
import { SoundProvider, useSound } from './src/sound/SoundContext';
import BottomTabBar, { TabKey } from './src/components/BottomTabBar';
import AchievementToastHost from './src/components/AchievementToast';
import OnboardingTour from './src/components/OnboardingTour';
import ResponsiveShell from './src/components/ResponsiveShell';
import WelcomeScreen from './src/screens/WelcomeScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoryDetailScreen from './src/screens/CategoryDetailScreen';
import QuizScreen, { RoundOutcome } from './src/screens/QuizScreen';
import ResultScreen from './src/screens/ResultScreen';
import StatsScreen from './src/screens/StatsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import CategoryStatsScreen from './src/screens/CategoryStatsScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import BattleScreen from './src/screens/BattleScreen';
import { useBattleInviteLink } from './src/battle/useBattleInviteLink';
import TournamentScreen, { WEEKLY_MATCH_CONFIG } from './src/screens/TournamentScreen';
import ShopScreen from './src/screens/ShopScreen';
import { ShopTab } from './src/shop/catalogue';
import ShopItemScreen from './src/screens/ShopItemScreen';
import CartScreen from './src/screens/CartScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import { ShopProvider, useShop } from './src/shop/ShopContext';
import FriendsScreen from './src/screens/FriendsScreen';
import FriendProfileScreen from './src/screens/FriendProfileScreen';
import CompareScreen from './src/screens/CompareScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatsScreen from './src/screens/ChatsScreen';
import { useLastSeenHeartbeat } from './src/chat/presence';
import GroupsScreen from './src/screens/GroupsScreen';
import GroupChatScreen from './src/screens/GroupChatScreen';
import AboutScreen from './src/screens/AboutScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import { Friendship, PlayerSummary } from './src/friends/friendsApi';
import { identifyForCrashReports } from './src/monitoring/sentry';
import { ChatGroup } from './src/chat/groupApi';
import { CategoryId, getCategory, categoryTitle } from './src/data/categories';
import { TierId, getTier, tierLabel } from './src/data/difficulty';
import { GAME_MODES, ModeId, getMode, modeTitle } from './src/data/modes';
import { categoryStatsKey, getStat } from './src/quiz/statsKey';
import { RoundConfig } from './src/quiz/types';
import { Achievement } from './src/data/achievements';
import { dateSeed } from './src/quiz/generateQuiz';
import { todayDateStr } from './src/quiz/today';
import { parseRecoveryUrl, parseAuthTokensFromUrl, RecoveryTokens } from './src/auth/parseRecoveryUrl';
import ErrorBoundary from './src/monitoring/ErrorBoundary';
import CrashScreen from './src/monitoring/CrashScreen';
import BareCrashScreen from './src/monitoring/BareCrashScreen';
import { useT } from './src/i18n/strings';
import { Screen, TAB_SCREENS, TransitionDirection, transitionDirection } from './src/navigation/screens';



/** How far the incoming screen travels, in points. */
const SLIDE_DISTANCE = 30;

/**
 * The movement between screens.
 *
 * Only the arriving screen is animated: the one being left is already gone,
 * because screens here are mounted one at a time. Keeping the old one around
 * to slide it out would mean two screens subscribed to the same realtime
 * channels at once, which is exactly the thing that used to close the app.
 *
 * What it does have is a direction. Going deeper, the new screen comes in
 * from the right; coming back out, from the left; and a move between two
 * screens at the same level is a cross-fade with a small lift, because
 * neither of them is on top of the other.
 */
function ScreenTransition({
  children,
  transitionKey,
  direction,
}: {
  children: React.ReactNode;
  transitionKey: string;
  direction: TransitionDirection;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      // Quick off the mark and settling at the end, the way a page being
      // pushed into place behaves.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey]);

  const fromX = direction === 'forward' ? SLIDE_DISTANCE : direction === 'back' ? -SLIDE_DISTANCE : 0;
  const fromY = direction === 'swap' ? 10 : 0;

  return (
    <Animated.View
      style={{
        flex: 1,
        // Fully opaque before it has finished moving, so the screen is
        // readable while it is still settling.
        opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [fromX, 0] }) },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Which way the app moved to reach the screen now showing.
 *
 * Worked out during render and cached, rather than recomputed from a ref
 * that an effect updates later: an unrelated re-render in the middle of the
 * animation would otherwise change the direction under it and make the
 * screen jump sideways halfway through.
 */
function useTransitionDirection(screen: Screen): TransitionDirection {
  const previous = useRef<Screen | null>(null);
  const direction = useRef<TransitionDirection>('swap');

  if (previous.current !== screen) {
    direction.current = transitionDirection(previous.current, screen);
    previous.current = screen;
  }

  return direction.current;
}

function AppShell() {
  const { profile, loading, recordRoundResult } = useAuth();
  const { countOf, spendConsumable } = useShop();
  const { theme, resolvedScheme } = useTheme();
  const { setMusicContext } = useSound();
  const t = useT();
  const { language } = useLanguage();

  // The policy has to be readable before signing up — that is the moment
  // somebody is agreeing to it — and the signed-in navigation is not mounted
  // yet at that point, hence its own state rather than a Screen.
  const [preAuthScreen, setPreAuthScreen] = useState<'welcome' | 'auth' | 'privacy'>('welcome');
  const [screen, setScreen] = useState<Screen>('home');
  const [shopItemId, setShopItemId] = useState<string | null>(null);
  // The shop's open tab lives here, not in the screen: the screen unmounts
  // while an item is on top of it, so coming back would otherwise always
  // land on the first tab instead of the shelf the shopper was browsing.
  const [shopTab, setShopTab] = useState<ShopTab>('all');
  const [shopScrollY, setShopScrollY] = useState(0);
  // Home and stats are unmounted whenever a quiz, a mode or a category page
  // is on top of them, so where the player had scrolled to has to be kept
  // out here with the rest of the navigation state.
  const [homeScrollY, setHomeScrollY] = useState(0);
  const [statsScrollY, setStatsScrollY] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  // A category's difficulty picker is reached from the home grid and from
  // its own stats page, so Back has to return to the one that opened it.
  const [categoryFrom, setCategoryFrom] = useState<Screen>('home');
  const [roundConfig, setRoundConfig] = useState<RoundConfig | null>(null);
  const [activeModeId, setActiveModeId] = useState<ModeId | null>(null);
  const [quizKey, setQuizKey] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    total: number;
    isRecord: boolean;
    contextLabel: string;
    averageAnswerMs: number | null;
    lost: boolean;
  }>({ score: 0, total: 0, isRecord: false, contextLabel: '', averageAnswerMs: null, lost: false });
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<PlayerSummary | null>(null);
  const [selectedFriendship, setSelectedFriendship] = useState<Friendship | null>(null);
  const [challengeFriend, setChallengeFriend] = useState<PlayerSummary | null>(null);
  const [autoJoinRoomCode, setAutoJoinRoomCode] = useState<string | null>(null);
  // A battle is reachable from home, a friend's profile, the leaderboard, an
  // accepted invite and an invite link, so Back has to return to whichever
  // one it actually came from — the link especially, which has no friend
  // profile behind it to go back to.
  const [battleFrom, setBattleFrom] = useState<Screen>('home');
  const [invitedRoomCode, setInvitedRoomCode] = useState<string | null>(null);
  // Bumped every time an invite link is opened, so the battle screen is
  // rebuilt even when the link points at the room it is already set to.
  const [battleMountKey, setBattleMountKey] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [privacyFrom, setPrivacyFrom] = useState<Screen>('profile');
  // A conversation is reachable from the chat list and from a friend's
  // profile (and a group from the list and from the groups screen), so Back
  // has to return to wherever it was actually opened from.
  const [chatFrom, setChatFrom] = useState<Screen>('chats');
  const [groupChatFrom, setGroupChatFrom] = useState<Screen>('chats');
  const lastBackPressRef = useRef(0);

  // Marks the account as present while the app is open, so friends see
  // "online" in chat instead of a timestamp from last week.
  useLastSeenHeartbeat(profile?.id ?? null);

  // Up here with the other hooks, not down beside the render that uses it:
  // the loading and signed-out screens below return early, and a hook after
  // them would not run on every render.
  const direction = useTransitionDirection(screen);

  // An invite link can land before there is anyone to join as — tapping it is
  // often what makes somebody install the app in the first place — so the code
  // is held here and spent once the sign-in is done.
  useBattleInviteLink(setInvitedRoomCode);

  useEffect(() => {
    setScreen('home');
    setPreAuthScreen('welcome');
  }, [profile?.id]);

  // Declared after the reset above on purpose: switching accounts sends the
  // app back to home, and an invite waiting to be opened has to be applied
  // after that, not before it.
  useEffect(() => {
    if (!invitedRoomCode || !profile) return;
    setInvitedRoomCode(null);
    setChallengeFriend(null);
    setAutoJoinRoomCode(invitedRoomCode);
    setBattleFrom('home');
    setBattleMountKey((n) => n + 1);
    setScreen('battle');
  }, [invitedRoomCode, profile]);

  // Only the opaque account id, never the username — the policy says reports
  // carry nothing personal, and this is where that has to hold.
  useEffect(() => {
    identifyForCrashReports(profile?.id ?? null);
  }, [profile?.id]);

  useEffect(() => {
    if (screen !== 'quiz') {
      setMusicContext('menu');
      return;
    }
    // Theme clips carry their own soundtrack — two at once is just noise.
    const playsVideo = roundConfig?.categoryId === 'openings' || roundConfig?.forceType === 'guessSeriesByVideo';
    setMusicContext(playsVideo ? 'silent' : 'quiz');
  }, [screen, roundConfig, setMusicContext]);

  // Android hardware/gesture back button: without this, RN's default
  // behavior is to close the whole app from any screen. Route it through
  // the same back destinations the on-screen back buttons already use, and
  // require a second press on the true home screen before actually exiting.
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (!profile) {
        if (preAuthScreen === 'privacy') {
          setPreAuthScreen('auth');
          return true;
        }
        if (preAuthScreen === 'auth') {
          setPreAuthScreen('welcome');
          return true;
        }
        return false;
      }

      switch (screen) {
        case 'battle':
          setChallengeFriend(null);
          setAutoJoinRoomCode(null);
          setScreen(battleFrom);
          return true;
        case 'tournament':
        case 'shop':
          setScreen('home');
          return true;
        case 'shopItem':
        case 'orders':
          setScreen('shop');
          return true;
        case 'cart':
          setScreen(shopItemId ? 'shopItem' : 'shop');
          return true;
        case 'friendProfile':
          setScreen('friends');
          return true;
        case 'chat':
          setScreen(chatFrom);
          return true;
        case 'compare':
          setScreen('friendProfile');
          return true;
        case 'groupChat':
          setScreen(groupChatFrom);
          return true;
        case 'groups':
          setScreen('friends');
          return true;
        case 'privacy':
          // Reachable from both the profile and About, so go back to
          // whichever opened it rather than always to one of them.
          setScreen(privacyFrom);
          return true;
        case 'about':
          setScreen('profile');
          return true;
        case 'categoryDetail':
          setScreen(categoryFrom);
          return true;
        case 'categoryStats':
        case 'achievements':
          setScreen('stats');
          return true;
        case 'quiz':
        case 'result':
          setScreen('home');
          return true;
        case 'leaderboard':
          setScreen('stats');
          return true;
        case 'friends':
          setScreen('chats');
          return true;
        case 'chats':
        case 'stats':
        case 'profile':
          setScreen('home');
          return true;
        case 'home': {
          const now = Date.now();
          if (now - lastBackPressRef.current < 2000) {
            BackHandler.exitApp();
            return true;
          }
          lastBackPressRef.current = now;
          ToastAndroid.show(t('common.pressBackAgainToExit'), ToastAndroid.SHORT);
          return true;
        }
        default:
          return false;
      }
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [profile, preAuthScreen, screen, battleFrom, categoryFrom, chatFrom, groupChatFrom, t]);

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
          <AuthScreen
            onBack={() => setPreAuthScreen('welcome')}
            onOpenPrivacy={() => setPreAuthScreen('privacy')}
          />
        )}

        {/* Over the auth screen rather than instead of it: reading the policy
            is something you do mid-signup, and unmounting the form would
            throw away the name and password already typed into it. */}
        <Modal
          visible={preAuthScreen === 'privacy'}
          animationType="slide"
          onRequestClose={() => setPreAuthScreen('auth')}
        >
          <PrivacyScreen onBack={() => setPreAuthScreen('auth')} />
        </Modal>
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

  /** What the round was, for the shared image: the mode if one was picked,
   * otherwise the category with its difficulty. */
  const describeRound = (config: RoundConfig, modeId: ModeId | null) => {
    if (modeId === 'daily') return t('result.dailyContext');
    if (modeId) return modeTitle(getMode(modeId), language);
    const category = categoryTitle(getCategory(config.categoryId), language);
    return config.tier ? `${category} · ${tierLabel(getTier(config.tier), language)}` : category;
  };

  const finishQuiz = async (score: number, total: number, outcome: RoundOutcome) => {
    // Read the old best before recording, or the round just played would
    // already have overwritten what we are comparing against.
    const previousBest =
      profile && roundConfig ? getStat(profile, categoryStatsKey(roundConfig.categoryId, roundConfig.tier)).bestScore : 0;

    setResult({
      score,
      total,
      // A run that ended on a lost life is not a record whatever the score:
      // it did not finish.
      isRecord: score > previousBest && score > 0 && !outcome.lost,
      contextLabel: roundConfig ? describeRound(roundConfig, activeModeId) : '',
      averageAnswerMs: outcome.averageAnswerMs,
      lost: outcome.lost,
    });

    if (roundConfig) {
      // A streak freeze is offered to the streak, and only spent if the
      // streak actually needed rescuing.
      const { unlocked, freezeUsed } = await recordRoundResult(
        roundConfig,
        activeModeId,
        score,
        total,
        countOf('streakFreeze') > 0
      );
      if (freezeUsed) spendConsumable('streakFreeze');
      if (unlocked.length) setAchievementQueue((q) => [...q, ...unlocked]);
    }
    setScreen('result');
  };

  const restart = () => {
    setQuizKey((k) => k + 1);
    setScreen('quiz');
  };

  /**
   * Going to a tab from the bar starts that page at the top.
   *
   * The remembered offset exists for coming back out of something opened
   * from the page — a category, a shop item, a quiz — where losing your
   * place is the annoyance. Reaching for a tab is the other thing: it is
   * going somewhere, and somewhere starts at the beginning. Only the taps
   * on the bar come through here, so the Back buttons and the Android back
   * gesture keep their place as before.
   */
  const openTab = (tab: TabKey) => {
    if (tab === 'home') setHomeScrollY(0);
    else if (tab === 'stats') setStatsScrollY(0);
    else if (tab === 'shop') setShopScrollY(0);
    setScreen(tab);
  };

  const showTabBar = TAB_SCREENS.includes(screen);
  const transitionKey = screen === 'quiz' ? `quiz-${quizKey}` : screen;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        <ScreenTransition transitionKey={transitionKey} direction={direction}>
          {screen === 'home' && (
            <HomeScreen
              scrollY={homeScrollY}
              onChangeScrollY={setHomeScrollY}
              onOpenCategory={(id) => {
                setSelectedCategory(id);
                setCategoryFrom('home');
                setScreen('categoryDetail');
              }}
              onStartMode={startMode}
              onOpenSettings={() => setScreen('profile')}
              onOpenBattle={() => {
                setBattleFrom('home');
                setScreen('battle');
              }}
              onOpenTournament={() => setScreen('tournament')}
            />
          )}
          {screen === 'shop' && (
            <ShopScreen
              tab={shopTab}
              onChangeTab={setShopTab}
              scrollY={shopScrollY}
              onChangeScrollY={setShopScrollY}
              onBack={() => setScreen('home')}
              onOpenItem={(id) => {
                setShopItemId(id);
                setScreen('shopItem');
              }}
              onOpenCart={() => setScreen('cart')}
              onOpenOrders={() => setScreen('orders')}
            />
          )}

          {screen === 'shopItem' && shopItemId && (
            <ShopItemScreen
              itemId={shopItemId}
              onBack={() => setScreen('shop')}
              onOpenCart={() => setScreen('cart')}
            />
          )}

          {screen === 'cart' && (
            <CartScreen
              onBack={() => setScreen(shopItemId ? 'shopItem' : 'shop')}
              onOrdered={() => setScreen('orders')}
            />
          )}

          {screen === 'orders' && (
            <OrdersScreen
              onBack={() => setScreen('shop')}
              onOpenItem={(id) => {
                setShopItemId(id);
                setScreen('shopItem');
              }}
            />
          )}

          {screen === 'tournament' && (
            <TournamentScreen
              onBack={() => setScreen('home')}
              onMatchPlayed={async (score, total) => {
                // A tournament game is still seven real questions, so it feeds
                // stats, XP and achievements like any other round.
                const { unlocked, freezeUsed } = await recordRoundResult(
                  WEEKLY_MATCH_CONFIG,
                  null,
                  score,
                  total,
                  countOf('streakFreeze') > 0
                );
                if (freezeUsed) spendConsumable('streakFreeze');
                if (unlocked.length) setAchievementQueue((q) => [...q, ...unlocked]);
              }}
            />
          )}

          {screen === 'battle' && (
            <BattleScreen
              // Keyed by the invite it was opened for, so a link tapped
              // while a battle is already on screen joins the room it points
              // at instead of being swallowed by the mounted one.
              key={`${autoJoinRoomCode ?? 'fresh'}-${battleMountKey}`}
              onBack={() => {
                setChallengeFriend(null);
                setAutoJoinRoomCode(null);
                setScreen(battleFrom);
              }}
              challengeFriend={challengeFriend ?? undefined}
              autoJoinRoomCode={autoJoinRoomCode ?? undefined}
            />
          )}
          {screen === 'chats' && (
            <ChatsScreen
              onOpenDirect={(player) => {
                setSelectedFriend(player);
                setSelectedFriendship(null);
                setChatFrom('chats');
                setScreen('chat');
              }}
              onOpenGroup={(group) => {
                setSelectedGroup(group);
                setGroupChatFrom('chats');
                setScreen('groupChat');
              }}
              onOpenContacts={() => setScreen('friends')}
            />
          )}

          {screen === 'friends' && (
            <FriendsScreen
              onBack={() => setScreen('chats')}
              onOpenFriend={(player, friendship) => {
                setSelectedFriend(player);
                setSelectedFriendship(friendship);
                setScreen('friendProfile');
              }}
              onAcceptBattleInvite={(roomCode) => {
                setAutoJoinRoomCode(roomCode);
                setBattleFrom('friends');
                setScreen('battle');
              }}
              onOpenGroups={() => setScreen('groups')}
            />
          )}

          {screen === 'about' && (
            <AboutScreen
              onBack={() => setScreen('profile')}
              onOpenPrivacy={() => {
                setPrivacyFrom('about');
                setScreen('privacy');
              }}
            />
          )}

          {screen === 'privacy' && <PrivacyScreen onBack={() => setScreen(privacyFrom)} />}

          {screen === 'groups' && (
            <GroupsScreen
              onBack={() => setScreen('friends')}
              onOpenGroup={(group) => {
                setSelectedGroup(group);
                setGroupChatFrom('groups');
                setScreen('groupChat');
              }}
            />
          )}

          {screen === 'groupChat' && selectedGroup && (
            <GroupChatScreen
              group={selectedGroup}
              onBack={() => setScreen(groupChatFrom)}
              onLeft={() => {
                setSelectedGroup(null);
                setScreen(groupChatFrom);
              }}
            />
          )}
          {screen === 'friendProfile' && selectedFriend && (
            <FriendProfileScreen
              player={selectedFriend}
              friendship={selectedFriendship}
              onBack={() => setScreen('friends')}
              onCompare={() => setScreen('compare')}
              onOpenChat={() => {
                setChatFrom('friendProfile');
                setScreen('chat');
              }}
              onChallenge={() => {
                setChallengeFriend(selectedFriend);
                setBattleFrom('friendProfile');
                setScreen('battle');
              }}
            />
          )}
          {screen === 'chat' && selectedFriend && (
            <ChatScreen friend={selectedFriend} onBack={() => setScreen(chatFrom)} />
          )}
          {screen === 'compare' && selectedFriend && (
            <CompareScreen
              friend={selectedFriend}
              onBack={() => setScreen('friendProfile')}
              onChallenge={() => {
                setChallengeFriend(selectedFriend);
                setBattleFrom('compare');
                setScreen('battle');
              }}
            />
          )}
          {screen === 'categoryDetail' && selectedCategory && (
            <CategoryDetailScreen
              categoryId={selectedCategory}
              onBack={() => setScreen(categoryFrom)}
              onStartTier={startTier}
            />
          )}
          {screen === 'categoryStats' && selectedCategory && (
            <CategoryStatsScreen
              categoryId={selectedCategory}
              onBack={() => setScreen('stats')}
              onPlay={() => {
                setCategoryFrom('categoryStats');
                setScreen('categoryDetail');
              }}
            />
          )}
          {screen === 'quiz' && roundConfig && (
            <QuizScreen key={quizKey} config={roundConfig} onFinish={finishQuiz} onClose={() => setScreen('home')} />
          )}
          {screen === 'result' && (
            <ResultScreen
              score={result.score}
              total={result.total}
              isRecord={result.isRecord}
              contextLabel={result.contextLabel}
              averageAnswerMs={result.averageAnswerMs}
              lost={result.lost}
              onRestart={restart}
              onChooseCategory={() => setScreen('home')}
            />
          )}
          {screen === 'stats' && (
            <StatsScreen
              scrollY={statsScrollY}
              onChangeScrollY={setStatsScrollY}
              onOpenAchievements={() => setScreen('achievements')}
              onOpenLeaderboard={() => setScreen('leaderboard')}
              onOpenCategory={(id) => {
                setSelectedCategory(id);
                setScreen('categoryStats');
              }}
            />
          )}
          {screen === 'leaderboard' && (
            <LeaderboardScreen
              onBack={() => setScreen('stats')}
              onOpenChat={(player) => {
                setSelectedFriend(player);
                setSelectedFriendship(null);
                setChatFrom('leaderboard');
                setScreen('chat');
              }}
              onChallenge={(player) => {
                setSelectedFriend(player);
                setSelectedFriendship(null);
                setChallengeFriend(player);
                setBattleFrom('leaderboard');
                setScreen('battle');
              }}
            />
          )}
          {screen === 'achievements' && <AchievementsScreen onBack={() => setScreen('stats')} />}
          {screen === 'profile' && (
            <ProfileScreen
              onOpenShop={() => {
                setShopTab('all');
                setShopScrollY(0);
                setScreen('shop');
              }}
              onOpenAbout={() => setScreen('about')}
              onOpenPrivacy={() => {
                setPrivacyFrom('profile');
                setScreen('privacy');
              }}
            />
          )}
        </ScreenTransition>
      </View>
      {showTabBar && (
        <BottomTabBar
          active={screen as TabKey}
          onChange={(tab: TabKey) => {
            openTab(tab);
          }}
          theme={theme}
        />
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
    // Two boundaries, because the fallback needs what it is protecting. The
    // inner one is inside the providers, so it can be themed and translated,
    // and it covers the screens — which is where crashes come from. The outer
    // one catches a provider failing to start, where none of that is
    // available, and falls back to something hard-coded.
    <ErrorBoundary area="root" fallback={(_error, retry) => <BareCrashScreen onRetry={retry} />}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SoundProvider>
              <AuthProvider>
                <ShopProvider>
                <PresenceProvider>
                  <NotificationsProvider>
                    <ResponsiveShell>
                      <DeepLinkGate>
                        {/* Recovery works by remounting: React has already
                            unmounted everything below, so rendering again
                            builds a fresh shell on its first screen, while the
                            providers above keep the player signed in. */}
                        <ErrorBoundary
                          area="screens"
                          fallback={(error, retry) => <CrashScreen error={error} onRetry={retry} />}
                        >
                          <AppShell />
                        </ErrorBoundary>
                      </DeepLinkGate>
                    </ResponsiveShell>
                  </NotificationsProvider>
                </PresenceProvider>
                </ShopProvider>
              </AuthProvider>
            </SoundProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
