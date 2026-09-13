import { AuthError } from './authError';

export const USERNAME_MAX = 20;

export function validateUsername(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length < 3) throw new AuthError('Имя пользователя должно быть не короче 3 символов', 'usernameTooShort');
  if (trimmed.length > USERNAME_MAX) {
    throw new AuthError(`Имя пользователя не длиннее ${USERNAME_MAX} символов`, 'usernameTooLong');
  }
  return trimmed;
}

export function validateCredentials(username: string, password: string): string {
  const trimmed = validateUsername(username);
  if (password.length < 4) throw new AuthError('Пароль должен быть не короче 4 символов', 'passwordTooShort');
  return trimmed;
}

const SYNTHETIC_EMAIL_DOMAIN = '@animequiz.local';

/** Supabase Auth needs an email; we synthesize one from the username. */
export function usernameToEmail(username: string): string {
  const local = username.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  return `${local}${SYNTHETIC_EMAIL_DOMAIN}`;
}

