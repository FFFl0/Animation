import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

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
  | { status: 'ok'; photoUri: string }
  | { status: 'canceled' }
  | { status: 'permissionDenied' }
  | { status: 'failed' };

/**
 * Asks for a picture from the device gallery and returns it as a `data:` URI.
 *
 * Inlining the bytes instead of uploading them keeps avatars working in the
 * fully local mode (no Supabase configured at all) and, when Supabase *is*
 * configured, lets the picture ride along in the `profiles.avatar` JSON that
 * already syncs between devices and is already readable by friends — no
 * storage bucket and no extra access rules to set up. That only holds while
 * the payload stays small — a leaderboard page pulls fifty of these at once —
 * hence the downscale above.
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
    return { status: 'ok', photoUri: `data:image/jpeg;base64,${saved.base64}` };
  } catch {
    return { status: 'failed' };
  }
}
