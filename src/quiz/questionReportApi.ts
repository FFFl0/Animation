import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { isLayoutCheck } from '../monitoring/layoutCheck';
import { Question } from './generateQuiz';
import { QuestionReportReason, questionReportArgs } from './questionReports';

/** Reports go to the server; without one there is nowhere to send them. */
export const canReportQuestions = isSupabaseConfigured || isLayoutCheck;

/** Version and build, so a report can be matched to the catalogue it saw. */
function appVersion(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build = Application.nativeBuildVersion;
  return build ? `${version} (${build})` : version;
}

/** Sends a report about a question; throws when it did not get through. */
export async function sendQuestionReport(
  question: Question,
  language: string,
  picked: number,
  reason: QuestionReportReason,
  comment: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('offline');
  const { error } = await supabase.rpc(
    'report_question',
    questionReportArgs(question, { language, picked, reason, comment, appVersion: appVersion() })
  );
  if (error) throw error;
}
