export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export type FontWeightName = '400' | '500' | '600' | '700' | '800' | '900';

// Manrope's TTFs are single-weight files — pick the family instead of
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

export const type = {
  h1: { fontSize: 32, fontFamily: fontFamily('700') },
  h2: { fontSize: 24, fontFamily: fontFamily('700') },
  h3: { fontSize: 18, fontFamily: fontFamily('600') },
  body: { fontSize: 16, fontFamily: fontFamily('400') },
  caption: { fontSize: 14, fontFamily: fontFamily('400') },
};
