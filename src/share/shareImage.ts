import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export type ShareResult = 'ok' | 'unavailable' | 'failed';

/** Whether this platform can hand a file to other apps at all — false on the
 * web build, where the share sheet does not exist. */
export async function canShareImage(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Snapshots a rendered view to a PNG and opens the system share sheet with it.
 *
 * The view has to be laid out for the snapshot to contain anything, which is
 * why the card is rendered off-screen rather than hidden — `display: none`
 * would capture an empty frame.
 */
export async function shareViewAsImage(ref: RefObject<View | null>, dialogTitle: string): Promise<ShareResult> {
  if (!ref.current) return 'failed';
  if (!(await canShareImage())) return 'unavailable';

  try {
    const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
    return 'ok';
  } catch {
    return 'failed';
  }
}
