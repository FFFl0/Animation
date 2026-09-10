import { ImageSourcePropType } from 'react-native';
import { FrameId } from './cosmetics';

// Metro requires string-literal paths, so these are hand-written lookup
// tables (mirrors src/data/avatarImages.ts) rather than a dynamic resolver.
export const FRAME_IMAGES: Record<FrameId, ImageSourcePropType> = {
  bronze: require('../../assets/cosmetics/frames/bronze.png'),
  azure: require('../../assets/cosmetics/frames/azure.png'),
  sakura: require('../../assets/cosmetics/frames/sakura.png'),
  ember: require('../../assets/cosmetics/frames/ember.png'),
  gold: require('../../assets/cosmetics/frames/gold.png'),
};
