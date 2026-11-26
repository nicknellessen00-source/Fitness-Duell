import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { CoinIcon } from '@/components/coin';
import { DuelRow } from '@/components/duel-row';
import { Avatar, Bib, Btn, Card, Divider, Field, Num, Row, Screen, Seg, T, ValueRow } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import * as Cloud from '@/lib/cloud';
import { GOALS, POINTS } from '@/lib/data';
import { frameColor } from '@/lib/coins';
import { allDuels, leaderboard } from '@/lib/logic';
import { nf } from '@/lib/util';

export default function Friends() {
  const u = useUser(); const { cloud } = useStore();
  const [mode, setMode] = useState<'week' | 'total'>('week');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const pts = (p: ReturnType<typeof leaderboard>[number]) => (mode === 'week' ? p.week.pts : p.total);
  const duels = allDuels(u, cloud.duels).sort((a, b) => (a.end < b.end ? 1 : -1));
  const lb = leaderboard(u, cloud.friends, cloud.duels).sort((a, b) => pts(b) - pts(a));

  const addFriend = async () => {
    setMsg('Suche …');
    try { await Cloud.addFriend(code.trim().toUpperCase()); setCode(''); setMsg('Freund hinzugefügt'); }
    catch (e) { setMsg((e as Error).message); }
  };
  const live = cloud.status === 'on';

  return (
    <Screen title="Rangliste">
      <Seg items={[['week', 'Diese Woche'], ['total', 'Saison, 12 Wochen']]} value={mode} onChange={setMode} />

      <Card style={{ paddingVertical: S[2], gap: 0 }} testID="scoreboard">
        {lb.map((p, i) => {
          const gap = i > 0 ? pts(lb[i - 1]) - pts(p) : 0;
          const ch = p.week.done ? 'Challenge geschafft' : p.week.status === 'failed' ? 'Challenge verpasst' : p.week.status === 'joker' ? 'Joker eingesetzt' : `Challenge ${Math.round(Math.min(100, (p.week.prog / p.week.ch.target) * 100))} %`;
          return (
            <View key={p.dg.id}>
              {i > 0 && <Divider />}
              <Row gap={S[3]} style={{ minHeight: 60, backgroundColor: p.me ? 'rgba(0,0,0,0.03)' : undefined }}>
                <Bib n={i + 1} lead={i === 0} />
                <Avatar name={p.dg.name} color={p.dg.color} size={32} frame={frameColor(p.dg.frame)} />
                <View style={{ flex: 1 }}>
                  <T numberOfLines={1}>{p.dg.name}{p.me ? ' · du' : ''}</T>
                  <T v="meta" tone="muted" numberOfLines={1}>{GOALS[p.dg.goal]?.label.replace('-spezifisch', '')} · {ch}</T>
                </View>
                {!p.me && !p.dg.demo && cloud.friends.some(f => f.id === p.dg.id) && cloud.coins != null && (
                  <Pressable onPress={() => router.push({ pathname: '/cheer', params: { uid: p.dg.id, name: p.dg.name } })} hitSlop={8}
                    accessibilityLabel={`${p.dg.name} anfeuern`} testID={'cheer-' + p.dg.id}>
                    <CoinIcon size={22} />
                  </Pressable>
                )}
                <View style={{ alignItems: 'flex-end' }}>
                  <Num size={18} color={i === 0 ? C.accentInk : C.text}>{nf(pts(p))}</Num>
                  {gap > 0 && <Num size={11} color={C.muted}>−{nf(gap)}</Num>}
                </View>
              </Row>
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 0 }} testID="duels">
        <Row between style={{ marginBottom: S[1] }}>
          <T v="h3">Duelle</T>
          <Btn title="Herausfordern" small kind="primary" onPress={() => router.push('/duel-new')} testID="newDuel" />
        </Row>
        {duels.length ? duels.map((d, i) => <View key={d.id}>{i > 0 && <Divider />}<DuelRow d={d} /></View>)
          : <T v="small" tone="muted" style={{ paddingVertical: S[2] }}>Wer bewegt in 30 Tagen mehr Gewicht oder nimmt mehr ab? Fordere einen Freund heraus.</T>}
      </Card>

      <Card style={{ gap: 0 }}>
        <T v="h3" style={{ marginBottom: S[2] }}>Punkte</T>
        <ValueRow label="Training" value={`+${POINTS.workout}`} />
        <ValueRow label={`Je ${POINTS.perMinutes} Minuten aktiv`} value="+1" />
        <ValueRow label={`Je ${nf(POINTS.perSteps)} Schritte`} value="+1" />
        <ValueRow label="Challenge geschafft" value={`+${POINTS.challengeDone}`} />
        <ValueRow label="Challenge verpasst" value={String(POINTS.challengeFailed)} />
        <ValueRow label="Duell gewonnen" value={`+${POINTS.duelWin}`} />
        <ValueRow label="Duell verloren" value={String(POINTS.duelLoss)} />
      </Card>

      <Card>
        <Row between>
          <T v="h3">Freunde hinzufügen</T>
          <Row gap={S[1] + 2}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: live ? C.good : cloud.status === 'error' ? C.bad : C.muted }} />
            <T v="meta" tone="muted">{live ? 'live' : cloud.status === 'connecting' ? 'verbinde' : cloud.status === 'error' ? 'Fehler' : 'offline'}</T>
          </Row>
        </Row>
        {u.cloud ? (<>
          {cloud.code && <Row between><T v="small" tone="secondary">Dein Code</T><Num size={20} color={C.accentInk}>{cloud.code}</Num></Row>}
          {cloud.err ? <T v="small" color={C.bad}>{cloud.err}</T> : null}
          <Row style={{ alignItems: 'flex-end' }}>
            <Field label="Code eines Freundes" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="K7Q2XM" />
            <Btn title="Hinzufügen" disabled={!code.trim()} onPress={addFriend} />
          </Row>
          {!!msg && <T v="small" tone="muted">{msg}</T>}
        </>) : (<>
          <T v="small" tone="secondary">Mit einem Online-Konto fügst du echte Freunde per Code hinzu und siehst ihre Punkte live.</T>
          <Btn title="Online-Konto verbinden" onPress={() => router.push('/profile')} />
        </>)}
      </Card>
    </Screen>
  );
}
