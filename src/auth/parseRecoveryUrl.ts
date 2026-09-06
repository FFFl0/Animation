export type RecoveryTokens = { accessToken: string; refreshToken: string };

/**
 * Supabase's password-recovery redirect appends the tokens as a URL fragment
 * (`#access_token=...&refresh_token=...&type=recovery`), matching its web
 * behavior even for our custom `animequiz://` scheme.
 */
export function parseRecoveryUrl(url: string): RecoveryTokens | null {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const query = queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : '';

  const params = new URLSearchParams(fragment || query);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = params.get('type');

  if (accessToken && refreshToken && type === 'recovery') {
    return { accessToken, refreshToken };
  }
  return null;
}
