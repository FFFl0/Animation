import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { reportHandledError } from '../monitoring/sentry';

/**
 * Side of the square the picked photo is downscaled to. Profile pictures are
 * never shown larger than 120pt, so 224px still looks sharp while keeping the
 * encoded string small enough to live inside the profile row itself (see
 * below): even a worst-case picture (pure noise, which compresses far worse
 * than any real photo) lands at ~14 KB of base64 at these settings.
 */
const PHOTO_SIZE = 224;
const PHOTO_QUALITY = 0.6;

export type PickPhotoResult =
  /** `base64` is the JPEG to upload; `dataUri` the same bytes ready to be
   * used directly when there is nowhere to upload them to. */
  | { status: 'ok'; base64: string; dataUri: string }
  | { status: 'canceled' }
  | { status: 'permissionDenied' }
  | { status: 'failed' };

/**
 * Asks for a picture from the device gallery, crops it square and re-encodes
 * it small.
 *
 * The result goes to the `avatars` storage bucket (see avatarStorage.ts) so
 * the profile itself only carries a URL. Without a Supabase project — or if
 * the upload fails — the caller inlines `dataUri` in the profile instead,
 * which still works everywhere; the downscale above is what keeps that
 * fallback cheap enough for a leaderboard page pulling fifty of them.
 */
export async function pickProfilePhoto(): Promise<PickPhotoResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'permissionDenied' };

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.length) return { status: 'canceled' };

  const asset = picked.assets[0];
  try {
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    // The square crop the picker offers is native-only, so crop to the middle
    // square here as well — otherwise a portrait photo picked on the web comes
    // out squashed by the resize below.
    const side = Math.min(asset.width, asset.height);
    if (side > 0 && asset.width !== asset.height) {
      context.crop({
        originX: Math.round((asset.width - side) / 2),
        originY: Math.round((asset.height - side) / 2),
        width: side,
        height: side,
      });
    }
    const image = await context.resize({ width: PHOTO_SIZE, height: PHOTO_SIZE }).renderAsync();
    const saved = await image.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: PHOTO_QUALITY,
      base64: true,
    });
    if (!saved.base64) return { status: 'failed' };
    return { status: 'ok', base64: saved.base64, dataUri: `data:image/jpeg;base64,${saved.base64}` };
  } catch (error) {
    reportHandledError(error, { where: 'crop and encode picked photo' });
    return { status: 'failed' };
  }
}
