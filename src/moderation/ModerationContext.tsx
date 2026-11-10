import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { blockUser, canModerate, fetchBlockedIds, unblockUser } from './moderationApi';

type ModerationValue = {
  /** False on a local-only account: there is nobody to block and no server to tell. */
  available: boolean;
  isBlocked: (userId: string) => boolean;
  /** Resolves to whether it worked, so a screen can say so. */
  block: (userId: string) => Promise<boolean>;
  unblock: (userId: string) => Promise<boolean>;
};

const ModerationContext = createContext<ModerationValue | null>(null);

/**
 * Who this player has blocked, kept where every screen can ask.
 *
 * The server is what stops a blocked person writing; this is only so the
 * app can stop *showing* them — their messages in a shared group, their
 * chat in the list — without each screen fetching the list for itself.
 */
export function ModerationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!profile || !canModerate) {
      setBlocked(new Set());
      return;
    }
    fetchBlockedIds()
      .then((ids) => {
        if (!cancelled) setBlocked(new Set(ids));
      })
      .catch(() => {
        // An unread list shows everybody, which is the safe way to be wrong:
        // the server still refuses a blocked person's messages either way.
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const block = useCallback(async (userId: string) => {
    try {
      await blockUser(userId);
      setBlocked((current) => new Set(current).add(userId));
      return true;
    } catch {
      return false;
    }
  }, []);

  const unblock = useCallback(async (userId: string) => {
    try {
      await unblockUser(userId);
      setBlocked((current) => {
        const next = new Set(current);
        next.delete(userId);
        return next;
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({ available: canModerate && !!profile, isBlocked: (id: string) => blocked.has(id), block, unblock }),
    [blocked, block, unblock, profile]
  );

  return <ModerationContext.Provider value={value}>{children}</ModerationContext.Provider>;
}

export function useModeration(): ModerationValue {
  const ctx = useContext(ModerationContext);
  if (!ctx) throw new Error('useModeration must be used within ModerationProvider');
  return ctx;
}
