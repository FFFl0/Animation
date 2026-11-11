import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';

/**
 * Asks the server to pass new reports on to the developer's Telegram.
 *
 * Nothing is sent from here: the function finds the unsent reports in the
 * database itself. So this is fire-and-forget — a call that fails costs
 * nothing, because the report stays marked as unsent and goes out with the
 * next one anybody files.
 */
export function pokeReportNotify(): void {
  if (!isSupabaseConfigured || !supabase) return;
  supabase.functions.invoke('report-notify', { body: {} }).catch(() => {});
}
