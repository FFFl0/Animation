export type FrameId = 'bronze' | 'azure' | 'sakura' | 'ember' | 'gold';

export type CosmeticItem<TId extends string> = {
  id: TId;
  /** Matches the level a player reaches each difficulty tier (see
   * src/data/difficulty.ts) — level 1/5/9/13/17 for novice..legend — so
   * unlocking a frame lines up with unlocking the matching tier. */
  unlockLevel: number;
};

export const FRAMES: CosmeticItem<FrameId>[] = [
  { id: 'bronze', unlockLevel: 1 },
  { id: 'azure', unlockLevel: 5 },
  { id: 'sakura', unlockLevel: 9 },
  { id: 'ember', unlockLevel: 13 },
  { id: 'gold', unlockLevel: 17 },
];

export function isFrameUnlocked(id: FrameId, level: number): boolean {
  return level >= FRAMES.find((f) => f.id === id)!.unlockLevel;
}
