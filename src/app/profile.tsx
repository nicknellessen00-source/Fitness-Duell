import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Avatar, Btn, Card, Divider, Field, Row, Screen, Seg, T, ValueRow } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import * as Cloud from '@/lib/cloud';
import { GOALS, type GoalId } from '@/lib/data';
import { confirmDestructive } from '@/lib/haptics';
import { calc } from '@/lib/logic';
import { enableNotifications, notifySupported } from '@/lib/notify';
import { nf } from '@/lib/util';

export default function Profile() {
  const u = useUser(); const { update, logout, deleteAccount } = useStore();
  const [delArmed, setDelArmed] = useState(false);
  const c = calc(u.profile);
  const [email, setEmail] = useState(u.profile.email || '');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async (mode: 'in' | 'up') => {
    setBusy(true); setMsg('');
    try {
      let cu;
      if (mode === 'up') {
        const r = await Cloud.signUp(email.trim(), pw, u.profile.name);
        if (r.needsConfirm) { setMsg('Bestätige die E-Mail und tippe dann auf „Anmelden“'); setBusy(false); return; }
        cu = r.user;
      } else cu = await Cloud.signIn(email.trim(), pw);
      if (!cu) throw new Error('Anmeldung fehlgeschlagen');
      update(x => { x.cloud = { uid: cu.id, email: email.trim() }; x.profile.email = email.trim(); });
      setMsg('Verbunden');
    } catch (e) {
      const m = (e as Error).message; setMsg(m === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch' : m);
    }
    setBusy(false);
  };

  return (
    <Screen bottomInset>
      <Row between style={{ minHeight: 40 }}>
        <Row gap={S[3]}><Avatar name={u.profile.name} color={u.profile.color} size={40} /><T v="title">{u.profile.name}</T></Row>
        <Btn title="Fertig" small onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Row>
      <Card>
        <T v="h3">Ziel</T>
        <Seg items={(Object.keys(GOALS) as GoalId[]).slice(0, 3).map(k => [k, GOALS[k].label] as [GoalId, string])} value={u.profile.goal} onChange={k => update(x => { x.profile.goal = k; x.planIdx = 0; })} />
        <Seg items={(Object.keys(GOALS) as GoalId[]).slice(3).map(k => [k, GOALS[k].label.replace('-spezifisch', '')] as [GoalId, string])} value={u.profile.goal} onChange={k => update(x => { x.profile.goal = k; x.planIdx = 0; })} />
        <View>
          <ValueRow label="Tagesziel" value={nf(c.kcal) + ' kcal'} accent />
          <Divider />
          <ValueRow label="Protein pro Tag" value={c.protein + ' g'} />
          <ValueRow label="Grundumsatz" value={nf(c.bmr) + ' kcal'} />
          <ValueRow label="Wasser pro Tag" value={nf(c.water / 1000, 1) + ' l'} />
        </View>
      </Card>
      {notifySupported && (
        <Card>
          <Row between>
            <View style={{ flex: 1 }}>
              <T v="h3">Erinnerungen</T>
              <T v="small" tone="secondary">Wochen-Challenge kurz vor Schluss, neue Challenge am Montag, Duelle am Vortag des Endes</T>
            </View>
            <Switch value={!!u.notify?.on} trackColor={{ true: C.accent }} onValueChange={async on => {
              if (on && !(await enableNotifications())) { setMsg('Mitteilungen sind in den Einstellungen ausgeschaltet'); return; }
              update(x => { x.notify = { on }; });
            }} />
          </Row>
        </Card>
      )}
      <Card>
        <T v="h3">Online-Konto</T>
        {u.cloud ? (
          <T v="small" tone="secondary">Verbunden als {u.cloud.email}. Dein Stand wird automatisch synchronisiert.</T>
        ) : (<>
          <T v="small" tone="secondary">Für echte Freunde, Online-Rangliste und Wiederherstellung auf anderen Geräten.</T>
          <Field label="E-Mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" testID="cEmail" />
          <Field label="Passwort (mind. 6 Zeichen)" value={pw} onChangeText={setPw} secureTextEntry autoComplete="password" testID="cPw" />
          <Row>
            <Btn title="Neu anlegen" kind="primary" grow disabled={busy || !email || pw.length < 6} onPress={() => connect('up')} />
            <Btn title="Anmelden" grow disabled={busy || !email || !pw} onPress={() => connect('in')} testID="cIn" />
          </Row>
        </>)}
        {!!msg && <T v="small" color={msg === 'Verbunden' ? C.good : C.muted}>{msg}</T>}
      </Card>
      <Card>
        <Btn title="Einführung ansehen" onPress={() => { update(x => { x.tourDone = false; }); router.back(); }} />
        <Btn title="Abmelden" onPress={logout} />
        <Btn title={delArmed ? 'Wirklich endgültig löschen' : 'Konto löschen'} kind="danger" testID="delAccount" onPress={() => {
          const run = () => { deleteAccount().catch(e => setMsg((e as Error).message.includes('delete_my_account') ? 'Online-Löschung ist auf dem Server noch nicht eingerichtet' : (e as Error).message)); };
          if (confirmDestructive('Konto löschen?', 'Alle Trainings, Mahlzeiten und Punkte werden gelöscht' + (u.cloud ? ', auch dein Online-Konto.' : '.'), 'Löschen', run)) return;
          if (!delArmed) return setDelArmed(true); run();
        }} />
        <Btn title="Datenschutz" kind="quiet" onPress={() => router.push('/datenschutz')} />
      </Card>
    </Screen>
  );
}
