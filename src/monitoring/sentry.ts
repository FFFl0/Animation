import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting, off unless a DSN is configured.
 *
 * The DSN is a public key — it only allows *sending* events — which is why it
 * rides in EXPO_PUBLIC_SENTRY_DSN alongside the Supabase anon key rather than
 * in a build secret. With it absent (a local checkout, a fork, the web build)
 * every call here is a no-op, so nothing has to guard its own call sites.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isCrashReportingEnabled = !!DSN;

export function initCrashReporting(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    // A build number is what actually identifies an install, so a report can
    // be traced to the exact APK rather than to "1.0.0".
    release: `animequiz@${Constants.expoConfig?.version ?? '0.0.0'}`,
    dist: Application.nativeBuildVersion ?? undefined,
    environment: __DEV__ ? 'development' : 'production',
    // Reports exist to fix crashes, not to profile players: no session
    // replay, no default personal data, and a sampled trace rather than one
    // per interaction.
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    enabled: !__DEV__,
  });

  Sentry.setTag('platform', Platform.OS);
}

/**
 * Ties a report to an account without revealing who it is: the id is already
 * an opaque uuid, and the username is deliberately left out — the privacy
 * policy promises reports carry no personal data.
 */
export function identifyForCrashReports(userId: string | null): void {
  if (!DSN) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

/**
 * Report something that was handled but should not have happened — a failed
 * upload, a query that came back malformed. Swallowed errors are invisible
 * otherwise.
 */
export function reportHandledError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** Leaves a trail of what the player was doing before a crash. */
export function leaveBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.addBreadcrumb({ message, data, level: 'info' });
}
