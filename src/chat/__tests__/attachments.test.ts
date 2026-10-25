import {
  MAX_ATTACHMENT_BYTES,
  attachmentPath,
  attachmentPreview,
  extensionOf,
  formatDuration,
  formatFileSize,
  isAudioMimeType,
  isImageMimeType,
  mediaFolder,
  storedMimeType,
} from '../attachments';

describe('mediaFolder', () => {
  it('sorts the two ids so both sides of a direct chat build the same folder', () => {
    const a = mediaFolder({ kind: 'direct', meId: 'bbb', peerId: 'aaa' });
    const b = mediaFolder({ kind: 'direct', meId: 'aaa', peerId: 'bbb' });
    expect(a).toBe('dm/aaa_bbb');
    expect(b).toBe(a);
  });

  it('puts a group under its own id', () => {
    expect(mediaFolder({ kind: 'group', groupId: 'g-1' })).toBe('group/g-1');
  });

  it('starts every path with the scope the storage policy reads permission off', () => {
    expect(mediaFolder({ kind: 'direct', meId: 'a', peerId: 'b' }).split('/')[0]).toBe('dm');
    expect(mediaFolder({ kind: 'group', groupId: 'g' }).split('/')[0]).toBe('group');
  });
});

describe('attachmentPath', () => {
  const scope = { kind: 'group' as const, groupId: 'g-1' };

  it('keeps the file inside its conversation folder', () => {
    expect(attachmentPath(scope, 'notes.pdf', 'file').startsWith('group/g-1/')).toBe(true);
  });

  it('keeps the extension, because the system opens a download by its name', () => {
    expect(attachmentPath(scope, 'notes.pdf', 'file').endsWith('.pdf')).toBe(true);
  });

  it('gives a nameless photo a jpg extension', () => {
    expect(attachmentPath(scope, null, 'image').endsWith('.jpg')).toBe(true);
  });

  it('gives a voice note an m4a extension when it was not named', () => {
    expect(attachmentPath(scope, null, 'voice').endsWith('.m4a')).toBe(true);
    // A browser records webm, and the recorder names it so.
    expect(attachmentPath(scope, 'voice.webm', 'voice').endsWith('.webm')).toBe(true);
  });

  it('leaves a nameless file without one rather than inventing a type', () => {
    expect(attachmentPath(scope, null, 'file')).toMatch(/^group\/g-1\/[a-z0-9-]+$/);
  });

  it('does not collide across calls', () => {
    const paths = new Set(Array.from({ length: 50 }, () => attachmentPath(scope, 'a.png', 'image')));
    expect(paths.size).toBe(50);
  });
});

describe('extensionOf', () => {
  it('reads a plain extension', () => {
    expect(extensionOf('report.PDF')).toBe('.pdf');
  });

  it('takes the last one of a multi-part name', () => {
    expect(extensionOf('archive.tar.gz')).toBe('.gz');
  });

  it('is empty when there is nothing usable', () => {
    expect(extensionOf(null)).toBe('');
    expect(extensionOf('README')).toBe('');
    expect(extensionOf('.gitignore')).toBe('');
    expect(extensionOf('trailing.')).toBe('');
  });

  it('refuses anything that is not a short alphanumeric suffix', () => {
    // A crafted name must not be able to smuggle characters into the path.
    expect(extensionOf('photo.jpg/../../secret')).toBe('');
    expect(extensionOf('file.verylongextension')).toBe('');
    expect(extensionOf('file.a b')).toBe('');
  });
});

describe('storedMimeType', () => {
  it('keeps a real image type, which the bubble needs to render it', () => {
    expect(storedMimeType('image/png', 'image')).toBe('image/png');
    expect(storedMimeType('IMAGE/WEBP', 'image')).toBe('image/webp');
  });

  it('keeps a real audio type, which the player needs to play the note', () => {
    expect(storedMimeType('audio/webm', 'voice')).toBe('audio/webm');
    expect(storedMimeType('audio/mp4', 'voice')).toBe('audio/mp4');
  });

  it('stores anything else opaque, so a signed URL can never render script', () => {
    expect(storedMimeType('text/html', 'file')).toBe('application/octet-stream');
    expect(storedMimeType('application/pdf', 'file')).toBe('application/octet-stream');
    expect(storedMimeType('image/png', 'file')).toBe('application/octet-stream');
    // Even asked for as audio: only a voice note is stored playable.
    expect(storedMimeType('audio/webm', 'file')).toBe('application/octet-stream');
  });

  it('falls back to jpeg for an image of an unsupported type', () => {
    expect(storedMimeType('image/heic', 'image')).toBe('image/jpeg');
    expect(storedMimeType(null, 'image')).toBe('image/jpeg');
  });

  it('falls back to mp4 audio for a recording of an unsupported type', () => {
    expect(storedMimeType('audio/ogg', 'voice')).toBe('audio/mp4');
    expect(storedMimeType(null, 'voice')).toBe('audio/mp4');
  });
});

