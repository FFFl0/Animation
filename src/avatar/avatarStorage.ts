import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { base64ToBytes } from './base64';

const BUCKET = 'avatars';
/** Everything this player has under their own folder — used to clear the
 * previous picture so the bucket doesn't grow one file per change. */
async function listOwnFiles(userId: string): Promise<string[]> {
  const { data, error } = await supabase!.storage.from(BUCKET).list(userId);
  if (error || !data) return [];
  return data.map((file) => `${userId}/${file.name}`);
}

/**
 * Uploads the picture to the `avatars` bucket and returns its public URL,
 * or `null` when there is no Supabase project configured (fully local mode)
 * or the upload failed — the caller then falls back to inlining the picture
 * in the profile itself, so picking an avatar never hard-fails.
 *
 * The file name carries a timestamp: the bucket is served through a CDN, and
 * reusing one path would leave the old picture cached under the same URL.
 */
export async function uploadAvatarPhoto(userId: string, base64: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const stale = await listOwnFiles(userId);
  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) return null;

  if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Drops the player's uploaded picture from the bucket. Failures are
 * ignored: the profile no longer points at the file either way, and a
 * leftover object is replaced by the next upload. */
export async function deleteAvatarPhoto(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const files = await listOwnFiles(userId);
  if (files.length > 0) await supabase.storage.from(BUCKET).remove(files);
}
