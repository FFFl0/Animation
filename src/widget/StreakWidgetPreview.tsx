import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { fontFamily } from '../theme/fonts';
import { WIDGET_TEXT, WidgetSnapshot, WidgetState } from './streakWidgetState';
import { useHoliday } from '../holidays/HolidayContext';
import { LINE, lookFor, pillColors, sceneText, streakScene } from './streakScene';

/**
 * The streak widget drawn inside the app, from the same picture and the
 * same measurements as the real one (streakScene), so what the profile
 * shows is what lands on the home screen.
 *
 * Here it can move, which the home screen cannot: with `twinkle` on, the
 * sparkles shift every moment the way they shift between the widget's
 * half-hourly redraws.
 */
export default function StreakWidgetPreview({
  state,
  language,
  width,
  height,
  twinkle = false,
}: {
  state: WidgetState;
  language: WidgetSnapshot['language'];
  width: number;
  height: number;
  twinkle?: boolean;
}) {
  const [variant, setVariant] = useState(3);
  useEffect(() => {
    if (!twinkle) return;
    const timer = setInterval(() => setVariant((v) => v + 1), 900);
    return () => clearInterval(timer);
  }, [twinkle]);

  const words = WIDGET_TEXT[language];
  const look = lookFor(state.count, state.kind);
  const number = String(state.count);
  const label = words.label(state.count);
  const text = sceneText(width, height, {
    number,
    label,
    footer: words.footer[state.kind],
    footerShort: words.footerShort[state.kind],
  });
  const footer = text.footer === 'long' ? words.footer[state.kind] : words.footerShort[state.kind];
  const pill = pillColors(state.count, state.kind);
  const wide = text.shape === 'wide';
  const accessory = useHoliday().holiday?.accessory ?? null;
  const xml = streakScene({ count: state.count, kind: state.kind, width, height, variant, accessory });
  // Line boxes as tall as Android draws them, so the preview fits exactly
  // when the widget does.
  const line = (size: number) => Math.round(size * LINE);

  return (
    <View
      style={{ width, height }}
      accessibilityRole="image"
      accessibilityLabel={`${state.count} ${label}. ${words.footer[state.kind]}`}
    >
      <SvgXml xml={xml} width={width} height={height} />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: wide ? 'flex-start' : 'center',
          paddingLeft: text.padLeft,
          paddingRight: text.padRight,
          paddingTop: text.padTop,
          paddingBottom: text.padBottom,
        }}
      >
        <View style={{ flexDirection: text.labelBeside ? 'row' : 'column', alignItems: text.labelBeside ? 'center' : wide ? 'flex-start' : 'center' }}>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontSize: text.number, lineHeight: line(text.number), fontFamily: fontFamily('800'), color: look.ink }}
          >
            {number}
          </Text>
          {text.label > 0 ? (
            <View style={text.labelBeside ? { marginLeft: Math.round(text.number * 0.18) } : null}>
              {text.labelLines.map((part, i) => (
                <Text
                  key={i}
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={{ fontSize: text.label, lineHeight: line(text.label), fontFamily: fontFamily('800'), color: look.inkSoft }}
                >
                  {part}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <View
          style={{
            marginTop: text.gap,
            backgroundColor: pill.background,
            borderRadius: 999,
            paddingHorizontal: text.pillPadX,
            paddingTop: text.pillPadY - text.pillLift,
            paddingBottom: text.pillPadY + text.pillLift,
          }}
        >
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontSize: text.pill, lineHeight: line(text.pill), fontFamily: fontFamily('800'), color: pill.text }}
          >
            {footer}
          </Text>
        </View>
      </View>
    </View>
  );
}
