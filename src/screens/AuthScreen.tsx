import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Theme } from '../theme/palette';
import { fontFamily } from '../theme/fonts';
import { radius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useAuth, AuthError } from '../auth/AuthContext';
import SoundTouchable from '../sound/SoundTouchable';
import PillButton from '../components/PillButton';
import { ToriiIcon } from '../components/SakuraDecor';

type Props = {
  onBack: () => void;
};

export default function AuthScreen({ onBack }: Props) {
  const { login, register } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async () => {
    setError(null);
    if (isRegister && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (e) {
      setError(e instanceof AuthError ? e.message : 'Что-то пошло не так, попробуйте ещё раз');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SoundTouchable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Назад</Text>
        </SoundTouchable>

        <View style={styles.container}>
          <ToriiIcon size={34} color={theme.ink} />
          <Text style={styles.title}>{isRegister ? 'Создать аккаунт' : 'С возвращением'}</Text>
          <Text style={styles.subtitle}>
            {isRegister ? 'Один аккаунт — весь прогресс на этом устройстве' : 'Войди, чтобы продолжить серию ответов'}
          </Text>

          <View style={styles.tabs}>
            <SoundTouchable style={[styles.tab, !isRegister && styles.tabActive]} onPress={() => setMode('login')}>
              <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>Вход</Text>
            </SoundTouchable>
            <SoundTouchable style={[styles.tab, isRegister && styles.tabActive]} onPress={() => setMode('register')}>
              <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>Регистрация</Text>
            </SoundTouchable>
          </View>

          <TextInput style={styles.input} placeholder="Имя пользователя" placeholderTextColor={theme.textMuted}
            autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />
          <TextInput style={styles.input} placeholder="Пароль" placeholderTextColor={theme.textMuted}
            secureTextEntry value={password} onChangeText={setPassword} />
          {isRegister && (
            <TextInput style={styles.input} placeholder="Повторите пароль" placeholderTextColor={theme.textMuted}
              secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <PillButton
            title={isRegister ? 'Создать аккаунт' : 'Войти'}
            variant="ink"
            onPress={handleSubmit}
            disabled={busy}
            style={{ marginTop: 8 }}
          />

          <Text style={styles.footer}>
            Аккаунт хранится только на этом устройстве — пароль не передаётся никуда и не хранится в открытом виде.
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
    title: { fontSize: 24, fontFamily: fontFamily('800'), color: theme.text, marginTop: 12 },
    subtitle: { fontSize: 13, fontFamily: fontFamily('500'), color: theme.textMuted, marginTop: 4, marginBottom: 22, textAlign: 'center' },
    tabs: { flexDirection: 'row', backgroundColor: theme.card, borderRadius: radius.pill, borderWidth: 1.5, borderColor: theme.border, padding: 4, marginBottom: 20, width: '100%' },
    tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
    tabActive: { backgroundColor: theme.primary },
    tabText: { fontSize: 14, fontFamily: fontFamily('700'), color: theme.textMuted },
    tabTextActive: { color: theme.onPrimary },
    input: { width: '100%', backgroundColor: theme.card, borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, fontFamily: fontFamily('500'), color: theme.text, marginBottom: 12 },
    error: { color: theme.danger, fontSize: 14, fontFamily: fontFamily('500'), marginBottom: 8, textAlign: 'center' },
    footer: { marginTop: 20, fontSize: 12, fontFamily: fontFamily('500'), color: theme.textMuted, textAlign: 'center', lineHeight: 17 },
  });
}
