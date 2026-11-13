import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp, HexColor } from 'react-native-android-widget';
import { WIDGET_TEXT, WidgetSnapshot, WidgetState } from './streakWidgetState';
import { lookFor, pillColors, sceneText, streakScene } from './streakScene';

/**
 * The streak widget, as Android draws it on the home screen: the tier's
 * picture (streakScene) filling the card, the number and today's state
 * over it on the left.
 *
 * Only this file and the Android glue import the widget library: its
 * components are descriptions for the native side to build, not views,
 * and the library does not load at all outside Android.
 */

/** Bundled into the APK by the widget plugin (see app.json). */
const FONT = 'Manrope_800ExtraBold';

export function StreakWidget({
  state,
  language,
  width,
  height,
  variant,
}: {
  state: WidgetState;
  language: WidgetSnapshot['language'];
  width: number;
  height: number;
  variant: number;
}) {
  const W = Math.max(60, Math.round(width || 190));
  const H = Math.max(40, Math.round(height || 88));
  const words = WIDGET_TEXT[language];
  const look = lookFor(state.count, state.kind);
  const number = String(state.count);
  const label = words.label(state.count);
  const text = sceneText(W, H, {
    number,
    label,
    footer: words.footer[state.kind],
    footerShort: words.footerShort[state.kind],
  });
  const footer = text.footer === 'long' ? words.footer[state.kind] : words.footerShort[state.kind];
  const pill = pillColors(state.count, state.kind);
  const wide = text.shape === 'wide';
  return (
    <OverlapWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`${state.count} ${label}. ${words.footer[state.kind]}`}
      style={{ width: 'match_parent', height: 'match_parent', borderRadius: Math.min(28, H / 2), overflow: 'hidden' }}
    >
      <SvgWidget
        svg={streakScene({ count: state.count, kind: state.kind, width: W, height: H, variant })}
        style={{ width: W, height: H }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: wide ? 'flex-start' : 'center',
          paddingLeft: text.padLeft,
          paddingRight: text.padRight,
          paddingTop: text.padTop,
          paddingBottom: text.padBottom,
        }}
      >
        {/* Sizes are worked out in widget points, so the phone's font size
            setting must not scale them again. */}
        {text.labelBeside ? (
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text={number}
              allowFontScaling={false}
              maxLines={1}
              style={{ fontSize: text.number, fontFamily: FONT, color: look.ink as HexColor }}
            />
            {text.label > 0 ? (
              <FlexWidget style={{ flexDirection: 'column', marginLeft: Math.round(text.number * 0.18) }}>
                {text.labelLines.map((line, i) => (
                  <TextWidget
                    key={i}
                    text={line}
                    allowFontScaling={false}
                    maxLines={1}
                    style={{ fontSize: text.label, fontFamily: FONT, color: look.inkSoft as HexColor }}
                  />
                ))}
              </FlexWidget>
            ) : null}
          </FlexWidget>
        ) : null}
        {/* No fragments: the widget library walks the tree itself and does
            not know them. Null children it skips. */}
        {!text.labelBeside ? (
          <TextWidget
            text={number}
            allowFontScaling={false}
            maxLines={1}
            style={{ fontSize: text.number, fontFamily: FONT, color: look.ink as HexColor }}
          />
        ) : null}
        {!text.labelBeside && text.label > 0 ? (
          <TextWidget
            text={label}
            allowFontScaling={false}
            maxLines={1}
            truncate="END"
            style={{ fontSize: text.label, fontFamily: FONT, color: look.inkSoft as HexColor }}
          />
        ) : null}
        <FlexWidget
          style={{
            marginTop: text.gap,
            backgroundColor: pill.background as ColorProp,
            borderRadius: 999,
            paddingHorizontal: text.pillPadX,
            paddingVertical: text.pillPadY,
          }}
        >
          <TextWidget
            text={footer}
            allowFontScaling={false}
            maxLines={1}
            truncate="END"
            style={{ fontSize: text.pill, fontFamily: FONT, color: pill.text as HexColor }}
          />
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
