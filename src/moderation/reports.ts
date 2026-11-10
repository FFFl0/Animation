/**
 * What a report is, with nothing attached to the network — so the shape the
 * server is asked in can be checked against the SQL without loading the
 * rest of the app.
 */
export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'other';

export const REPORT_REASONS: ReportReason[] = ['spam', 'abuse', 'inappropriate', 'other'];

/** What a report is about: one message, or the person as a whole. */
export type ReportTarget =
  | { kind: 'direct_message' | 'group_message'; messageId: string }
  | { kind: 'user'; userId: string };

/** Longest note a report can carry; the server cuts anything past it. */
export const REPORT_COMMENT_MAX = 500;

/** The arguments report_content takes, spelled out so a test can hold them to the SQL. */
export function reportArgs(target: ReportTarget, reason: ReportReason, comment: string) {
  return {
    p_kind: target.kind,
    p_message: target.kind === 'user' ? null : target.messageId,
    p_user: target.kind === 'user' ? target.userId : null,
    p_reason: reason,
    p_comment: comment.trim().slice(0, REPORT_COMMENT_MAX) || null,
  };
}
