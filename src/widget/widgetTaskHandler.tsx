import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { todayDateStr } from '../quiz/today';
import { StreakWidget } from './StreakWidget';
import { currentVariant } from './streakScene';
import { SNAPSHOT_KEY, WIDGET_NAME, WidgetSnapshot, parseSnapshot, widgetStateOf } from './streakWidgetState';

export async function readSnapshot(): Promise<WidgetSnapshot | null> {
  try {
    return parseSnapshot(await AsyncStorage.getItem(SNAPSHOT_KEY));
  } catch {
    return null;
  }
}

/**
 * The widget as it should look now. The picture is the same in light and
 * dark: it is artwork with its own sky, like a photo widget.
 */
export function renderStreakWidget(snapshot: WidgetSnapshot | null, width: number, height: number) {
  const state = widgetStateOf(snapshot, todayDateStr());
  const language = snapshot?.language ?? 'ru';
  return (
    <StreakWidget state={state} language={language} width={width} height={height} variant={currentVariant()} />
  );
}

/**
 * Runs without the app on screen: when the widget is added, resized, or
 * Android's half-hourly redraw comes round — which is what turns
 * "extended" back into "extend your streak" after midnight with nobody
 * opening the app. A tap opens the app on its own (OPEN_APP), so there is
 * nothing to do for it here.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME) return;
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(renderStreakWidget(await readSnapshot(), props.widgetInfo.width, props.widgetInfo.height));
      break;
    default:
      break;
  }
}
