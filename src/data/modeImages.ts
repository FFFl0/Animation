import { ImageSourcePropType } from 'react-native';
import { ModeId } from './modes';

// Metro requires string-literal paths, so these are hand-written lookup
// tables (same as src/data/categoryImages.ts). Replacing a file under
// assets/home keeps working without touching this one.
export const MODE_BACKGROUNDS: Record<ModeId, ImageSourcePropType> = {
  quick: require('../../assets/home/modes/quick.jpg'),
  survivor: require('../../assets/home/modes/survivor.jpg'),
  perfect10: require('../../assets/home/modes/perfect10.jpg'),
  silhouette: require('../../assets/home/modes/silhouette.jpg'),
  eyes: require('../../assets/home/modes/eyes.jpg'),
  whoSaidIt: require('../../assets/home/modes/whoSaidIt.jpg'),
  whichAnime: require('../../assets/home/modes/whichAnime.jpg'),
  mixed: require('../../assets/home/modes/mixed.jpg'),
  daily: require('../../assets/home/modes/daily.jpg'),
};

export const BATTLE_BANNER: ImageSourcePropType = require('../../assets/home/fan-battle.jpg');
export const TOURNAMENT_BANNER: ImageSourcePropType = require('../../assets/home/tournament.jpg');
