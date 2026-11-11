import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getT } from '../i18n/strings';
import { Friendship } from '../friends/friendsApi';
import {
  BattleInvite,
  getIncomingFriendRequests,
  getPendingBattleInvites,
  isSupabaseConfigured,
  respondToBattleInvite,
  subscribeBattleInvites,
  subscribeIncomingFriendRequests,
} from './notificationsApi';
import { countUnread, subscribeChatList } from '../chat/chatsApi';
import { presentLocalNotification } from './localNotify';
import { registerPushToken } from './pushTokens';
import {
  ALL_ON,
  PushCategory,
  PushSettings,
  allows,
  loadPushSettings,
  mutedCategories,
  savePushSettings,
} from './notificationSettings';

type NotificationsContextValue = {
  incomingRequests: Friendship[];
  battleInvites: BattleInvite[];
  /** Friend requests and battle invites — what the Friends screen answers. */
  badgeCount: number;
  /** Unread messages across every chat, for the Chats tab badge. */
  unreadMessages: number;
  /** Which kinds of notification this device still wants. */
  pushSettings: PushSettings;
  setPushCategory: (category: PushCategory, on: boolean) => void;
  refresh: () => void;
  respondToInvite: (inviteId: string, accept: boolean) => Promise<{ roomCode: string } | null>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [incomingRequests, setIncomingRequests] = useState<Friendship[]>([]);
  const [battleInvites, setBattleInvites] = useState<BattleInvite[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const meId = profile?.id ?? null;
  const [pushSettings, setPushSettings] = useState<PushSettings>(ALL_ON);
  /** False until the saved switches are read, so a sign-in that beats the
   * disk does not tell the server that nothing is muted. */
  const [settingsReady, setSettingsReady] = useState(false);
  /** The same settings for the realtime callbacks below, which outlive the
   * render that subscribed them. */
  const settingsRef = useRef(pushSettings);
  settingsRef.current = pushSettings;

  useEffect(() => {
    void loadPushSettings().then((saved) => {
      setPushSettings(saved);
      setSettingsReady(true);
    });
  }, []);

  const setPushCategory = useCallback((category: PushCategory, on: boolean) => {
    const next = { ...settingsRef.current, [category]: on };
    settingsRef.current = next;
    setPushSettings(next);
    void savePushSettings(next);
  }, []);

  // Re-registered on every sign-in, language change and flip of a switch:
  // the token can be reissued by the OS, and the server needs to know which
  // language to write in and which notices this device has asked not to get.
  const muted = mutedCategories(pushSettings).join(',');
  useEffect(() => {
    if (!meId || !isSupabaseConfigured || !settingsReady) return;
    void registerPushToken(meId, language, mutedCategories(settingsRef.current));
  }, [meId, language, settingsReady, muted]);

  const refresh = () => {
    if (!meId || !isSupabaseConfigured) return;
    getIncomingFriendRequests(meId).then(setIncomingRequests);
    getPendingBattleInvites(meId).then(setBattleInvites);
  };

  useEffect(() => {
    setIncomingRequests([]);
    setBattleInvites([]);
    if (!meId || !isSupabaseConfigured) return;

    getIncomingFriendRequests(meId).then(setIncomingRequests);
    getPendingBattleInvites(meId).then(setBattleInvites);

    const t = getT(language);
    const unsubFriend = subscribeIncomingFriendRequests(meId, () => {
      getIncomingFriendRequests(meId).then(setIncomingRequests);
      // The badge still counts it; a muted category only stops the banner.
      if (!allows(settingsRef.current, 'friendRequest')) return;
      presentLocalNotification(t('notifications.friendRequestTitle'), t('notifications.friendRequestBody'), {
        kind: 'friendRequest',
      });
    });
    const unsubBattle = subscribeBattleInvites(meId, () => {
      getPendingBattleInvites(meId).then(setBattleInvites);
      if (!allows(settingsRef.current, 'battleInvite')) return;
      presentLocalNotification(t('notifications.battleInviteTitle'), t('notifications.battleInviteBody'), {
        kind: 'battleInvite',
      });
    });
    return () => {
      unsubFriend();
      unsubBattle();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId]);

  // Kept apart from the effect above: the unread count has to follow every
  // message in every chat, while requests and invites only move when their
  // own tables do.
  useEffect(() => {
    setUnreadMessages(0);
    if (!meId || !isSupabaseConfigured) return;

    let alive = true;
    const reload = () => {
      void countUnread(meId).then((n) => {
        if (alive) setUnreadMessages(n);
      });
    };
    reload();
    const unsubscribe = subscribeChatList(reload);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [meId]);

  const respondToInvite = async (inviteId: string, accept: boolean): Promise<{ roomCode: string } | null> => {
    const invite = battleInvites.find((i) => i.id === inviteId);
    await respondToBattleInvite(inviteId, accept);
    refresh();
    return accept && invite ? { roomCode: invite.roomCode } : null;
  };

  const value = useMemo(
    () => ({
      incomingRequests,
      battleInvites,
      badgeCount: incomingRequests.length + battleInvites.length,
      unreadMessages,
      pushSettings,
      setPushCategory,
      refresh,
      respondToInvite,
    }),
    [incomingRequests, battleInvites, unreadMessages, pushSettings, setPushCategory]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