describe('isImageMimeType', () => {
  it('accepts only the types the bucket allows', () => {
    expect(isImageMimeType('image/jpeg')).toBe(true);
    expect(isImageMimeType('image/gif')).toBe(true);
    expect(isImageMimeType('image/svg+xml')).toBe(false);
    expect(isImageMimeType(undefined)).toBe(false);
  });
});

describe('isAudioMimeType', () => {
  it('accepts only the types the bucket allows', () => {
    expect(isAudioMimeType('audio/mp4')).toBe(true);
    expect(isAudioMimeType('audio/webm')).toBe(true);
    // Not on the list: it would be served inline and is not what we record.
    expect(isAudioMimeType('audio/ogg')).toBe(false);
    expect(isAudioMimeType(undefined)).toBe(false);
  });
});

describe('formatDuration', () => {
  it('reads as a clock', () => {
    expect(formatDuration(7_000)).toBe('0:07');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(600_000)).toBe('10:00');
  });

  it('rounds down, so a note never claims to be longer than it is', () => {
    expect(formatDuration(7_900)).toBe('0:07');
  });

  it('falls back to zero rather than showing nothing', () => {
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(undefined)).toBe('0:00');
    expect(formatDuration(-500)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});

describe('formatFileSize', () => {
  it('counts bytes whole and larger units to one decimal', () => {
    expect(formatFileSize(512, 'en')).toBe('512 B');
    expect(formatFileSize(2048, 'en')).toBe('2 KB');
    expect(formatFileSize(1_468_006, 'en')).toBe('1.4 MB');
  });

  it('uses a comma for the decimal in Russian', () => {
    expect(formatFileSize(1_468_006, 'ru')).toBe('1,4 МБ');
    expect(formatFileSize(512, 'ru')).toBe('512 Б');
  });

  it('stops at gigabytes rather than running out of units', () => {
    expect(formatFileSize(5 * 1024 ** 4, 'en')).toBe('5120 GB');
  });

  it('says nothing for a size that is not a number', () => {
    expect(formatFileSize(null, 'en')).toBe('');
    expect(formatFileSize(undefined, 'en')).toBe('');
    expect(formatFileSize(-1, 'en')).toBe('');
    expect(formatFileSize(Number.NaN, 'en')).toBe('');
  });

  it('describes the limit the composer shows', () => {
    expect(formatFileSize(MAX_ATTACHMENT_BYTES, 'en')).toBe('10 MB');
  });
});

describe('attachmentPreview', () => {
  const labels = { photo: 'Photo', file: 'File', voice: 'Voice message' };

  it('prefers the caption, which is what the person actually wrote', () => {
    expect(attachmentPreview('look at this', { kind: 'image', name: null }, labels)).toBe('look at this');
  });

  it('names the kind when a photo came with no caption', () => {
    expect(attachmentPreview('', { kind: 'image', name: null }, labels)).toBe('Photo');
    expect(attachmentPreview('   ', { kind: 'image', name: null }, labels)).toBe('Photo');
  });

  it('names a voice note, which has no name of its own worth showing', () => {
    expect(attachmentPreview('', { kind: 'voice', name: 'voice.m4a' }, labels)).toBe('Voice message');
  });

  it('uses a file name when there is one, and falls back when there is not', () => {
    expect(attachmentPreview('', { kind: 'file', name: 'notes.pdf' }, labels)).toBe('notes.pdf');
    expect(attachmentPreview('', { kind: 'file', name: null }, labels)).toBe('File');
  });

  it('leaves a plain message alone', () => {
    expect(attachmentPreview('hello', null, labels)).toBe('hello');
  });
});
