import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather } from '@expo/vector-icons';
import { useAuth, normalizeRole } from '@/auth/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { API_BASE_URL } from '@/config';
import { LogoMark } from '@/components/Logo';
import { SyncStatus } from '@/components/SyncStatus';
import { Screen, Card, Row, Label, Text, Button, Pill } from '@/components/ui';

const prettyRole = (r: string) => normalizeRole(r).split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');

function LineItem({ icon, label, value }: { icon: any; label: string; value?: string }) {
  const { c } = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: c.lineSoft }}>
      <Row gap={10}><Feather name={icon} size={15} color={c.muted} /><Text size={13} muted>{label}</Text></Row>
      <Text size={13} weight="600" style={{ maxWidth: '58%', textAlign: 'right' }}>{value || '—'}</Text>
    </Row>
  );
}

export function ProfileScreen() {
  const { c } = useTheme();
  const { user, logout } = useAuth();
  const [bio, setBio] = useState<string>('Checking…');

  useEffect(() => {
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBio(!hw ? 'Not available on this device' : !enrolled ? 'Not set up' : face ? 'Face ID enabled' : 'Fingerprint enabled');
    })();
  }, []);

  const name = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You';
  const host = API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api.*$/, '');

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <LogoMark size={72} />
        <Text size={18} weight="600">{name}</Text>
        <Pill tone="accent">{prettyRole(user?.role || '')}</Pill>
      </View>

      <SyncStatus />

      <Label>Account</Label>
      <Card style={{ paddingVertical: 2 }}>
        <LineItem icon="mail" label="Email" value={user?.email} />
        <LineItem icon="briefcase" label="Role" value={prettyRole(user?.role || '')} />
        <LineItem icon="lock" label="Biometric unlock" value={bio} />
        <View style={{ paddingBottom: 2 }}><LineItem icon="server" label="Connected to" value={host} /></View>
      </Card>

      <Label>About</Label>
      <Card style={{ paddingVertical: 2 }}>
        <LineItem icon="smartphone" label="App version" value={String(Constants.expoConfig?.version || '0.1.0')} />
        <View style={{ paddingBottom: 2 }}><LineItem icon="shield" label="Data" value="Encrypted on device" /></View>
      </Card>

      <Button title="Log out" tone="block" icon="log-out" onPress={() => logout()} style={{ marginTop: 6 }} />
      <Text faint size={11} style={{ textAlign: 'center' }}>Signing out clears the session from this device.</Text>
    </Screen>
  );
}
