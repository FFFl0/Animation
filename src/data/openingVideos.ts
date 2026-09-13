import { VideoSource } from 'expo-video';

/**
 * One theme clip per series, keyed by series id. Metro needs string-literal
 * paths, so this is a hand-written lookup table (mirrors
 * src/data/avatarImages.ts) rather than a dynamic resolver.
 *
 * The files shipped here are placeholders — a coloured card naming the series
 * — meant to be replaced with real openings one file at a time. Keep the
 * names: everything else keys off them.
 */
export const OPENING_VIDEOS: Record<string, VideoSource> = {
  naruto: require('../../assets/openings/naruto.mp4'),
  aot: require('../../assets/openings/aot.mp4'),
  onepiece: require('../../assets/openings/onepiece.mp4'),
  deathnote: require('../../assets/openings/deathnote.mp4'),
  mha: require('../../assets/openings/mha.mp4'),
  demonslayer: require('../../assets/openings/demonslayer.mp4'),
  jjk: require('../../assets/openings/jjk.mp4'),
  fma: require('../../assets/openings/fma.mp4'),
  bleach: require('../../assets/openings/bleach.mp4'),
  hxh: require('../../assets/openings/hxh.mp4'),
  opm: require('../../assets/openings/opm.mp4'),
  csm: require('../../assets/openings/csm.mp4'),
  spyfamily: require('../../assets/openings/spyfamily.mp4'),
  sao: require('../../assets/openings/sao.mp4'),
  codegeass: require('../../assets/openings/codegeass.mp4'),
  frieren: require('../../assets/openings/frieren.mp4'),
  rezero: require('../../assets/openings/rezero.mp4'),
  konosuba: require('../../assets/openings/konosuba.mp4'),
  evangelion: require('../../assets/openings/evangelion.mp4'),
  tokyoghoul: require('../../assets/openings/tokyoghoul.mp4'),
};

export function openingVideoFor(seriesId: string): VideoSource | undefined {
  return OPENING_VIDEOS[seriesId];
}
