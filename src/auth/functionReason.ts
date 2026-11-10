/**
 * The reason an Edge Function gave, out of the error the client wraps it in.
 *
 * supabase-js treats any non-2xx as one error — "Edge Function returned a
 * non-2xx status code" — and hands the untouched Response over as
 * `context`. Without reading it, every refusal a function spells out (not
 * enough points, this receipt was rejected, no attempts left) reaches the
 * screen as "no connection to the server", which is both wrong and
 * unhelpful. So the body is read here, and only a genuinely unreadable
 * answer is reported as a network problem.
 */
export async function reasonOf(error: unknown): Promise<string> {
  const context = (error as { context?: unknown })?.context;
  if (typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Not JSON, or already read — fall through to 'network'.
    }
  }
  return 'network';
}
