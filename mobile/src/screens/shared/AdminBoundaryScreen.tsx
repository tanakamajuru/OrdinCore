import React from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Screen, Card, Text, Button } from '@/components/ui';
import { BoardHeader } from '@/components/board';

export function AdminBoundaryScreen() {
  const { logout } = useAuth();
  return <Screen><BoardHeader title="Administration account" subtitle="Governance role required" menu={false} />
    <Card><Text size={13}>This account is not automatically treated as a Registered Manager. Select an authorised operational role on the web application before carrying out governance decisions.</Text></Card>
    <Button title="Log out" tone="ghost" onPress={() => logout()} />
  </Screen>;
}
