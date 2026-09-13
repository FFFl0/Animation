import { ImageSourcePropType } from 'react-native';

/**
 * Avatars that move. The picture is a still, and the motion is added in code
 * on top of it — a drifting sparkle, a slow breath, a shimmer sweeping
 * across — so one file covers every size the avatar is drawn at.
 */
export type AnimatedAvatarId = 'sakura' | 'shadow' | 'frost' | 'ember' | 'mint' | 'violet' | 'sunny' | 'neko';

export type AvatarMotion = 'sparkle' | 'breathe' | 'shimmer' | 'glow';

export type AnimatedAvatarSpec = {
  id: AnimatedAvatarId;
  motion: AvatarMotion;
  /** Tint of the moving layer. */
  accent: string;
  /** Seconds for one full cycle. */
  period: number;
};

export const ANIMATED_AVATARS: Record<AnimatedAvatarId, AnimatedAvatarSpec> = {
  sakura: { id: 'sakura', motion: 'sparkle', accent: '#FFB3D1', period: 5 },
  shadow: { id: 'shadow', motion: 'shimmer', accent: '#B9A7FF', period: 4.5 },
  frost: { id: 'frost', motion: 'sparkle', accent: '#CFE8FF', period: 6 },
  ember: { id: 'ember', motion: 'glow', accent: '#FF9A4D', period: 2.6 },
  mint: { id: 'mint', motion: 'shimmer', accent: '#8FF0DA', period: 5 },
  violet: { id: 'violet', motion: 'glow', accent: '#C9A0FF', period: 3.2 },
  sunny: { id: 'sunny', motion: 'sparkle', accent: '#FFE79A', period: 4 },
  neko: { id: 'neko', motion: 'breathe', accent: '#FFC9D8', period: 3 },
};

export const ANIMATED_AVATAR_IDS = Object.keys(ANIMATED_AVATARS) as AnimatedAvatarId[];

// Metro requires string-literal paths, so this is a hand-written lookup table.
export const ANIMATED_AVATAR_IMAGES: Record<AnimatedAvatarId, ImageSourcePropType> = {
  sakura: require('../../assets/shop/avatars/sakura.jpg'),
  shadow: require('../../assets/shop/avatars/shadow.jpg'),
  frost: require('../../assets/shop/avatars/frost.jpg'),
  ember: require('../../assets/shop/avatars/ember.jpg'),
  mint: require('../../assets/shop/avatars/mint.jpg'),
  violet: require('../../assets/shop/avatars/violet.jpg'),
  sunny: require('../../assets/shop/avatars/sunny.jpg'),
  neko: require('../../assets/shop/avatars/neko.jpg'),
};

export function isAnimatedAvatarId(value: unknown): value is AnimatedAvatarId {
  return typeof value === 'string' && value in ANIMATED_AVATARS;
}
