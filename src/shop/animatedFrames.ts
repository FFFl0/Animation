/**
 * Animated profile frames. They are drawn and animated in code rather than
 * shipped as files: an animated PNG would be a sprite sheet nobody can
 * retint, and these have to sit behind an avatar of any size.
 */
export type AnimatedFrameId =
  | 'aurora'
  | 'petals'
  | 'ember'
  | 'circuit'
  | 'champion'
  | 'eternal';

export type FrameMotion = 'spin' | 'orbit' | 'pulse' | 'march' | 'counter';

export type AnimatedFrameSpec = {
  id: AnimatedFrameId;
  /** How the ring moves. */
  motion: FrameMotion;
  /** Ring colours, outer first. Two of them means two rings. */
  colors: string[];
  /** Seconds for one full cycle. */
  period: number;
};

export const ANIMATED_FRAMES: Record<AnimatedFrameId, AnimatedFrameSpec> = {
  aurora: { id: 'aurora', motion: 'spin', colors: ['#6FD6FF', '#B98CFF'], period: 6 },
  petals: { id: 'petals', motion: 'orbit', colors: ['#FF9EC4', '#FFD6E4'], period: 9 },
  ember: { id: 'ember', motion: 'pulse', colors: ['#FF8A3D', '#FFCE6B'], period: 2.4 },
  circuit: { id: 'circuit', motion: 'march', colors: ['#4ADE9B', '#1F9E6B'], period: 4 },
  champion: { id: 'champion', motion: 'counter', colors: ['#E0A424', '#FFE9A8'], period: 5 },
  eternal: { id: 'eternal', motion: 'counter', colors: ['#C9A0FF', '#7CE7FF'], period: 7 },
};

export const ANIMATED_FRAME_IDS = Object.keys(ANIMATED_FRAMES) as AnimatedFrameId[];

export function isAnimatedFrameId(id: string): id is AnimatedFrameId {
  return id in ANIMATED_FRAMES;
}
