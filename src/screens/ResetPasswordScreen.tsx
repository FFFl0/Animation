import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth, AuthError } from '../auth/AuthContext';
import PillButton from '../components/PillButton';
import { ToriiIcon } from '../components/SakuraDecor';
import { useT, translateAuthError } from '../i18n/strings';

type Props = {
  accessToken: string;
  refreshToken: string;
  onDone: () => void;
};

export default function ResetPasswordScreen({ accessToken, refreshToken, onDone }: Props) {
  const { completePasswordReset } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 4) {
      setError(t('resetPassword.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('resetPassword.passwordsMismatch'));
      return;
    }
    setBusy(true);
    try {
      await completePasswordReset(accessToken, refreshToken, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof AuthError ? translateAuthError(e, t) : t('resetPassword.errorFallback'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <ToriiIcon size={34} color={theme.ink} />
          <Text style={styles.title}>{t('resetPassword.title')}</Text>

          {done ? (
            <>
              <Text style={styles.subtitle}>{t('resetPassword.doneSubtitle')}</Text>
              <PillButton title={t('resetPassword.done')} variant="ink" onPress={onDone} style={{ marginTop: 8 }} />
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>{t('resetPassword.subtitle')}</Text>
              <TextInput style={styles.input} placeholder={t('resetPassword.newPasswordPlaceholder')} placeholderTextColor={theme.textMuted}
                secureTextEntry value={password} onChangeText={setPassword} />
              <TextInput style={styles.input} placeholder={t('resetPassword.confirmPasswordPlaceholder')} placeholderTextColor={theme.textMuted}
                secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
              {error && <Text style={styles.error}>{error}</Text>}
              <PillButton title={t('resetPassword.saveButton')} variant="ink" onPress={handleSubmit} disabled={busy} style={{ marginTop: 8 }} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    title: { fontSize: 24, fontFamily: fontFamily('800'), color: theme.text, marginTop: 12, textAlign: 'center' },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4, marginBottom: 22, textAlign: 'center' },
    input: { width: '100%', backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, fontFamily: fontFamily('500'), color: theme.text, marginBottom: 12 },
    error: { color: theme.danger, fontSize: 14, fontFamily: fontFamily('500'), marginBottom: 8, textAlign: 'center' },
  });
}
