export type RecoveryTokens = { accessToken: string; refreshToken: string };

function extractParams(url: string): URLSearchParams {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : '';
  const query = queryIndex >= 0 ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined) : '';
  return new URLSearchParams(fragment || query);
}

/**
 * Supabase's password-recovery redirect appends the tokens as a URL fragment
 * (`#access_token=...&refresh_token=...&type=recovery`), matching its web
 * behavior even for our custom `animequiz://` scheme.
 */
export function parseRecoveryUrl(url: string): RecoveryTokens | null {
  const params = extractParams(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken && params.get('type') === 'recovery') {
    return { accessToken, refreshToken };
  }
  return null;
}

/**
 * Same shape, without requiring `type=recovery` — used for the Google OAuth
 * callback, whose redirect carries tokens but no `type` param.
 */
export function parseAuthTokensFromUrl(url: string): RecoveryTokens | null {
  const params = extractParams(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}
