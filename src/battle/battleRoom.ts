import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../auth/supabaseClient';
import { RoundConfig } from '../quiz/types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Avoids visually ambiguous characters (0/O, 1/I) since players read this aloud or type it in. */
export function generateRoomCode(length = 5): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export type BattlePeer = { userId: string; username: string };
export type BattleStartPayload = { config: RoundConfig; startAt: number };
export type BattleProgressPayload = { userId: string; answered: number; score: number };
export type BattleFinishPayload = { userId: string; score: number; total: number };

type BattleRoomHandlers = {
  onPeerJoin?: (peer: BattlePeer) => void;
  onPeerLeave?: (peer: BattlePeer) => void;
  onStart?: (payload: BattleStartPayload) => void;
  onProgress?: (payload: BattleProgressPayload) => void;
  onFinish?: (payload: BattleFinishPayload) => void;
};

/**
 * A lightweight wrapper around a Supabase Realtime channel for a single
 * battle room. Uses presence (to know when the opponent has joined/left)
 * and broadcast (to synchronize the quiz start and share live progress) —
 * no database table, since none of this needs to persist past the match.
 */
export class BattleRoom {
  private channel: RealtimeChannel | null = null;

  constructor(
    private roomCode: string,
    private me: BattlePeer
  ) {}

  async connect(handlers: BattleRoomHandlers): Promise<void> {
    const client = supabase!;
    const channel = client.channel(`battle:${this.roomCode}`, {
      config: { presence: { key: this.me.userId } },
    });

    channel
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        for (const p of newPresences as unknown as BattlePeer[]) {
          if (p.userId !== this.me.userId) handlers.onPeerJoin?.(p);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const p of leftPresences as unknown as BattlePeer[]) {
          if (p.userId !== this.me.userId) handlers.onPeerLeave?.(p);
        }
      })
      .on('broadcast', { event: 'start' }, ({ payload }) => handlers.onStart?.(payload as BattleStartPayload))
      .on('broadcast', { event: 'progress' }, ({ payload }) => handlers.onProgress?.(payload as BattleProgressPayload))
      .on('broadcast', { event: 'finish' }, ({ payload }) => handlers.onFinish?.(payload as BattleFinishPayload));

    await new Promise<void>((resolve, reject) => {
      channel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(this.me);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(err ?? new Error('Не удалось подключиться к комнате'));
        }
      });
    });

    this.channel = channel;
  }

  /** Other players currently present in the room (excludes this client). */
  peers(): BattlePeer[] {
    if (!this.channel) return [];
    const state = this.channel.presenceState<BattlePeer>();
    return Object.values(state)
      .flat()
      .filter((p) => p.userId !== this.me.userId);
  }

  broadcastStart(payload: BattleStartPayload) {
    this.channel?.send({ type: 'broadcast', event: 'start', payload });
  }

  broadcastProgress(payload: BattleProgressPayload) {
    this.channel?.send({ type: 'broadcast', event: 'progress', payload });
  }

  broadcastFinish(payload: BattleFinishPayload) {
    this.channel?.send({ type: 'broadcast', event: 'finish', payload });
  }

  leave() {
    this.channel?.unsubscribe();
    this.channel = null;
  }
}
