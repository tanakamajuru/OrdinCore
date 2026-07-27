import React, { useState } from 'react';
import { View, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/api/client';
import { radius } from '@/theme/tokens';
import { Text } from '@/components/ui';
import { LogoMark } from '@/components/Logo';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const { c, scheme } = useTheme();
  const { login } = useAuth();
  const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The comp's login is a light, navy-branded card on a pale-blue field. Keep that in light mode;
  // fall back to the app's dark surfaces in dark mode.
  const light = scheme === 'light';
  const bg = light ? '#e9f0f8' : c.screen;
  const navy = light ? '#0e2c52' : c.ink;

  const submit = async () => {
    setBusy(true); setError(null);
    try { await login(email.trim(), password); }
    catch (e: any) { setError(e?.message || 'Could not sign in.'); }
    finally { setBusy(false); }
  };

  // Mirrors the web ForgottenPassword flow: POST /auth/forgot-password, then a generic
  // "check your email" confirmation (the reset link itself is emailed and opens on the web).
  const sendReset = async () => {
    if (!EMAIL_RE.test(email.trim())) { setError('Please enter a valid email address'); return; }
    setBusy(true); setError(null);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setView('sent');
    } catch (e: any) {
      setError(e?.message || 'Could not send the reset link. Please try again.');
    } finally { setBusy(false); }
  };

  const goLogin = () => { setView('login'); setError(null); setPassword(''); };

  const fieldRow = { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 14, height: 54, gap: 11 };
  const fieldInput = { flex: 1, fontSize: 15, color: c.ink, height: '100%' as const };
  const primaryBtn = (disabled: boolean) => ({ pressed }: { pressed: boolean }) => ({
    backgroundColor: c.accent, borderRadius: radius.md, height: 54, alignItems: 'center' as const, justifyContent: 'center' as const,
    opacity: disabled ? 0.5 : pressed ? 0.9 : 1, marginTop: 2,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }} keyboardShouldPersistTaps="handled">
          <View style={{
            backgroundColor: c.card, borderRadius: 22, padding: 26, gap: 18,
            borderWidth: light ? 0 : 1, borderColor: c.line,
            shadowColor: '#0b2a52', shadowOpacity: light ? 0.1 : 0, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: light ? 6 : 0,
          }}>
            {/* brand */}
            <View style={{ alignItems: 'center', gap: 14, marginTop: 6 }}>
              <LogoMark size={148} />
              <Text size={19} weight="700" color={navy} style={{ textAlign: 'center', letterSpacing: -0.2 }}>
                Governance. Oversight. Assurance. Every Day.
              </Text>
            </View>

            {view === 'sent' ? (
              <View style={{ gap: 14, alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="mail" size={26} color={c.accent} />
                </View>
                <Text size={20} weight="700" color={navy}>Check your email</Text>
                <Text size={13.5} muted style={{ textAlign: 'center', lineHeight: 20 }}>
                  If an account exists for that email, we've sent a link to reset your password. The link expires in 1 hour.
                </Text>
                <Pressable onPress={goLogin} style={primaryBtn(false)}>
                  <View style={{ paddingHorizontal: 40 }}><Text size={16} weight="700" color={c.accentInk}>Return to Login</Text></View>
                </Pressable>
              </View>
            ) : view === 'forgot' ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text size={20} weight="700" color={navy} style={{ textAlign: 'center' }}>Forgotten Password</Text>
                  <Text size={13} muted style={{ textAlign: 'center' }}>Enter your email to reset your password</Text>
                </View>

                <View style={{ gap: 8 }}>
                  <Text size={14} weight="700" color={navy}>Email</Text>
                  <View style={fieldRow}>
                    <Feather name="mail" size={18} color={c.faint} />
                    <TextInput
                      value={email} onChangeText={setEmail} placeholder="Enter your work email" placeholderTextColor={c.faint}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={fieldInput}
                    />
                  </View>
                </View>

                {!!error && <Text color={c.sevCrit} size={12.5}>{error}</Text>}

                <Pressable onPress={sendReset} disabled={busy || !email} style={primaryBtn(busy || !email)}>
                  <Text size={16} weight="700" color={c.accentInk}>{busy ? 'Sending…' : 'Send Reset Link'}</Text>
                </Pressable>

                <Pressable onPress={goLogin} style={{ alignItems: 'center', paddingVertical: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="arrow-left" size={15} color={c.accent} />
                    <Text size={14} weight="600" color={c.accent}>Back to Login</Text>
                  </View>
                </Pressable>
              </>
            ) : (
              <>
                {/* email */}
                <View style={{ gap: 8 }}>
                  <Text size={14} weight="700" color={navy}>Email</Text>
                  <View style={fieldRow}>
                    <Feather name="mail" size={18} color={c.faint} />
                    <TextInput
                      value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor={c.faint}
                      keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={fieldInput}
                    />
                  </View>
                </View>

                {/* password */}
                <View style={{ gap: 8 }}>
                  <Text size={14} weight="700" color={navy}>Password</Text>
                  <View style={fieldRow}>
                    <Feather name="lock" size={18} color={c.faint} />
                    <TextInput
                      value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor={c.faint}
                      secureTextEntry={!show} autoCapitalize="none" style={fieldInput}
                    />
                    <Pressable onPress={() => setShow((s) => !s)} hitSlop={10}>
                      <Feather name={show ? 'eye-off' : 'eye'} size={18} color={c.faint} />
                    </Pressable>
                  </View>
                </View>

                {!!error && <Text color={c.sevCrit} size={12.5}>{error}</Text>}

                <Pressable onPress={submit} disabled={busy || !email || !password} style={primaryBtn(busy || !email || !password)}>
                  <Text size={16} weight="700" color={c.accentInk}>{busy ? 'Signing in…' : 'Login'}</Text>
                </Pressable>

                <Pressable onPress={() => { setView('forgot'); setError(null); }} style={{ alignItems: 'center', paddingVertical: 2 }}>
                  <Text size={14} weight="600" color={c.accent}>Forgotten Password</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
