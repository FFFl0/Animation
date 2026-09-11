import { AudioSource } from 'expo-audio';

/**
 * The spoken line for each character's quote, keyed by character id. Metro
 * needs string-literal paths, so this is a hand-written lookup table (mirrors
 * src/data/avatarImages.ts) rather than a dynamic resolver.
 *
 * The files shipped here are placeholders — a short chime — meant to be
 * replaced with real voice lines one file at a time. Keep the names:
 * everything else keys off them.
 */
export const QUOTE_AUDIO: Record<string, AudioSource> = {
  'naruto-1': require('../../assets/quotes/naruto-1.mp3'),
  'naruto-2': require('../../assets/quotes/naruto-2.mp3'),
  'naruto-3': require('../../assets/quotes/naruto-3.mp3'),
  'aot-1': require('../../assets/quotes/aot-1.mp3'),
  'aot-2': require('../../assets/quotes/aot-2.mp3'),
  'aot-3': require('../../assets/quotes/aot-3.mp3'),
  'op-1': require('../../assets/quotes/op-1.mp3'),
  'op-2': require('../../assets/quotes/op-2.mp3'),
  'op-3': require('../../assets/quotes/op-3.mp3'),
  'dn-1': require('../../assets/quotes/dn-1.mp3'),
  'dn-2': require('../../assets/quotes/dn-2.mp3'),
  'dn-3': require('../../assets/quotes/dn-3.mp3'),
  'mha-1': require('../../assets/quotes/mha-1.mp3'),
  'mha-2': require('../../assets/quotes/mha-2.mp3'),
  'mha-3': require('../../assets/quotes/mha-3.mp3'),
  'ds-1': require('../../assets/quotes/ds-1.mp3'),
  'ds-2': require('../../assets/quotes/ds-2.mp3'),
  'ds-3': require('../../assets/quotes/ds-3.mp3'),
  'jjk-1': require('../../assets/quotes/jjk-1.mp3'),
  'jjk-2': require('../../assets/quotes/jjk-2.mp3'),
  'jjk-3': require('../../assets/quotes/jjk-3.mp3'),
  'fma-1': require('../../assets/quotes/fma-1.mp3'),
  'fma-2': require('../../assets/quotes/fma-2.mp3'),
  'fma-3': require('../../assets/quotes/fma-3.mp3'),
  'bleach-1': require('../../assets/quotes/bleach-1.mp3'),
  'bleach-2': require('../../assets/quotes/bleach-2.mp3'),
  'bleach-3': require('../../assets/quotes/bleach-3.mp3'),
  'hxh-1': require('../../assets/quotes/hxh-1.mp3'),
  'hxh-2': require('../../assets/quotes/hxh-2.mp3'),
  'hxh-3': require('../../assets/quotes/hxh-3.mp3'),
  'opm-1': require('../../assets/quotes/opm-1.mp3'),
  'opm-2': require('../../assets/quotes/opm-2.mp3'),
  'csm-1': require('../../assets/quotes/csm-1.mp3'),
  'csm-2': require('../../assets/quotes/csm-2.mp3'),
  'sf-1': require('../../assets/quotes/sf-1.mp3'),
  'sf-2': require('../../assets/quotes/sf-2.mp3'),
  'sf-3': require('../../assets/quotes/sf-3.mp3'),
  'sao-1': require('../../assets/quotes/sao-1.mp3'),
  'sao-2': require('../../assets/quotes/sao-2.mp3'),
  'cg-1': require('../../assets/quotes/cg-1.mp3'),
  'cg-2': require('../../assets/quotes/cg-2.mp3'),
  'fr-1': require('../../assets/quotes/fr-1.mp3'),
  'fr-2': require('../../assets/quotes/fr-2.mp3'),
  'rz-1': require('../../assets/quotes/rz-1.mp3'),
  'rz-2': require('../../assets/quotes/rz-2.mp3'),
  'rz-3': require('../../assets/quotes/rz-3.mp3'),
  'ks-1': require('../../assets/quotes/ks-1.mp3'),
  'ks-2': require('../../assets/quotes/ks-2.mp3'),
  'ks-3': require('../../assets/quotes/ks-3.mp3'),
  'eva-1': require('../../assets/quotes/eva-1.mp3'),
  'eva-2': require('../../assets/quotes/eva-2.mp3'),
  'eva-3': require('../../assets/quotes/eva-3.mp3'),
  'tg-1': require('../../assets/quotes/tg-1.mp3'),
  'tg-2': require('../../assets/quotes/tg-2.mp3'),
};

export function quoteAudioFor(characterId: string): AudioSource | undefined {
  return QUOTE_AUDIO[characterId];
}
