import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { close, ModalHeader } from '@/components/modal-header';
import { Avatar, Btn, Card, Divider, Row, Screen, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import * as Cloud from '@/lib/cloud';
import { DUEL_TYPES, EXERCISES, POINTS } from '@/lib/data';
import { success } from '@/lib/haptics';
import { allFriends, friendDigest } from '@/lib/logic';
import type { Duel } from '@/lib/types';
import { addDays, today, uid } from '@/lib/util';

const LIFTS = EXERCISES.filter(e => e.type === 'reps' && !e.bw);

export default function DuelNew() {
  const u = useUser(); const { update, cloud, refreshCloud } = useStore();
  const friends = allFriends(u, cloud.friends).map(f => ({ f, dg: friendDigest(f, cloud.friends) })).filter(x => x.dg);
  const [fid, setFid] = useState(friends[0]?.f.id || '');
  const [type, setType] = useState('vol');
  const [ex, setEx] = useState(LIFTS.find(e => e.id === 'bench')?.id || LIFTS[0]?.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const go = async () => {
    if (!fid) return;
    const d: Duel = { id: uid(), friendId: fid, type, start: today(), end: addDays(today(), 30), ...(type === 'max' ? { ex } : {}) };
    setBusy(true); setErr('');
    try {
      if (fid.startsWith('cloud-')) { await Cloud.createDuel(d, fid.slice(6)); await refreshCloud(); }
      else update(x => { x.duels.push(d); });
      success(); close();
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  const choice = (on: boolean, onPress: () => void, children: React.ReactNode, key: string) => (
    <Pressable key={key} onPress={onPress} testID={'dc-' + key} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: S[3], paddingVertical: S[2] }}>
      <View style={{ flex: 1 }}>{children}</View>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? C.accentInk : C.bar, backgroundColor: on ? C.accentInk : 'transparent' }} />
    </Pressable>
  );

  return (
    <Screen bottomInset>
      <ModalHeader kicker="30 Tage" title="Freund herausfordern" />
      <T v="small" tone="secondary">Der Sieger bekommt +{POINTS.duelWin} Punkte in der Saisonwertung, der Verlierer {POINTS.duelLoss}.</T>
      {!friends.length ? <Card><T tone="secondary">Füge zuerst einen Freund hinzu.</T></Card> : (<>
        <Card style={{ gap: 0 }}>
          <T v="h3" style={{ marginBottom: S[1] }}>Gegner</T>
          {friends.map(({ f, dg }, i) => (
            <View key={f.id}>{i > 0 && <Divider />}{choice(fid === f.id, () => setFid(f.id), <Row gap={S[3]}><Avatar name={dg!.name} color={dg!.color} size={30} /><T>{dg!.name}</T>{f.kind === 'cloud' && <T v="meta" tone="muted">online</T>}</Row>, f.id)}</View>
          ))}
        </Card>
        <Card style={{ gap: 0 }}>
          <T v="h3" style={{ marginBottom: S[1] }}>Disziplin</T>
          {Object.entries(DUEL_TYPES).map(([k, t], i) => (
            <View key={k}>{i > 0 && <Divider />}{choice(type === k, () => setType(k), <><T>{t.label}</T><T v="meta" tone="muted">{t.desc}</T></>, k)}</View>
          ))}
        </Card>
        {type === 'max' && (
          <Card>
            <T v="h3">Übung</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S[2] }}>
              {LIFTS.map(e => (
                <Pressable key={e.id} onPress={() => setEx(e.id)} hitSlop={6} style={{ height: 34, paddingHorizontal: S[4], justifyContent: 'center', borderRadius: 17, backgroundColor: ex === e.id ? C.accent : C.raised }}>
                  <T v="small" color={ex === e.id ? C.onAccent : C.text}>{e.name}</T>
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}
        {!!err && <T v="small" color={C.bad}>{err}</T>}
        <Btn title="Herausforderung starten" kind="primary" disabled={busy || !fid} onPress={go} testID="duelGo" />
      </>)}
    </Screen>
  );
}
