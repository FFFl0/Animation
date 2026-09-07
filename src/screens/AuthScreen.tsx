import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth, AuthError } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../auth/supabaseClient';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';
import { ToriiIcon } from '../components/SakuraDecor';
import { useT, translateAuthError } from '../i18n/strings';

type Props = {
  onBack: () => void;
};

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen({ onBack }: Props) {
  const { login, register, resetPassword, loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const t = useT();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      setError(e instanceof AuthError ? translateAuthError(e, t) : t('auth.googleError'));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);

    if (isForgot) {
      setBusy(true);
      try {
        const result = await resetPassword(username);
        if (result.ok) setInfo(t('auth.resetSent'));
        else setError(result.reason ? t(`authErrors.${result.reason}`) : t('auth.resetFailedFallback'));
      } catch (e) {
        setError(e instanceof AuthError ? translateAuthError(e, t) : t('auth.genericError'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        await register(username, password, isSupabaseConfigured ? recoveryEmail : undefined);
      } else {
        await login(username, password);
      }
    } catch (e) {
      setError(e instanceof AuthError ? translateAuthError(e, t) : t('auth.genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SoundTouchable onPress={isForgot ? () => switchMode('login') : onBack} style={styles.backButton}>
          <Text style={styles.backText}>{t('auth.back')}</Text>
        </SoundTouchable>

        <View style={styles.container}>
          <ToriiIcon size={34} color={theme.ink} />
          <Text style={styles.title}>
            {isForgot ? t('auth.titleForgot') : isRegister ? t('auth.titleRegister') : t('auth.titleLogin')}
          </Text>
          <Text style={styles.subtitle}>
            {isForgot
              ? t('auth.subtitleForgot')
              : isRegister
                ? t('auth.subtitleRegister')
                : t('auth.subtitleLogin')}
          </Text>

          {!isForgot && (
            <View style={styles.tabs}>
              <SoundTouchable style={[styles.tab, !isRegister && styles.tabActive]} onPress={() => switchMode('login')}>
                <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>{t('auth.tabLogin')}</Text>
              </SoundTouchable>
              <SoundTouchable style={[styles.tab, isRegister && styles.tabActive]} onPress={() => switchMode('register')}>
                <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>{t('auth.tabRegister')}</Text>
              </SoundTouchable>
            </View>
          )}

          <TextInput style={styles.input} placeholder={t('auth.placeholderUsername')} placeholderTextColor={theme.textMuted}
            autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />

          {!isForgot && (
            <TextInput style={styles.input} placeholder={t('auth.placeholderPassword')} placeholderTextColor={theme.textMuted}
              secureTextEntry value={password} onChangeText={setPassword} />
          )}
          {isRegister && (
            <TextInput style={styles.input} placeholder={t('auth.placeholderConfirmPassword')} placeholderTextColor={theme.textMuted}
              secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          )}
          {isRegister && isSupabaseConfigured && (
            <TextInput
              style={styles.input}
              placeholder={t('auth.placeholderRecoveryEmail')}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
            />
          )}

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <PillButton
            title={isForgot ? t('auth.submitForgot') : isRegister ? t('auth.submitRegister') : t('auth.submitLogin')}
            variant="ink"
            onPress={handleSubmit}
            disabled={busy}
            style={{ marginTop: 8 }}
          />

          {!isForgot && isSupabaseConfigured && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.or')}</Text>
                <View style={styles.dividerLine} />
              </View>
              <PillButton
                title={t('auth.googleButton')}
                variant="outline"
                onPress={handleGoogleSignIn}
                disabled={busy}
                fullWidth
              />
            </>
          )}

          {!isRegister && !isForgot && isSupabaseConfigured && (
            <SoundTouchable onPress={() => switchMode('forgot')} style={{ marginTop: 14 }}>
              <Text style={styles.forgotLink}>{t('auth.forgotLink')}</Text>
            </SoundTouchable>
          )}

          <Text style={styles.footer}>
            {isSupabaseConfigured ? t('auth.footerCloud') : t('auth.footerLocal')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    backButton: { paddingHorizontal: 24, paddingTop: 12 },
    backText: { color: theme.text, fontSize: 15, fontFamily: fontFamily('700') },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
    title: { fontSize: 24, fontFamily: fontFamily('800'), color: theme.text, marginTop: 12, textAlign: 'center' },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4, marginBottom: 22, textAlign: 'center' },
    tabs: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: radius.pill, borderWidth: 1.5, borderColor: theme.border, padding: 4, marginBottom: 20, width: '100%' },
    tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
    tabActive: { backgroundColor: theme.primary },
    tabText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.textMuted },
    tabTextActive: { color: theme.onPrimary },
    input: { width: '100%', backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, fontFamily: fontFamily('500'), color: theme.text, marginBottom: 12 },
    error: { color: theme.danger, fontSize: 14, fontFamily: fontFamily('500'), marginBottom: 8, textAlign: 'center' },
    info: { color: theme.success, fontSize: 13, fontFamily: fontFamily('500'), marginBottom: 8, textAlign: 'center', lineHeight: 18 },
    forgotLink: { fontSize: 13, fontFamily: fontFamily('600'), color: theme.primary },
    divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 14, gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
    dividerText: { fontSize: 12, fontFamily: fontFamily('600'), color: theme.textMuted },
    footer: { marginTop: 20, fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 17 },
  });
}
