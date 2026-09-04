export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export type FontWeightName = '400' | '500' | '600' | '700' | '800' | '900';

// Custom TTF fonts are single-weight files — pick the family instead of
// setting fontWeight (which would just fake-bold an already-bold face).
export function fontFamily(weight: FontWeightName): string {
  switch (weight) {
    case '400':
      return fonts.regular;
    case '500':
      return fonts.medium;
    case '600':
      return fonts.semibold;
    case '700':
      return fonts.bold;
    default:
      return fonts.extrabold;
  }
}
