import { IconName } from '../components/Icon';

/** The symbol and colour a question draws for an ability. */
export type AbilityArt = { icon: IconName; accent: string };

/**
 * What an ability looks like.
 *
 * There are a hundred and sixty-four of them and no artwork for any — so
 * rather than a question that is four lines of text on an empty screen, each
 * one gets a symbol read out of its own name. Fire burns, lightning strikes,
 * eyes see; what the words do not give away falls to a stable choice made
 * from the name itself, so every ability has a card and the same ability
 * always has the same one.
 *
 * It gives nothing away that the question does not already say out loud: the
 * symbol comes from the ability, which is printed right underneath it.
 */
const FAMILIES: { match: RegExp; icon: IconName; accent: string }[] = [
  { match: /огн|плам|пиро|жар|пепел|взрыв/i, icon: 'flame', accent: '#F97316' },
  { match: /молни|гром|электр|разря|скорост|быстр|мгновен/i, icon: 'bolt', accent: '#FACC15' },
  { match: /вод|волн|лёд|лед|мороз|снег|туман|дожд|шторм|погод/i, icon: 'wave', accent: '#38BDF8' },
  { match: /глаз|зрен|шаринган|бьякуган|риннеган|взгляд|додзюцу|наблюд/i, icon: 'eye', accent: '#A78BFA' },
  { match: /исцел|лечен|медиц|регенер|восстан|кров/i, icon: 'heart', accent: '#F472B6' },
  { match: /разум|телепат|псих|мысл|памят|иллюз|гипно|интеллект|дедукц|анализ|страте|гени/i, icon: 'sparkles', accent: '#C084FC' },
  { match: /тен[ье]|тьм|ночь|лун|мрак|тёмн|темн/i, icon: 'moon', accent: '#818CF8' },
  { match: /дух|душ|призрак|демон|проклят|печат|маги|чакр|закля/i, icon: 'sakura', accent: '#FB7185' },
  { match: /плод|фрукт|растен|природ|яд|отрав|цвет|хана/i, icon: 'leaf', accent: '#34D399' },
  { match: /титан|трансформ|превращ|форм|гигант|тело|облик/i, icon: 'character', accent: '#FB923C' },
  { match: /земл|камен|песк|песок|скал|метал|желез|грав|невесом/i, icon: 'globe', accent: '#A3A3A3' },
  { match: /врем|простран|телепорт|портал|измер|бесконеч|пут/i, icon: 'infinity', accent: '#60A5FA' },
  { match: /корол|власт|команд|контрол|управл|приказ|лидер/i, icon: 'crown', accent: '#EAB308' },
  // Last, because half the abilities in the catalogue mention a blow or a
  // blade somewhere and would otherwise swallow the more specific families.
  { match: /меч|клинк|клинок|катан|лезви|кос[аы]|копь|удар|кулак|бо[йе]|нога|рук[аи]|стрел|пул/i, icon: 'swords', accent: '#EF4444' },
];

/** For a name that says nothing recognisable — still varied, still stable. */
const UNNAMED: AbilityArt[] = [
  { icon: 'star', accent: '#F59E0B' },
  { icon: 'gem', accent: '#22D3EE' },
  { icon: 'target', accent: '#F43F5E' },
  { icon: 'shuffle', accent: '#8B5CF6' },
  { icon: 'infinity', accent: '#2DD4BF' },
  { icon: 'sparkles', accent: '#E879F9' },
];

function hash(text: string): number {
  let value = 0;
  for (let i = 0; i < text.length; i++) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0;
  }
  return value;
}

export function abilityArt(ability: string): AbilityArt {
  for (const family of FAMILIES) {
    if (family.match.test(ability)) return { icon: family.icon, accent: family.accent };
  }
  return UNNAMED[hash(ability) % UNNAMED.length];
}
