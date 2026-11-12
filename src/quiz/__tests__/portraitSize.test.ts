import { portraitSizeFor } from '../portraitSize';

describe('the portrait in a quiz question', () => {
  it('is bigger than the old fixed 140 on every common phone', () => {
    for (const [w, h] of [[360, 640], [360, 780], [393, 852], [412, 915]]) {
      expect(portraitSizeFor(w, h)).toBeGreaterThan(140);
    }
  });

  it('gives way to the answers on a short screen', () => {
    // 27% of the height: the rest is the question, four answers and a button.
    expect(portraitSizeFor(360, 640)).toBeLessThanOrEqual(Math.round(640 * 0.27));
  });

  it('stops growing on a tablet and stays readable on a tiny screen', () => {
    expect(portraitSizeFor(1024, 1366)).toBe(230);
    expect(portraitSizeFor(320, 400)).toBe(120);
  });
});
