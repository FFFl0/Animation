import * as Local from './storage';
import * as Remote from './supabaseBackend';
import { isSupabaseConfigured } from './supabaseClient';

export { AuthError } from './authError';
export const mergeStat = Local.mergeStat;
export const bumpStreak = Local.bumpStreak;

const impl = isSupabaseConfigured ? Remote : Local;

export const register = impl.register;
export const login = impl.login;
export const logout = impl.logout;
export const getSessionProfile = impl.getSessionProfile;
export const updateAccount = impl.updateAccount;
export const subscribeProfile = isSupabaseConfigured ? Remote.subscribeProfile : Local.subscribeProfile;
export const requestPasswordReset = impl.requestPasswordReset;
export const completeRecoverySession = impl.completeRecoverySession;
export const updatePassword = impl.updatePassword;
export const signInWithGoogle = impl.signInWithGoogle;
