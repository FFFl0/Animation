/**
 * True only in the web export that scripts/check-layout.mjs builds.
 *
 * That export has no server, and a few pieces of the interface exist only
 * with one. This lets the check see them anyway — it is looking at how they
 * are laid out, not at whether they work. No real build sets the variable:
 * builds and over-the-air updates take theirs from eas.json.
 */
export const isLayoutCheck = process.env.EXPO_PUBLIC_LAYOUT_CHECK === '1';
