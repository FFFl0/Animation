import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { fontFamily } from '../theme/fonts';
import { WIDGET_TEXT, WidgetSnapshot, WidgetState } from './streakWidgetState';
import { lookFor, pillColors, sceneText, streakScene } from './streakScene';

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
  const text = sceneText(width, height);
  const pill = pillColors(state.count, state.kind);
  const wide = text.shape === 'wide';
  const xml = streakScene({ count: state.count, kind: state.kind, width, height, variant });

  return (
    <View
      style={{ width, height }}
      accessibilityRole="image"
      accessibilityLabel={`${state.count} ${words.label(state.count)}. ${words.footer[state.kind]}`}
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
        }}
      >
        <Text style={{ fontSize: text.number, lineHeight: Math.round(text.number * 1.15), fontFamily: fontFamily('800'), color: look.ink }}>
          {state.count}
        </Text>
        <Text style={{ fontSize: text.label, fontFamily: fontFamily('800'), color: look.inkSoft }}>
          {words.label(state.count)}
        </Text>
        <View
          style={{
            marginTop: text.gap,
            backgroundColor: pill.background,
            borderRadius: 999,
            paddingHorizontal: text.pillPadX,
            paddingVertical: text.pillPadY,
          }}
        >
          <Text numberOfLines={1} style={{ fontSize: text.pill, fontFamily: fontFamily('800'), color: pill.text }}>
            {words.footer[state.kind]}
          </Text>
        </View>
      </View>
    </View>
  );
}
