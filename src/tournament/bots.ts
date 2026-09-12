import { seededRng } from '../quiz/generateQuiz';
import { Seat, TOURNAMENT_SIZE } from './bracket';

/**
 * Stand-ins for the seats no live player took. The names read like handles
 * somebody would actually pick, so a bracket does not look like a list of
 * "Bot 14"s.
 */
const BOT_NAMES = [
  'Kenshin', 'SakuraFan', 'ShonenKing', 'OtakuNo1', 'RamenLover', 'BlueExorcist',
  'NekoChan', 'ZeroTwo', 'SenpaiX', 'MangaAddict', 'TitanSlayer', 'HokageDream',
  'StrawHatJoe', 'CursedEnergy', 'DemonBlade', 'PlusUltra', 'SoulReaper', 'AlchemyFan',
  'PirateQueen', 'NinjaWay', 'SharinganX', 'MoonPrism', 'GhoulEater', 'SpiritGun',
  'IsekaiTruck', 'WaifuHunter', 'SakuraStorm', 'TokyoDrifter', 'LevelUpSolo', 'ChainsawGuy',
  'QuirkLess', 'BlackClover', 'HunterExam', 'DeathNoteL', 'SteinsFan', 'EvaPilot01',
  'JojoPose', 'SpyKid', 'GomuGomu', 'ThousandYear', 'SailorStar', 'BebopRider',
];

/**
 * Skill rises across the pool so the bracket holds a spread of opponents.
 * They are then shuffled into seats: weak ones mostly go out early, which is
 * what makes later rounds harder without any of it being scripted.
 */
function skillFor(rank: number, count: number): number {
  return count <= 1 ? 0.5 : 0.28 + (rank / (count - 1)) * 0.62;
}

export type LivePlayer = { name: string };

/**
 * Fills a 32-seat bracket: the player, then whatever other live players there
 * are, then bots for the rest, all shuffled into random seats.
 */
export function buildSeats(myName: string, others: LivePlayer[], seed: number): Seat[] {
  const rng = seededRng(seed);
  const names = [...BOT_NAMES];
  // Fisher-Yates, so the same seed always picks the same bots
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  const live = others.slice(0, TOURNAMENT_SIZE - 1);
  const botCount = TOURNAMENT_SIZE - 1 - live.length;

  const pool: Omit<Seat, 'seat'>[] = [
    { name: myName, kind: 'me', skill: 0 },
    ...live.map((p) => ({ name: p.name, kind: 'player' as const, skill: 0 })),
    ...Array.from({ length: botCount }, (_, i) => ({
      name: names[i % names.length],
      kind: 'bot' as const,
      skill: skillFor(i, botCount),
    })),
  ];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.map((entry, seat) => ({ ...entry, seat }));
}
