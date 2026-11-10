import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import SoundTouchable from '../sound/SoundTouchable';
import Icon from '../components/Icon';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useT } from '../i18n/strings';
import { REPORT_COMMENT_MAX, REPORT_REASONS, ReportReason, ReportTarget, sendReport } from './moderationApi';
import { useModeration } from './ModerationContext';

type Props = {
  /** What is being reported; null keeps the sheet closed. */
  target: ReportTarget | null;
  /** Who wrote it — lets the sheet offer to block them once the report is in. */
  authorId?: string;
  authorName?: string;
  onClose: () => void;
  /** Called after the author was blocked from here, so a chat can step out of a conversation that no longer exists. */
  onBlocked?: () => void;
};

type Step = 'form' | 'sending' | 'sent' | 'failed';

/**
 * Reporting a message or a person.
 *
 * A reason is asked for and a note is optional, because the person
 * reporting is usually upset and should not have to write an essay to be
 * heard. Once the report is in, the sheet offers the one thing that helps
 * right now — blocking the author — since a report is read by a human
 * later, and "later" is no comfort to somebody still receiving messages.
 */
export default function ReportSheet({ target, authorId, authorName, onClose, onBlocked }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const { block, isBlocked } = useModeration();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState<Step>('form');

  // A sheet reopened for something else starts clean.
  useEffect(() => {
    if (!target) return;
    setReason(null);
    setComment('');
    setStep('form');
  }, [target]);

  const submit = async () => {
    if (!target || !reason) return;
    setStep('sending');
    try {
      await sendReport(target, reason, comment);
      setStep('sent');
    } catch {
      setStep('failed');
    }
  };

  const blockAuthor = async () => {
    if (!authorId) return;
    if (await block(authorId)) {
      onClose();
      onBlocked?.();
    }
  };

  const canBlock = !!authorId && !isBlocked(authorId);

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={() => {}}>
            {step === 'sent' ? (
              <>
                <Text style={styles.title}>{t('moderation.sentTitle')}</Text>
                <Text style={styles.text}>{t('moderation.sentText')}</Text>
                {canBlock && (
                  <SoundTouchable style={styles.dangerButton} onPress={blockAuthor} accessibilityRole="button">
                    <Text style={styles.dangerButtonText}>
                      {t('moderation.blockNamed', authorName ?? t('moderation.thisUser'))}
                    </Text>
                  </SoundTouchable>
                )}
                <SoundTouchable style={styles.ghostButton} onPress={onClose} accessibilityRole="button">
                  <Text style={styles.ghostButtonText}>{t('moderation.done')}</Text>
                </SoundTouchable>
              </>
            ) : (
              <>
                <Text style={styles.title}>
                  {t(target?.kind === 'user' ? 'moderation.reportUserTitle' : 'moderation.reportMessageTitle')}
                </Text>
                <Text style={styles.text}>{t('moderation.reportHint')}</Text>

                {REPORT_REASONS.map((option) => {
                  const picked = reason === option;
                  return (
                    <SoundTouchable
                      key={option}
                      style={[styles.reason, picked && styles.reasonPicked]}
                      onPress={() => setReason(option)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: picked }}
                    >
                      <View style={[styles.radio, picked && styles.radioPicked]}>
                        {picked && <Icon name="check" size={11} color={theme.onPrimary} />}
                      </View>
                      <Text style={styles.reasonText}>{t(`moderation.reason.${option}`)}</Text>
                    </SoundTouchable>
                  );
                })}

                <TextInput
                  style={styles.input}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('moderation.commentPlaceholder')}
                  placeholderTextColor={theme.textMuted}
                  maxLength={REPORT_COMMENT_MAX}
                  multiline
                />

                {step === 'failed' && <Text style={styles.error}>{t('moderation.failed')}</Text>}

                <SoundTouchable
                  style={[styles.primaryButton, (!reason || step === 'sending') && styles.disabled]}
                  onPress={submit}
                  disabled={!reason || step === 'sending'}
                  accessibilityRole="button"
                >
                  <Text style={styles.primaryButtonText}>
                    {t(step === 'sending' ? 'moderation.sending' : 'moderation.send')}
                  </Text>
                </SoundTouchable>
                <SoundTouchable style={styles.ghostButton} onPress={onClose} accessibilityRole="button">
                  <Text style={styles.ghostButtonText}>{t('moderation.cancel')}</Text>
                </SoundTouchable>
              </>
            )}
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
      padding: 20,
    },
    title: { fontSize: 18, fontFamily: fontFamily('800'), color: theme.text },
    text: { fontSize: 13, lineHeight: 19, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 6, marginBottom: 12 },
    reason: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
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
    reasonText: { flex: 1, fontSize: 14, fontFamily: fontFamily('700'), color: theme.text },
    input: {
      minHeight: 64,
      maxHeight: 120,
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
    dangerButton: {
      marginTop: 4,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: theme.danger,
    },
    dangerButtonText: { fontSize: 15, fontFamily: fontFamily('800'), color: theme.danger },
    ghostButton: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
    ghostButtonText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.textMuted },
    disabled: { opacity: 0.5 },
  });
}
