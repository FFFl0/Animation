import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { reportHandledError } from '../monitoring/sentry';
import { Attachment, MediaScope, PendingAttachment, attachmentPath } from './attachments';

const BUCKET = 'chat-media';

/**
 * How long a download link stays valid.
 *
 * The bucket is private, so a picture in a bubble is fetched through a signed
 * URL rather than a public one. An hour is long enough that scrolling an old
 * conversation never re-signs mid-read, and short enough that a link copied
 * out of the app stops working well before it could be passed around.
 */
export const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Puts the bytes in the bucket and returns what the message row should carry.
 *
 * `upsert: false` on purpose: paths are generated per upload, so a collision
 * would mean something is wrong, and silently overwriting it would blank
 * somebody else's attachment.
 */
export async function uploadAttachment(
  scope: MediaScope,
  pending: PendingAttachment
): Promise<Attachment | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const path = attachmentPath(scope, pending.name, pending.kind);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, pending.bytes, { contentType: pending.mime, upsert: false });

  if (error) {
    // The composer tells the person the send failed; without this the only
    // trace of a missing bucket or a bad policy would be "photos don't send".
    reportHandledError(error, { where: 'chat attachment upload', kind: pending.kind });
    return null;
  }

  return {
    path,
    kind: pending.kind,
    name: pending.name,
    size: pending.size,
    width: pending.width,
    height: pending.height,
  };
}

/** Signed links for a batch of paths, keyed by path. Paths the caller may not
 * read come back missing rather than throwing, so one unreadable attachment
 * does not cost the whole conversation its pictures. */
export async function signedUrlsFor(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (!isSupabaseConfigured || !supabase || paths.length === 0) return urls;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return urls;

  for (const row of data) {
    if (row.path && row.signedUrl) urls.set(row.path, row.signedUrl);
  }
  return urls;
}

/**
 * Copies an attachment into another conversation's folder, for a forward.
 *
 * A folder is what the storage policy reads permission off, so the recipients
 * of the forward cannot see the original object — it lives in a folder they
 * are not part of. The copy runs server-side as the caller, which means both
 * halves are still checked against the policy: it only succeeds because the
 * person forwarding can read the source and write the destination.
 */
export async function copyAttachmentTo(scope: MediaScope, attachment: Attachment): Promise<Attachment | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const path = attachmentPath(scope, attachment.name, attachment.kind);
  const { error } = await supabase.storage.from(BUCKET).copy(attachment.path, path);
  if (error) {
    reportHandledError(error, { where: 'copy chat attachment for forward' });
    return null;
  }
  return { ...attachment, path };
}

/** Drops the object a deleted message pointed at. Failures are ignored: the
 * message is already gone, and a leftover object is unreachable anyway — the
 * only thing that could still name it was the row. */
export async function removeAttachment(path: string | null | undefined): Promise<void> {
  if (!path || !isSupabaseConfigured || !supabase) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
