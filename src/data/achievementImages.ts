import { ImageSourcePropType } from 'react-native';

// Metro requires string-literal paths, so this is a hand-written lookup table
// (same as the category, mode and streak artwork). Drop a new file in under
// the same name to change an achievement's picture — see
// assets/achievements/README.md.
export const ACHIEVEMENT_IMAGES: Record<string, ImageSourcePropType> = {
  // quiz
  'first-steps': require('../../assets/achievements/first-steps.jpg'),
  curious: require('../../assets/achievements/curious.jpg'),
  dedicated: require('../../assets/achievements/dedicated.jpg'),
  marathon: require('../../assets/achievements/marathon.jpg'),
  'perfect-ten': require('../../assets/achievements/perfect-ten.jpg'),
  survivor: require('../../assets/achievements/survivor.jpg'),
  speedrunner: require('../../assets/achievements/speedrunner.jpg'),
  // stats
  'hundred-correct': require('../../assets/achievements/hundred-correct.jpg'),
  'five-hundred-correct': require('../../assets/achievements/five-hundred-correct.jpg'),
  'thousand-correct': require('../../assets/achievements/thousand-correct.jpg'),
  'level-ten': require('../../assets/achievements/level-ten.jpg'),
  'level-twenty-five': require('../../assets/achievements/level-twenty-five.jpg'),
  // collection
  'anime-scholar': require('../../assets/achievements/anime-scholar.jpg'),
  'character-expert': require('../../assets/achievements/character-expert.jpg'),
  'quote-master': require('../../assets/achievements/quote-master.jpg'),
  'opening-expert': require('../../assets/achievements/opening-expert.jpg'),
  'battle-expert': require('../../assets/achievements/battle-expert.jpg'),
  'world-expert': require('../../assets/achievements/world-expert.jpg'),
  explorer: require('../../assets/achievements/explorer.jpg'),
  // special
  'legend-tier': require('../../assets/achievements/legend-tier.jpg'),
  'week-streak': require('../../assets/achievements/week-streak.jpg'),
  'month-streak': require('../../assets/achievements/month-streak.jpg'),
  // secret — these two are drawn as silhouettes, so they work locked as well
  'secret-tier-master': require('../../assets/achievements/secret-tier-master.jpg'),
  'secret-completionist': require('../../assets/achievements/secret-completionist.jpg'),
};
