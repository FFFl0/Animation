import { AuthError } from './authError';

export function validateCredentials(username: string, password: string): string {
  const trimmed = username.trim();
  if (trimmed.length < 3) throw new AuthError('Имя пользователя должно быть не короче 3 символов');
  if (password.length < 4) throw new AuthError('Пароль должен быть не короче 4 символов');
  return trimmed;
}

const SYNTHETIC_EMAIL_DOMAIN = '@animequiz.local';

/** Supabase Auth needs an email; we synthesize one from the username. */
export function usernameToEmail(username: string): string {
  const local = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  return `${local}${SYNTHETIC_EMAIL_DOMAIN}`;
}

/** True for our synthesized addresses — these can't receive real mail, so password reset can't work for them. */
export function isSyntheticEmail(email: string): boolean {
  return email.endsWith(SYNTHETIC_EMAIL_DOMAIN);
}
