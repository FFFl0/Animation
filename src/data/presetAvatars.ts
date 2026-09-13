import { ImageSourcePropType } from 'react-native';

/** Ready-made pictures shipped with the app, for players who would rather
 * pick one than upload something of their own. */
export type PresetAvatarId = 'manga' | 'ramen' | 'pixel';

export const PRESET_AVATAR_IDS: PresetAvatarId[] = ['manga', 'ramen', 'pixel'];

// Metro requires string-literal paths, so this is a hand-written lookup table
// (mirrors src/data/cosmeticImages.ts) rather than a dynamic resolver.
export const PRESET_AVATAR_IMAGES: Record<PresetAvatarId, ImageSourcePropType> = {
  manga: require('../../assets/avatars/manga.png'),
  ramen: require('../../assets/avatars/ramen.png'),
  pixel: require('../../assets/avatars/pixel.png'),
};

/** Guards against a preset id saved by a newer build of the app: an unknown
 * one falls back to the initial placeholder instead of crashing the render. */
export function isPresetAvatarId(value: unknown): value is PresetAvatarId {
  return typeof value === 'string' && (PRESET_AVATAR_IDS as string[]).includes(value);
}
