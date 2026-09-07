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
import { presentLocalNotification } from './localNotify';

type NotificationsContextValue = {
  incomingRequests: Friendship[];
  battleInvites: BattleInvite[];
  badgeCount: number;
  refresh: () => void;
  respondToInvite: (inviteId: string, accept: boolean) => Promise<{ roomCode: string } | null>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [incomingRequests, setIncomingRequests] = useState<Friendship[]>([]);
  const [battleInvites, setBattleInvites] = useState<BattleInvite[]>([]);
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
      refresh,
      respondToInvite,
    }),
    [incomingRequests, battleInvites]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
