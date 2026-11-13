import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp, HexColor } from 'react-native-android-widget';
import { WIDGET_TEXT, WidgetKind, WidgetSnapshot, WidgetState } from './streakWidgetState';

/**
 * The streak widget, as Android draws it on the home screen.
 *
 * Only this file and the Android glue import the widget library: its
 * components are descriptions for the native side to build, not views,
 * and the library does not load at all outside Android.
 */

/** Bundled into the APK by the widget plugin (see app.json). */
const FONT = 'Manrope_800ExtraBold';

/** The app's flame (components/Icon), filled. */
function flameSvg(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2c2 4-2 5-2 9a4 4 0 1 0 8 0c0-2-1-4-2-5 .3 2-1.2 3-2 2 1-2-.5-4-2-6z" fill="${color}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

type Look = {
  background: { backgroundColor?: ColorProp; backgroundGradient?: { from: ColorProp; to: ColorProp; orientation: 'TL_BR' } };
  border: ColorProp;
  flame: string;
  number: HexColor;
  label: HexColor;
  pill: ColorProp;
  pillText: HexColor;
};

export function lookOf(kind: WidgetKind, dark: boolean): Look {
  const card: ColorProp = dark ? '#242028' : '#FFFFFF';
  const text: HexColor = dark ? '#F5F1EC' : '#1F2937';
  const muted: HexColor = dark ? '#9C94A0' : '#6B7280';
  switch (kind) {
    case 'done':
      return {
        background: { backgroundGradient: { from: '#F06292', to: '#FF9F68', orientation: 'TL_BR' } },
        border: 'rgba(255, 255, 255, 0)',
        flame: '#FFFFFF',
        number: '#FFFFFF',
        label: '#FFFFFF',
        pill: 'rgba(255, 255, 255, 0.28)',
        pillText: '#FFFFFF',
      };
    case 'pending':
      return {
        background: { backgroundColor: card },
        border: '#F06292',
        flame: '#F06292',
        number: text,
        label: muted,
        pill: '#F06292',
        pillText: '#FFFFFF',
      };
    case 'frozen':
      return {
        background: { backgroundColor: card },
        border: '#60A5FA',
        flame: '#60A5FA',
        number: text,
        label: muted,
        pill: dark ? '#1E3A5F' : '#DBEAFE',
        pillText: dark ? '#93C5FD' : '#1D4ED8',
      };
    default:
      return {
        background: { backgroundColor: card },
        border: dark ? '#332E38' : '#ECE7EB',
        flame: dark ? '#5A5360' : '#C4BDC6',
        number: muted,
        label: muted,
        pill: dark ? '#4A2F3B' : '#FADDE1',
        pillText: dark ? '#F4789F' : '#D94A7B',
      };
  }
}

export function StreakWidget({
  state,
  language,
  width,
  height,
  dark,
}: {
  state: WidgetState;
  language: WidgetSnapshot['language'];
  width: number;
  height: number;
  dark: boolean;
}) {
  const text = WIDGET_TEXT[language];
  const look = lookOf(state.kind, dark);
  // Everything scales with the short side, so a 2×2 and a stretched 3×2
  // both read at a glance.
  const side = Math.max(100, Math.min(width || 160, height || 160));
  const flame = Math.round(side * 0.26);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`${state.count} ${text.label(state.count)}. ${text.footer[state.kind]}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        borderWidth: state.kind === 'done' ? 0 : 2,
        borderColor: look.border,
        padding: Math.round(side * 0.06),
        ...look.background,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SvgWidget svg={flameSvg(look.flame)} style={{ width: flame, height: flame }} />
        <TextWidget
          text={String(state.count)}
          style={{ fontSize: Math.round(side * 0.27), fontFamily: FONT, color: look.number, marginLeft: 4 }}
        />
      </FlexWidget>
      <TextWidget
        text={text.label(state.count)}
        style={{ fontSize: Math.round(side * 0.085), fontFamily: FONT, color: look.label, marginTop: 2 }}
      />
      <FlexWidget
        style={{
          marginTop: Math.round(side * 0.07),
          backgroundColor: look.pill,
          borderRadius: 999,
          paddingHorizontal: Math.round(side * 0.07),
          paddingVertical: Math.round(side * 0.03),
        }}
      >
        <TextWidget
          text={text.footer[state.kind]}
          maxLines={1}
          truncate="END"
          style={{ fontSize: Math.round(side * 0.075), fontFamily: FONT, color: look.pillText }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
