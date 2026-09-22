import { ImageSourcePropType } from 'react-native';
import { StreakTierId } from './streakTiers';

// Metro requires string-literal paths, so this is a hand-written lookup table
// (same as the category and mode backgrounds). Drop a new file in under the
// same name to change a tier's artwork — see assets/streak/README.md.
export const STREAK_BACKGROUNDS: Record<StreakTierId, ImageSourcePropType> = {
  seed: require('../../assets/streak/seed.jpg'),
  spark: require('../../assets/streak/spark.jpg'),
  rolling: require('../../assets/streak/rolling.jpg'),
  week: require('../../assets/streak/week.jpg'),
  fortnight: require('../../assets/streak/fortnight.jpg'),
  month: require('../../assets/streak/month.jpg'),
  iron: require('../../assets/streak/iron.jpg'),
  legend: require('../../assets/streak/legend.jpg'),
  beyond: require('../../assets/streak/beyond.jpg'),
};
