import { router } from 'expo-router';
import { useState } from 'react';
import { Check } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Avatar, Btn, Card, Field, Icon, Row, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useStore } from '@/context/app-store';

export default function Login() {
  const { accounts, login, cloudLogin } = useStore();
  const [sel, setSel] = useState(accounts[0]?.id);
  const [pw, setPw] = useState('');
  const [email, setEmail] = useState('');
  const [cpw, setCpw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg('');
    try { await fn(); } catch (e) { setMsg((e as Error).message); setBusy(false); }
  };

  return (
    <AuthShell>
      {accounts.length > 0 && (
        <Card>
          <T v="h3">Konto auf diesem Gerät</T>
          {accounts.map(a => (
            <Pressable key={a.id} onPress={() => setSel(a.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: S[3], padding: S[2], borderRadius: R.control, borderWidth: 1, borderColor: a.id === sel ? C.lineStrong : C.line, backgroundColor: a.id === sel ? C.raised : 'transparent' }}>
              <Avatar name={a.name} color={a.color} size={32} />
              <T style={{ flex: 1 }}>{a.name}</T>
              {a.id === sel && <Icon icon={Check} color={C.text} />}
            </Pressable>
          ))}
          <Field label="Passwort" secureTextEntry value={pw} onChangeText={setPw} autoComplete="current-password" testID="lpw" onSubmitEditing={() => sel && run(() => login(sel, pw))} />
          <Btn title="Anmelden" kind="primary" disabled={busy || !sel} onPress={() => sel && run(() => login(sel, pw))} testID="loginBtn" />
        </Card>
      )}
      <Card>
        <T v="h3">{accounts.length ? 'Oder mit Online-Konto' : 'Mit Online-Konto anmelden'}</T>
        <T v="small" tone="secondary">Deine Freunde, Duelle und dein bisheriger Verlauf werden auf dieses Gerät geholt.</T>
        <Field label="E-Mail" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
        <Field label="Passwort" secureTextEntry value={cpw} onChangeText={setCpw} autoComplete="current-password" />
        <Btn title={busy ? 'Anmelden …' : 'Online anmelden'} kind={accounts.length ? 'secondary' : 'primary'} disabled={busy || !email || !cpw} onPress={() => run(() => cloudLogin(email.trim(), cpw))} />
      </Card>
      {!!msg && <T v="small" color={C.bad} center>{msg}</T>}
      <Row>
        <Btn title="Zurück" kind="quiet" grow onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
        <Btn title="Konto anlegen" kind="quiet" grow onPress={() => router.replace('/register')} />
      </Row>
    </AuthShell>
  );
}
