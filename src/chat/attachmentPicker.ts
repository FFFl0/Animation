import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { base64ToBytes } from '../avatar/base64';
import { reportHandledError } from '../monitoring/sentry';
import { MAX_ATTACHMENT_BYTES, PendingAttachment, isImageMimeType, storedMimeType } from './attachments';

/**
 * Longest side a sent photo is reduced to.
 *
 * A phone camera hands over something like 4000px, which is several megabytes
 * of a picture nobody will ever see at more than screen width. 1600 still
 * looks sharp full-screen on a modern display and usually lands well under a
 * megabyte, which matters on a metered connection at both ends.
 */
const PHOTO_MAX_SIDE = 1600;
const PHOTO_QUALITY = 0.8;

export type PickAttachmentResult =
  | { status: 'ok'; attachment: PendingAttachment }
  | { status: 'canceled' }
  | { status: 'permissionDenied' }
  | { status: 'tooLarge'; size: number }
  | { status: 'failed' };

/**
 * Reads a picked file into bytes.
 *
 * Two paths because the uri means different things per platform: on the web
 * the picker hands back a blob URL that `fetch` resolves, while on a device
 * it is a `file://` path, which React Native's `fetch` handles
 * inconsistently — expo-file-system reads those properly.
 */
async function readBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
  const buffer = await new FileSystem.File(uri).arrayBuffer();
  return new Uint8Array(buffer);
}

/** Picks a photo from the gallery, downscaled and re-encoded. */
export async function pickChatPhoto(): Promise<PickAttachmentResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'permissionDenied' };

  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (picked.canceled || !picked.assets?.length) return { status: 'canceled' };

  const asset = picked.assets[0];
  try {
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    const longest = Math.max(asset.width ?? 0, asset.height ?? 0);
    // Only ever downscale: enlarging a small picture adds bytes and no detail.
    if (longest > PHOTO_MAX_SIDE) {
      const scale = PHOTO_MAX_SIDE / longest;
      context.resize({
        width: Math.round((asset.width ?? 0) * scale),
        height: Math.round((asset.height ?? 0) * scale),
      });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: PHOTO_QUALITY,
      base64: true,
    });
    if (!saved.base64) return { status: 'failed' };

    const bytes = base64ToBytes(saved.base64);
    if (bytes.length > MAX_ATTACHMENT_BYTES) return { status: 'tooLarge', size: bytes.length };

    return {
      status: 'ok',
      attachment: {
        kind: 'image',
        uri: saved.uri,
        bytes,
        mime: storedMimeType('image/jpeg', 'image'),
        name: null,
        size: bytes.length,
        width: saved.width ?? image.width,
        height: saved.height ?? image.height,
      },
    };
  } catch (error) {
    reportHandledError(error, { where: 'prepare chat photo' });
    return { status: 'failed' };
  }
}

/**
 * Picks any file. An image picked this way is still treated as an image — it
 * is what the person meant to send — but it is not re-encoded, so it keeps
 * whatever resolution and format it had.
 */
export async function pickChatFile(): Promise<PickAttachmentResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    // Without this the web picker inlines the whole file as a data URI, so a
    // ten-megabyte attachment arrives as a fourteen-megabyte string.
    base64: false,
  });
  if (picked.canceled || !picked.assets?.length) return { status: 'canceled' };

  const asset = picked.assets[0];
  // Checked before reading: the point of the limit is not to pull a huge file
  // into memory in the first place.
  if (asset.size !== undefined && asset.size > MAX_ATTACHMENT_BYTES) {
    return { status: 'tooLarge', size: asset.size };
  }

  try {
    const bytes = await readBytes(asset.uri);
    if (bytes.length > MAX_ATTACHMENT_BYTES) return { status: 'tooLarge', size: bytes.length };

    const kind = isImageMimeType(asset.mimeType) ? 'image' : 'file';
    return {
      status: 'ok',
      attachment: {
        kind,
        uri: asset.uri,
        bytes,
        mime: storedMimeType(asset.mimeType, kind),
        name: asset.name ?? null,
        size: bytes.length,
        width: null,
        height: null,
      },
    };
  } catch (error) {
    reportHandledError(error, { where: 'read picked chat file', name: asset.name });
    return { status: 'failed' };
  }
}
