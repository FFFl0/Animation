import { useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

/**
 * Keeps a scrolling screen where the player left it.
 *
 * Screens here are unmounted while another is on top of them, so coming back
 * otherwise means starting at the top — halfway down a list of categories,
 * that reads as the app having forgotten what you were doing. The offset
 * itself has to live above the screen, in the navigation state, for the same
 * reason: anything held inside the screen goes with it.
 *
 * Restoring waits for the content to be tall enough to hold the old offset.
 * Images and lazily measured rows arrive after the first layout, and
 * scrolling before then is silently clamped to the top; once it has worked
 * it must not repeat, or every late image would yank the page back.
 */
export function useRememberedScroll(offset: number, onChangeOffset: (y: number) => void) {
  const ref = useRef<ScrollView>(null);
  const restored = useRef(false);

  const scrollProps = {
    ref,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => onChangeOffset(e.nativeEvent.contentOffset.y),
    scrollEventThrottle: 64,
    onContentSizeChange: (_width: number, height: number) => {
      if (restored.current || offset <= 0) return;
      if (height < offset) return;
      restored.current = true;
      ref.current?.scrollTo({ y: offset, animated: false });
    },
  };

  /** For when the content itself changes under the player — a different
   * shelf, a different filter — and the remembered offset belongs to what
   * was there before. */
  const jumpToTop = () => {
    restored.current = true;
    onChangeOffset(0);
    ref.current?.scrollTo({ y: 0, animated: false });
  };

  return { scrollProps, jumpToTop };
}
