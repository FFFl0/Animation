import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * The columns the leaderboard views hand back, against the ones the app
 * reads off them.
 *
 * This is the seam that has broken twice: a view that does not select a
 * column answers without it, and the app reads undefined — a rating of
 * zero for somebody who has played for weeks — or, when it is ordered by,
 * an error that reads as an empty table. Neither fails a type check,
 * because the row types describe what is hoped for, not what arrives.
 */

const SCHEMA = readFileSync(join(__dirname, '../../../supabase/schema.sql'), 'utf8');

/** The output names of the LAST definition of a view — the file is a
 * migration log, so the last one is the one a fresh run leaves behind. */
function outputColumns(view: string): string[] {
  const marker = `create view public.${view} as`;
  const start = SCHEMA.lastIndexOf(marker);
  if (start === -1) throw new Error(`no view ${view} in schema.sql`);
  const statement = SCHEMA.slice(start + marker.length);
  const body = statement.slice(0, statement.indexOf(';')).replace(/--[^\n]*/g, '');

  // The select list ends at the view's own `from`, which is the only one
  // outside brackets — the rest are inside the subqueries that sum things.
  let depth = 0;
  let listEnd = body.length;
  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (depth === 0 && /\s/.test(char) && /^from\s/i.test(body.slice(i + 1, i + 6))) {
      listEnd = i;
      break;
    }
  }

  // Split on the commas that are not inside a bracket either.
  const items: string[] = [];
  let current = '';
  depth = 0;
  for (const char of body.slice(0, listEnd)) {
    if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      items.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  items.push(current);

  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const aliased = item.match(/\sas\s+([a-z_]+)$/i);
      if (aliased) return aliased[1];
      return (item.split(/\s+/).pop() ?? '').split('.').pop() ?? '';
    })
    .filter(Boolean);
}

describe('leaderboard views', () => {
  // Read by leaderboardApi (all-time) and by friendsApi, which reads this
  // same view for every player it shows.
  it('hands back everything the all-time board and the friends list read', () => {
    const columns = outputColumns('leaderboard');
    for (const column of [
      'id',
      'username',
      'avatar',
      'streak',
      'achievements',
      'stats',
      'victories',
      'last_seen_at',
      'rating',
      'total_score',
      'total_correct',
      'total_questions',
      'total_games',
    ]) {
      expect(columns).toContain(column);
    }
  });

  // The period boards rank by what was answered inside the period, but a
  // profile opened from one still shows a rating, and that is worked out
  // from the stats — which these have to carry too.
  it.each(['leaderboard_weekly', 'leaderboard_season'])('%s carries the stats a rating needs', (view) => {
    const columns = outputColumns(view);
    for (const column of ['id', 'username', 'avatar', 'stats', 'victories', 'period_score', 'period_questions']) {
      expect(columns).toContain(column);
    }
  });
});
