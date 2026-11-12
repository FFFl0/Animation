/**
 * How large the character's portrait is drawn in a quiz question.
 *
 * Just over half the screen's width, but never more than about a quarter of
 * its height: the quiz screen does not scroll, so on a short phone a bigger
 * portrait would push the four answers and the button under them off the
 * bottom. Bounded at both ends so a tablet does not get a poster and a tiny
 * screen still gets a recognisable face.
 */
export function portraitSizeFor(width: number, height: number): number {
  return Math.round(Math.max(120, Math.min(width * 0.56, height * 0.27, 230)));
}
