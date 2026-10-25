import { Language } from '../i18n/LanguageContext';

export type AttachmentKind = 'image' | 'file';

/** What a sent message carries. The bytes live in the `chat-media` bucket;
 * the row keeps only the path and enough metadata to draw the bubble before
 * the signed URL has been fetched. */
export type Attachment = {
  path: string;
  kind: AttachmentKind;
  /** The original file name. Null for a photo, which has no name worth showing. */
  name: string | null;
  size: number | null;
  /** Pixel size of an image, so its bubble can reserve the right shape
   * instead of jumping once the picture loads. Null for a file. */
  width: number | null;
  height: number | null;
};

/** Something picked but not yet uploaded, held by the composer. */
export type PendingAttachment = {
  kind: AttachmentKind;
  /** Local uri — what the preview above the composer shows. */
  uri: string;
  bytes: Uint8Array;
  /** The type the object is stored under. See `storedMimeType`. */
  mime: string;
  name: string | null;
  size: number;
  width: number | null;
  height: number | null;
};

/** The bucket's own limit is the same number; checking it here as well turns
 * a failed upload into a message the person can act on. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * What a file is stored as.
 *
 * Images keep their real type, because the bubble renders them and needs it.
 * Everything else is stored as `application/octet-stream` whatever it
 * actually is: a signed URL is served from the storage domain, and a browser
 * told it is being handed `text/html` would run that HTML there — on the
 * origin holding every conversation's files. Stored opaque, the same URL can
 * only ever be downloaded. The real type is not lost: it is implied by the
 * file name, which is what the system opens the file by.
 */
export function storedMimeType(mime: string | null | undefined, kind: AttachmentKind): string {
  if (kind !== 'image') return 'application/octet-stream';
  const lower = (mime ?? '').toLowerCase();
  return IMAGE_MIME_TYPES.includes(lower) ? lower : 'image/jpeg';
}

export function isImageMimeType(mime: string | null | undefined): boolean {
  return IMAGE_MIME_TYPES.includes((mime ?? '').toLowerCase());
}

/** Which conversation an attachment belongs to. Both halves of the union
 * turn into a folder the storage policy can read the permission off. */
export type MediaScope =
  | { kind: 'direct'; meId: string; peerId: string }
  | { kind: 'group'; groupId: string };

/**
 * The folder inside `chat-media` a conversation's files live in.
 *
 * The two participant ids are sorted, so both sides of a direct chat build
 * the same folder name and each can find what the other uploaded. The policy
 * accepts either order — sorting is what makes the two agree, not what makes
 * it safe.
 */
export function mediaFolder(scope: MediaScope): string {
  if (scope.kind === 'group') return `group/${scope.groupId}`;
  return `dm/${[scope.meId, scope.peerId].sort().join('_')}`;
}

/** The extension of a file name, dot included, or an empty string. Used to
 * keep the stored object's name meaningful — the system picks the app to
 * open a download by its extension, not by the type it was served as. */
export function extensionOf(name: string | null | undefined): string {
  if (!name) return '';
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return '';
  const ext = name.slice(dot).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

/**
 * Where one attachment is stored.
 *
 * The name is a timestamp plus a short random tail rather than a hash of the
 * contents: two people sending the same picture should get two objects, since
 * deleting one message must not blank the other. It is not a secret — the
 * bucket is private and the policy, not the name, is what keeps a stranger
 * out — it only has to not collide.
 */
export function attachmentPath(scope: MediaScope, fileName: string | null, kind: AttachmentKind): string {
  const tail = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const extension = extensionOf(fileName) || (kind === 'image' ? '.jpg' : '');
  return `${mediaFolder(scope)}/${tail}${extension}`;
}

const UNITS_RU = ['Б', 'КБ', 'МБ', 'ГБ'];
const UNITS_EN = ['B', 'KB', 'MB', 'GB'];

/** A size next to a file name. Rounded to one decimal above a kilobyte,
 * because "1.4 MB" says as much as "1,468,006 bytes" and fits the row. */
export function formatFileSize(bytes: number | null | undefined, lang: Language): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '';
  const units = lang === 'ru' ? UNITS_RU : UNITS_EN;

  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  const rounded = unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  const text = lang === 'ru' ? String(rounded).replace('.', ',') : String(rounded);
  return `${text} ${units[unit]}`;
}

/**
 * What the chat list shows for a message that is mostly an attachment. A
 * caption wins when there is one — it is what the person wrote — and
 * otherwise the row says what kind of thing arrived rather than nothing.
 */
export function attachmentPreview(
  body: string,
  attachment: Pick<Attachment, 'kind' | 'name'> | null,
  labels: { photo: string; file: string }
): string {
  if (body.trim().length > 0) return body;
  if (!attachment) return body;
  if (attachment.kind === 'image') return labels.photo;
  return attachment.name ?? labels.file;
}
