import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { useStore } from '@/context/app-store';
import { jokerAllowed } from '@/lib/coins';
import { POINTS } from '@/lib/data';
import type { weekStats } from '@/lib/logic';
import { addDays, isoWeekNo, nf, parseKey } from '@/lib/util';

import { Btn, Card, Num, Row, T, Track } from './ui';

/** Die Wochen-Challenge: der Glanzpunkt der Startseite – große Zahl auf der Anzeigetafel, Fortschritt als Laufbahn */
export function ChallengeCard({ ws }: { ws: ReturnType<typeof weekStats> }) {
  const ch = ws.ch;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id); }, []);
  const left = parseKey(addDays(ws.mon, 7)).getTime() - now;
  const dl = Math.floor(left / 864e5), hl = Math.floor((left % 864e5) / 36e5);
  const { user, applyJoker } = useStore();
  const jokered = !!user?.inv?.jokerWeeks.includes(ws.mon);
  const danger = !ws.done && !jokered && dl <= 1 && ws.status !== 'grace-open';
  const canJoker = !!user && !ws.done && !jokered && !ws.ended && ws.status === 'open' && jokerAllowed(user, ws.mon);
  const status = ws.done ? `Geschafft, +${POINTS.challengeDone} Punkte`
    : jokered ? 'Joker eingesetzt – diese Woche gibt es keinen Abzug'
    : ws.status === 'grace-open' ? 'Deine erste Woche zählt noch ohne Abzug'
      : `Nicht geschafft bis Sonntag: ${POINTS.challengeFailed} Punkte`;
  return (
    <Card style={{ gap: S[4] }} testID="challenge">
      <Row between>
        <T v="small" tone="secondary">Wochen-Challenge · KW {isoWeekNo(ws.mon)}</T>
        <Num size={13} color={ws.done ? C.good : danger ? C.bad : C.muted}>{ws.done ? 'erledigt' : `noch ${dl} T ${hl} Std`}</Num>
      </Row>
      <View style={{ gap: S[1] }}>
        <T v="title" style={{ fontSize: 24, lineHeight: 30 }}>{ch.title}</T>
        <T v="small" tone="secondary">{ch.desc}</T>
      </View>
      <Row style={{ alignItems: 'flex-end' }} gap={S[2]}>
        <Num size={44} color={ws.done ? C.good : C.accentInk}>{nf(ws.prog)}</Num>
        <Num size={18} color={C.muted} style={{ marginBottom: 6 }}>/ {nf(ch.target)} {ch.unit}</Num>
      </Row>
      <Track value={ws.prog} max={ch.target} color={ws.done ? C.good : danger ? C.bad : C.accentInk} height={10} ticks />
      <T v="small" tone={danger ? 'primary' : 'muted'} color={danger ? C.bad : undefined}>{status}</T>
      {canJoker && <Btn title={`Joker einsetzen · ${user!.inv!.jokers} vorhanden`} small onPress={() => applyJoker(ws.mon)} testID="useJoker" />}
    </Card>
  );
}
