/**
 * screens/auth/LoginScreen.tsx
 * Production sign-in — resolves the user's role via the real backend (/auth/login),
 * after which App routes straight into that role's navigator.
 */
import React, { useState } from 'react';
import { View, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/auth/AuthContext';
import { Screen, Text, Button } from '@/components/ui';
import { Logo } from '@/components/Logo';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { Alert.alert('Enter your details', 'Email and password are required.'); return; }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Sign-in failed', e?.message || 'Check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 15,
    marginBottom: 14,
  } as const;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Logo size={64} wordmark={false} />
          <Text variant="title" weight="800" style={{ marginTop: 14 }}>OrdinCore</Text>
          <Text muted>Governance at the point of care</Text>
        </View>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Work email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={inputStyle}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          onSubmitEditing={submit}
          style={inputStyle}
        />
        <Button label={busy ? 'Signing in…' : 'Sign in'} onPress={submit} loading={busy} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
