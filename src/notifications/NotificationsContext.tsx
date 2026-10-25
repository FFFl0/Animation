import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
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

type NotificationsContextValue = {
  incomingRequests: Friendship[];
  battleInvites: BattleInvite[];
  /** Friend requests and battle invites — what the Friends screen answers. */
  badgeCount: number;
  /** Unread messages across every chat, for the Chats tab badge. */
  unreadMessages: number;
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
    // Re-registered on every sign-in and language change: the token can be
    // reissued by the OS, and the server needs to know which language to
    // write the notification in.
    registerPushToken(meId, language);

    const t = getT(language);
    const unsubFriend = subscribeIncomingFriendRequests(meId, () => {
      getIncomingFriendRequests(meId).then(setIncomingRequests);
      presentLocalNotification(t('notifications.friendRequestTitle'), t('notifications.friendRequestBody'));
    });
    const unsubBattle = subscribeBattleInvites(meId, () => {
      getPendingBattleInvites(meId).then(setBattleInvites);
      presentLocalNotification(t('notifications.battleInviteTitle'), t('notifications.battleInviteBody'));
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
      refresh,
      respondToInvite,
    }),
    [incomingRequests, battleInvites, unreadMessages]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
