export type AuthErrorCode =
  | 'usernameTooShort'
  | 'usernameTooLong'
  | 'passwordTooShort'
  | 'usernameTaken'
  | 'invalidCredentials'
  | 'userNotFound'
  | 'wrongPassword'
  | 'profileNotFound'
  | 'accountCreateFailed'
  | 'serverUnreachable'
  | 'loginFailed'
  | 'localAccountUnavailable'
  | 'googleUnavailableLocal'
  | 'googleStartFailed'
  | 'googleCancelled'
  | 'googleCompleteFailed'
  | 'googleUserFetchFailed'
  | 'deleteAccountFailed'
  | 'renameFailed';

export class AuthError extends Error {
  code?: AuthErrorCode;

  constructor(message: string, code?: AuthErrorCode) {
    super(message);
    this.code = code;
  }
}
