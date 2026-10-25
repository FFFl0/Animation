import { useEffect, useMemo, useState } from 'react';
import { SIGNED_URL_TTL_SECONDS, signedUrlsFor } from './attachmentStorage';

/** Re-signed well before the links expire, so a conversation left open does
 * not start showing broken pictures on the hour. */
const REFRESH_MS = (SIGNED_URL_TTL_SECONDS - 900) * 1000;

/**
 * Download links for every attachment on screen, keyed by storage path.
 *
 * All of them are signed together rather than one at a time: signing is a
 * single request for a batch, and a conversation usually gains attachments in
 * bursts. That does mean one new picture re-signs the others, which costs one
 * request and keeps every link's lifetime aligned — simpler than tracking an
 * expiry per path for no visible gain.
 */
export function useAttachmentUrls(paths: string[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map());

  // The effect keys off the sorted set rather than the array, so a re-render
  // that happens to rebuild the same list does not re-sign anything.
  const key = useMemo(() => [...new Set(paths)].sort().join('|'), [paths]);

  useEffect(() => {
    const wanted = key ? key.split('|') : [];
    if (wanted.length === 0) {
      setUrls(new Map());
      return;
    }

    let alive = true;
    const load = () => {
      void signedUrlsFor(wanted).then((fresh) => {
        if (alive) setUrls(fresh);
      });
    };
    load();

    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [key]);

  return urls;
}
