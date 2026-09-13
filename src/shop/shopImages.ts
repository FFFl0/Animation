import { ImageSourcePropType } from 'react-native';

// Metro requires string-literal paths, so this is a hand-written lookup table
// (same as the category, mode and achievement artwork). Only physical goods
// need a picture: an animated frame is drawn live, not photographed.
// See assets/shop/README.md.
export const SHOP_IMAGES: Record<string, ImageSourcePropType> = {
  'merch-tee': require('../../assets/shop/merch-tee.jpg'),
  'merch-hoodie': require('../../assets/shop/merch-hoodie.jpg'),
  'merch-mug': require('../../assets/shop/merch-mug.jpg'),
  'merch-poster': require('../../assets/shop/merch-poster.jpg'),
  'merch-stickers': require('../../assets/shop/merch-stickers.jpg'),
  'merch-figure': require('../../assets/shop/merch-figure.jpg'),
  'reward-stickers': require('../../assets/shop/reward-stickers.jpg'),
  'reward-mug': require('../../assets/shop/reward-mug.jpg'),
  'reward-hoodie': require('../../assets/shop/reward-hoodie.jpg'),
};
