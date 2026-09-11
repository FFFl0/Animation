import { ImageSourcePropType } from 'react-native';
import { CategoryId } from './categories';

// Metro requires string-literal paths, so this is a hand-written lookup
// table (same as src/data/avatarImages.ts and friends) rather than a
// dynamic resolver. Replacing a file under assets/categories keeps working
// without touching this file — see that folder's README.
export const CATEGORY_BACKGROUNDS: Record<CategoryId, ImageSourcePropType> = {
  anime: require('../../assets/categories/anime.png'),
  characters: require('../../assets/categories/characters.png'),
  openings: require('../../assets/categories/openings.png'),
  quotes: require('../../assets/categories/quotes.png'),
  battles: require('../../assets/categories/battles.png'),
  world: require('../../assets/categories/world.png'),
  hard: require('../../assets/categories/hard.png'),
  mixed: require('../../assets/categories/mixed.png'),
};
