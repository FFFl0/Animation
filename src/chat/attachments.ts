import { Language } from '../i18n/LanguageContext';

export type AttachmentKind = 'image' | 'file' | 'voice';

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
  /** Length of a voice note, so the bubble can show it before the audio has
   * been fetched. Null for anything else. */
  durationMs: number | null;
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
  durationMs: number | null;
};

/** The bucket's own limit is the same number; checking it here as well turns
 * a failed upload into a message the person can act on. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** What a voice note may be stored as. A phone records m4a, a browser webm. */
const AUDIO_MIME_TYPES = ['audio/mp4', 'audio/mpeg', 'audio/webm', 'audio/aac'];

/**
 * What a file is stored as.
 *
 * Pictures and voice notes keep their real type, because the app plays and
 * renders them and needs to know what they are. Everything else is stored as
 * `application/octet-stream` whatever it actually is: a signed URL is served
 * from the storage domain, and a browser told it is being handed `text/html`
 * would run that HTML there — on the origin holding every conversation's
 * files. Stored opaque, the same URL can only ever be downloaded. The real
 * type is not lost: it is implied by the file name, which is what the system
 * opens the file by.
 *
 * Images and audio are exceptions because neither becomes code when a browser
 * opens it — a picture is drawn and a recording is played. Which is also why
 * the lists are closed rather than a blanket `image/*` and `audio/*`.
 */
export function storedMimeType(mime: string | null | undefined, kind: AttachmentKind): string {
  const lower = (mime ?? '').toLowerCase();
  if (kind === 'image') return IMAGE_MIME_TYPES.includes(lower) ? lower : 'image/jpeg';
  if (kind === 'voice') return AUDIO_MIME_TYPES.includes(lower) ? lower : 'audio/mp4';
  return 'application/octet-stream';
}

export function isImageMimeType(mime: string | null | undefined): boolean {
  return IMAGE_MIME_TYPES.includes((mime ?? '').toLowerCase());
}

export function isAudioMimeType(mime: string | null | undefined): boolean {
  return AUDIO_MIME_TYPES.includes((mime ?? '').toLowerCase());
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
  const fallback = kind === 'image' ? '.jpg' : kind === 'voice' ? '.m4a' : '';
  const extension = extensionOf(fileName) || fallback;
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
  labels: { photo: string; file: string; voice: string }
): string {
  if (body.trim().length > 0) return body;
  if (!attachment) return body;
  if (attachment.kind === 'image') return labels.photo;
  if (attachment.kind === 'voice') return labels.voice;
  return attachment.name ?? labels.file;
}

/**
 * A voice note's length, as a clock rather than a count of seconds — "1:05"
 * is read at a glance where "65 с" has to be converted. Rounded down, so a
 * note never claims to be longer than it is, and clamped at zero for a
 * recording that was cut before anything was captured.
 */
export function formatDuration(durationMs: number | null | undefined): string {
  if (durationMs === null || durationMs === undefined || !Number.isFinite(durationMs)) return '0:00';
  const total = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
