import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { useAuth } from '../auth/AuthContext';

type PresenceContextValue = {
  isOnline: (userId: string) => boolean;
};

const PresenceContext = createContext<PresenceContextValue>({ isOnline: () => false });

const PRESENCE_CHANNEL = 'presence:online-players';

/**
 * Tracks which players currently have the app open, via a single shared
 * Supabase Realtime presence channel (same primitive BattleRoom uses for a
 * single room, just app-wide) — no database table, since "online right now"
 * is inherently ephemeral.
 */
export function PresenceProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const meId = profile?.id ?? null;
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOnlineIds(new Set());
    if (!meId || !isSupabaseConfigured || !supabase) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: meId } },
    });

    const syncState = () => {
      setOnlineIds(new Set(Object.keys(channel.presenceState())));
    };

    channel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ onlineAt: Date.now() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [meId]);

  const isOnline = (userId: string) => onlineIds.has(userId);

  return <PresenceContext.Provider value={{ isOnline }}>{children}</PresenceContext.Provider>;
}

export function usePresence(): PresenceContextValue {
  return useContext(PresenceContext);
}
