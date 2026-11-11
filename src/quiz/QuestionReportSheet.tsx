import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import Icon from '../components/Icon';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useT } from '../i18n/strings';
import { Question } from './generateQuiz';
import { QUESTION_COMMENT_MAX, QUESTION_REPORT_REASONS, QuestionReportReason } from './questionReports';
import { sendQuestionReport } from './questionReportApi';

type Props = {
  /** The question being reported; null keeps the sheet closed. */
  question: Question | null;
  /** What the player tapped on it; -1 when the clock ran out. */
  picked: number;
  onClose: () => void;
  /** Called once the report is in, so the quiz can stop offering to send it again. */
  onSent: () => void;
};

type Step = 'form' | 'sending' | 'sent' | 'failed';

/**
 * "There is a mistake in this question."
 *
 * Opened from under a revealed answer, in the middle of a round, so it asks
 * for as little as it can: one tap for what is wrong, a note only if the
 * player wants to leave one. What the question said and which answer the
 * app counted as right are sent along without being asked for — the person
 * reporting should not have to retype a question they are looking at.
 */
export default function QuestionReportSheet({ question, picked, onClose, onSent }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { language } = useLanguage();
  const [reason, setReason] = useState<QuestionReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<Step>('form');

  // A sheet reopened for another question starts clean.
  useEffect(() => {
    if (!question) return;
    setReason(null);
    setComment('');
    setStep('form');
  }, [question]);

  const submit = async () => {
    if (!question || !reason) return;
    setStep('sending');
    try {
      await sendQuestionReport(question, language, picked, reason, comment);
      setStep('sent');
      onSent();
    } catch {
      setStep('failed');
    }
  };

  return (
    <Modal visible={!!question} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={() => {}}>
            {/* Scrolls rather than assuming it fits: five reasons and a note
                are taller than a small phone with its keyboard up. */}
            <ScrollView contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
            {step === 'sent' ? (
              <>
                <Text style={styles.title}>{t('questionReport.sentTitle')}</Text>
                <Text style={styles.text}>{t('questionReport.sentText')}</Text>
                <SoundTouchable style={styles.primaryButton} onPress={onClose} accessibilityRole="button">
                  <Text style={styles.primaryButtonText}>{t('questionReport.done')}</Text>
                </SoundTouchable>
              </>
            ) : (
              <>
                <Text style={styles.title}>{t('questionReport.title')}</Text>
                <Text style={styles.text}>{t('questionReport.hint')}</Text>

                {QUESTION_REPORT_REASONS.map((option) => {
                  const chosen = reason === option;
                  return (
                    <SoundTouchable
                      key={option}
                      style={[styles.reason, chosen && styles.reasonPicked]}
                      onPress={() => setReason(option)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: chosen }}
                      testID={`question-report-${option}`}
                    >
                      <View style={[styles.radio, chosen && styles.radioPicked]}>
                        {chosen && <Icon name="check" size={11} color={theme.onPrimary} />}
                      </View>
                      <Text style={styles.reasonText}>{t(`questionReport.reason.${option}`)}</Text>
                    </SoundTouchable>
                  );
                })}

                <TextInput
                  style={styles.input}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('questionReport.commentPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  maxLength={QUESTION_COMMENT_MAX}
                  multiline
                />

                {step === 'failed' && <Text style={styles.error}>{t('questionReport.failed')}</Text>}

                <SoundTouchable
                  style={[styles.primaryButton, (!reason || step === 'sending') && styles.disabled]}
                  onPress={submit}
                  disabled={!reason || step === 'sending'}
                  accessibilityRole="button"
                  testID="question-report-send"
                >
                  <Text style={styles.primaryButtonText}>
                    {t(step === 'sending' ? 'questionReport.sending' : 'questionReport.send')}
                  </Text>
                </SoundTouchable>
                <SoundTouchable style={styles.ghostButton} onPress={onClose} accessibilityRole="button">
                  <Text style={styles.ghostButtonText}>{t('questionReport.cancel')}</Text>
                </SoundTouchable>
              </>
            )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
    card: {
      backgroundColor: theme.card,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.border,
      maxHeight: '100%',
      overflow: 'hidden',
    },
    cardContent: { padding: 20 },
    title: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.text },
    text: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 6, marginBottom: 12 },
    reason: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      marginBottom: 8,
    },
    reasonPicked: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioPicked: { borderColor: theme.primary, backgroundColor: theme.primary },
    reasonText: { flex: 1, fontSize: 14, lineHeight: 19, fontFamily: fontFamily('700'), color: theme.text },
    input: {
      minHeight: 56,
      maxHeight: 110,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.background,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      fontFamily: fontFamily('500'),
      color: theme.text,
      textAlignVertical: 'top',
      marginTop: 4,
    },
    error: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.danger, marginTop: 10 },
    primaryButton: {
      marginTop: 14,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: radius.lg,
      backgroundColor: theme.primary,
    },
    primaryButtonText: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.onPrimary },
    ghostButton: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
    ghostButtonText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.textMuted },
    disabled: { opacity: 0.5 },
  });
}
