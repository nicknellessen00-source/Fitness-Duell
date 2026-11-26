import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { CoinIcon, useCoins } from '@/components/coin';
import { DuelRow } from '@/components/duel-row';
import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Num, Row, Screen, T, ValueRow } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import * as Cloud from '@/lib/cloud';
import { DUEL_TYPES, POINTS } from '@/lib/data';
import { confirmDestructive } from '@/lib/haptics';
import { allDuels, duelState } from '@/lib/logic';
import { fmtDate, nf, today } from '@/lib/util';

export default function DuelDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const u = useUser(); const { cloud, update, refreshCloud, stake } = useStore();
  const { balance: bal, online } = useCoins();
  const [stakes, setStakes] = useState<{ user_id: string; amount: number }[]>([]);
  const [reload, setReload] = useState(0);
  const d = allDuels(u, cloud.duels).find(x => x.id === id);
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState('');
  const cid = d?.cloud ? d.cloudId : undefined;
  useEffect(() => {
    if (!cid) return;
    let alive = true;
    Cloud.duelStakes([cid]).then(r => { if (alive) setStakes(r); }).catch(() => {});
    return () => { alive = false; };
  }, [cid, reload, cloud.coins]);
  if (!d) return <Screen bottomInset><ModalHeader title="Duell nicht gefunden" /></Screen>;
  const st = duelState(u, d, cloud.friends);
  const mine = stakes.find(s => s.user_id === u.cloud?.uid);
  const theirs = stakes.find(s => s.user_id !== u.cloud?.uid);
  const pot = stakes.reduce((n, s) => n + s.amount, 0);
  const running = d.end >= today();
  const doStake = async (amount: number) => {
    setErr(''); const e = await stake(cid!, amount);
    if (e) setErr(e); else setReload(r => r + 1);
  };

  const remove = async () => {
    try {
      if (d.cloud && d.cloudId) { await Cloud.deleteDuel(d.cloudId); await refreshCloud(); }
      else update(x => { x.duels = x.duels.filter(y => y.id !== d.id); });
      close();
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <Screen bottomInset>
      <ModalHeader kicker="Duell" title={DUEL_TYPES[d.type]?.label || 'Duell'} />
      <Card><DuelRow d={d} /></Card>
      <Card style={{ gap: 0 }}>
        <T v="small" tone="secondary" style={{ marginBottom: 8 }}>{DUEL_TYPES[d.type]?.desc}</T>
        <ValueRow label="Zeitraum" value={`${fmtDate(d.start)} – ${fmtDate(d.end)}`} />
        <ValueRow label="Sieger" value={`+${POINTS.duelWin}`} />
        <ValueRow label="Verlierer" value={String(POINTS.duelLoss)} />
        {d.cloud && <T v="meta" tone="muted" style={{ marginTop: 8 }}>Online-Duell – dein Freund sieht den gleichen Stand.</T>}
      </Card>
      {cid && online && (
        <Card testID="stakeCard">
          <Row between><T v="h3">Einsatz</T><Row gap={S[1] + 2}><CoinIcon size={18} /><Num size={18} testID="pot">{nf(pot)}</Num></Row></Row>
          <ValueRow label="Dein Einsatz" value={mine ? `${mine.amount}` : '–'} />
          <ValueRow label={`Einsatz von ${(st.fdg?.name || 'Gegner').replace(' (Demo)', '')}`} value={theirs ? `${theirs.amount}` : '–'} />
          {running && !mine && (
            <View style={{ gap: S[2] }}>
              <T v="small" tone="secondary">Wer gewinnt, bekommt den ganzen Topf. Bei Gleichstand gibt es die Einsätze zurück.</T>
              <Row>{[10, 25, 50].map(a => <Btn key={a} title={`${a} setzen`} small grow disabled={bal < a} onPress={() => doStake(a)} testID={'stake-' + a} />)}</Row>
            </View>
          )}
          {!running && <T v="small" tone="secondary">{st.result === 'won' ? `Gewonnen – der Topf von ${nf(pot)} FitCoins und +40 gehen an dich.` : st.result === 'lost' ? 'Verloren – der Topf geht an deinen Gegner.' : 'Gleichstand – die Einsätze gehen zurück.'}</T>}
        </Card>
      )}
      {d.cloud === undefined && <T v="meta" tone="muted">Einsätze gibt es nur bei Online-Duellen mit echten Freunden.</T>}
      {!!err && <T v="small" color={C.bad}>{err}</T>}
      <Row>
        <Btn title={armed ? 'Wirklich entfernen' : 'Duell entfernen'} kind="danger" grow testID="delDuel" onPress={() => {
          if (confirmDestructive('Duell entfernen?', 'Das Duell zählt dann nicht mehr für die Wertung.', 'Entfernen', remove)) return;
          if (!armed) return setArmed(true); remove();
        }} />
      </Row>
    </Screen>
  );
}
