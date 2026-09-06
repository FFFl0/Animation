import { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const TABLET_BREAKPOINT = 700;
const CONTENT_MAX_WIDTH = 480;

/**
 * The app is designed phone-first (single column, bottom tabs). On a
 * tablet-sized viewport, stretching that layout edge-to-edge looks broken —
 * so instead we center a phone-proportioned column and let the theme
 * background fill the rest, the same pattern most phone-first web apps use
 * on desktop/tablet widths.
 */
export default function ResponsiveShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isTablet = width >= TABLET_BREAKPOINT;

  if (!isTablet) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.backdrop, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.column,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            shadowColor: theme.ink,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    borderWidth: 1,
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(0,0,0,0.12)' } as any,
      default: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
        elevation: 8,
      },
    }),
  },
});
