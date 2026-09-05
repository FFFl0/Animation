export type HairStyle = 'long' | 'twin' | 'bob' | 'short' | 'spiky' | 'ponytail';

export type Avatar = {
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
