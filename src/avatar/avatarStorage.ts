import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { base64ToBytes } from './base64';
import { reportHandledError } from '../monitoring/sentry';

const BUCKET = 'avatars';

/**
 * Everything in the bucket lives under a folder named after the uploader's
 * own user id — that is what the storage policies key on, so a group picture
 * goes there too, told apart by its file name rather than its folder.
 */
const PROFILE_PREFIX = 'avatar';
const groupPrefix = (groupId: string) => `group-${groupId}`;

/** Files under this user's folder whose name starts with `prefix` — used to
 * clear the previous picture so the bucket doesn't grow one file per change.
 * The prefix matters: deleting a profile photo must not take the user's
 * group pictures with it. */
async function listOwnFiles(userId: string, prefix: string): Promise<string[]> {
  const { data, error } = await supabase!.storage.from(BUCKET).list(userId);
  if (error || !data) return [];
  return data.filter((file) => file.name.startsWith(`${prefix}-`)).map((file) => `${userId}/${file.name}`);
}

/**
 * Uploads a picture to the `avatars` bucket and returns its public URL, or
 * `null` when there is no Supabase project configured (fully local mode) or
 * the upload failed — the caller then falls back to inlining the picture, so
 * picking an avatar never hard-fails.
 *
 * The file name carries a timestamp: the bucket is served through a CDN, and
 * reusing one path would leave the old picture cached under the same URL.
 */
async function upload(userId: string, prefix: string, base64: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const stale = await listOwnFiles(userId, prefix);
  const path = `${userId}/${prefix}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToBytes(base64), { contentType: 'image/jpeg', upsert: true });
  if (error) {
    // The caller falls back quietly, so without this the only trace of a
    // broken bucket would be players saying their avatar "doesn't save".
    reportHandledError(error, { where: 'avatar upload', prefix });
    return null;
  }

  if (stale.length > 0) await supabase.storage.from(BUCKET).remove(stale);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Failures are ignored: whatever pointed at the file no longer does, and a
 * leftover object is replaced by the next upload. */
async function remove(userId: string, prefix: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const files = await listOwnFiles(userId, prefix);
  if (files.length > 0) await supabase.storage.from(BUCKET).remove(files);
}

export const uploadAvatarPhoto = (userId: string, base64: string) => upload(userId, PROFILE_PREFIX, base64);

export const deleteAvatarPhoto = (userId: string) => remove(userId, PROFILE_PREFIX);

/** Stored under the uploader's folder, which is why only the owner — the one
 * allowed to change a group's picture anyway — can replace it. */
export const uploadGroupPhoto = (ownerId: string, groupId: string, base64: string) =>
  upload(ownerId, groupPrefix(groupId), base64);

export const deleteGroupPhoto = (ownerId: string, groupId: string) => remove(ownerId, groupPrefix(groupId));
