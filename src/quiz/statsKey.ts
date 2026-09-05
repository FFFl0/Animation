import { CategoryId } from '../data/categories';
import { TierId } from '../data/difficulty';
import { ModeId } from '../data/modes';
import { ModeStat, Profile, ZERO_STAT } from '../auth/types';

export function categoryStatsKey(categoryId: CategoryId, tier?: TierId): string {
  return tier ? `cat:${categoryId}:${tier}` : `cat:${categoryId}`;
}

export function modeStatsKey(modeId: ModeId): string {
  return `mode:${modeId}`;
}

export function getStat(profile: Profile, key: string): ModeStat {
  return profile.stats[key] ?? ZERO_STAT;
}
