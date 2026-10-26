import { useEffect, useState } from 'react';

/** How long a count-up takes, whatever it is counting to. Short enough that
 * nobody waits for it, long enough to be read as movement. */
const COUNT_UP_MS = 700;

/**
 * Counts up to a number so it lands rather than appears.
 *
 * Driven from state because it is text, not a style — but it is one short
 * burst of about twenty frames that stops the moment it arrives, and it only
 * runs when the figure itself changes, not on every render of the screen
 * around it.
 */
export function useCountUp(target: number): number {
  const safe = Number.isFinite(target) ? Math.max(0, Math.round(target)) : 0;
  const [value, setValue] = useState(safe);

  useEffect(() => {
    if (safe <= 0) {
      setValue(0);
      return;
    }
    const startedAt = Date.now();
    setValue(0);
    const timer = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / COUNT_UP_MS;
      if (elapsed >= 1) {
        setValue(safe);
        clearInterval(timer);
        return;
      }
      // Eased so it rushes out and settles, instead of ticking like a clock.
      setValue(Math.round(safe * (1 - (1 - elapsed) ** 3)));
    }, 32);
    return () => clearInterval(timer);
  }, [safe]);

  return value;
}
