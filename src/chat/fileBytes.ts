import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Reads a local file into bytes, which is what the storage client uploads.
 *
 * Two paths because the uri means different things per platform: on the web a
 * picked file or a finished recording is a blob URL that `fetch` resolves,
 * while on a device it is a `file://` path, which React Native's `fetch`
 * handles inconsistently — expo-file-system reads those properly.
 */
export async function readFileBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
  const buffer = await new FileSystem.File(uri).arrayBuffer();
  return new Uint8Array(buffer);
}
