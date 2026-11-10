import { ImageSourcePropType } from 'react-native';

// Metro requires string-literal paths, so this is a hand-written lookup table
// (same as the category, mode and achievement artwork). An animated frame or
// avatar is missing from it on purpose: those are drawn live, in motion,
// and a photograph of one would be a worse version of the thing itself.
// See assets/shop/README.md.
export const SHOP_IMAGES: Record<string, ImageSourcePropType> = {
  'merch-tee': require('../../assets/shop/merch-tee.jpg'),
  'merch-hoodie': require('../../assets/shop/merch-hoodie.jpg'),
  'merch-mug': require('../../assets/shop/merch-mug.jpg'),
  'merch-poster': require('../../assets/shop/merch-poster.jpg'),
  'merch-stickers': require('../../assets/shop/merch-stickers.jpg'),
  'merch-figure': require('../../assets/shop/merch-figure.jpg'),
  'item-hint-1': require('../../assets/shop/item-hint-1.jpg'),
  'item-hint-5': require('../../assets/shop/item-hint-5.jpg'),
  'item-skip-3': require('../../assets/shop/item-skip-3.jpg'),
  'item-freeze': require('../../assets/shop/item-freeze.jpg'),
};
