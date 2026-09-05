import { CategoryId, QuestionType } from '../data/categories';
import { TierId } from '../data/difficulty';

export type RoundConfig = {
  categoryId: CategoryId;
  tier?: TierId;
  questionCount: number;
  lives?: number;
  timerSeconds?: number;
  forceType?: QuestionType;
  dailySeed?: number;
};
