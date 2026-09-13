import { FrameId } from './cosmetics';
import { PresetAvatarId } from './presetAvatars';

export type HairStyle = 'long' | 'twin' | 'bob' | 'short' | 'spiky' | 'ponytail';

export type Avatar = {
  /** The picture the player picked for themselves — a small square JPEG
   * stored inline as a `data:` URI (see src/avatar/photoPicker.ts). Absent
   * means they haven't added one yet and the app shows a plain initial
   * instead: player avatars are never drawn procedurally any more. */
  photoUri?: string;
  /** One of the ready-made pictures shipped with the app, picked instead of
   * uploading one. Mutually exclusive with `photoUri`. */
  presetId?: PresetAvatarId;
  /** Frame unlocked by player level — absent means "none equipped". */
  frameId?: FrameId;
  /** The rest only describes the 54 fixed roster characters: their portraits
   * are pre-rendered PNGs, but the "silhouette" and "eyes" quiz modes still
   * redraw them from these traits (see src/components/AnimeAvatar.tsx). */
  hairStyle: HairStyle;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  accent: string;
};

const HAIR_STYLES: HairStyle[] = ['long', 'twin', 'bob', 'short', 'spiky', 'ponytail'];
const HAIR_COLORS = ['#2B2B33', '#8B5E3C', '#D9B24C', '#E8632E', '#E85D9C', '#5FB8E0', '#7C5CB8', '#3E3E3E', '#C94F4F', '#4F9DDE'];
const EYE_COLORS = ['#2B2B33', '#4A6FE0', '#3E9A5C', '#8B5E3C', '#7C5CB8', '#D9534F'];
const SKIN_TONES = ['#FFE1C4', '#F2C9A4', '#E8B08A', '#F7DFC0'];
const ACCENTS = ['#FADDE1', '#DCEFFB', '#E4F7E1', '#FBE9D0', '#EDE3FB', '#FDE2E2'];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pick<T>(list: T[], hash: number, salt: number): T {
  return list[(hash + salt) % list.length];
}

/** Seeds the drawable traits above. Used for the fixed roster and to give a
 * freshly registered player a stable placeholder tint until they add a photo. */
export function makeAvatar(seed: string, overrides: Partial<Avatar> = {}): Avatar {
  const hash = hashSeed(seed);
  return {
    hairStyle: pick(HAIR_STYLES, hash, 1),
    hairColor: pick(HAIR_COLORS, hash, 7),
    eyeColor: pick(EYE_COLORS, hash, 13),
    skinTone: pick(SKIN_TONES, hash, 19),
    accent: pick(ACCENTS, hash, 23),
    ...overrides,
  };
}
