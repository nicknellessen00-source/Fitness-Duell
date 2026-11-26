import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { DUEL_TYPES, POINTS } from '@/lib/data';
import { duelState, EX } from '@/lib/logic';
import type { Duel } from '@/lib/types';
import { nf, parseKey, today } from '@/lib/util';

import { Num, Row, T } from './ui';

export const duelUnit = (d: Duel) => (d.type === 'max' ? 'kg' : DUEL_TYPES[d.type]?.unit || '');
export const daysLeft = (d: Duel) => Math.max(0, Math.round((parseKey(d.end).getTime() - parseKey(today()).getTime()) / 864e5));

/** Duell als Anzeigetafel: Du gegen Gegner, Balken teilt den Stand */
export function DuelRow({ d }: { d: Duel }) {
  const u = useUser(); const { cloud } = useStore();
  const st = duelState(u, d, cloud.friends);
  const t = DUEL_TYPES[d.type];
  const dec = d.type === 'loss' ? 1 : 0;
  const a = Math.max(st.me, 0), b = Math.max(st.them, 0);
  const mePct = a + b > 0 ? (a / (a + b)) * 100 : 50;
  const left = daysLeft(d);
  const them = (st.fdg?.name || 'Gelöschter Freund').replace(' (Demo)', '');
  const status = st.over
    ? st.result === 'won' ? `Gewonnen, +${POINTS.duelWin}` : st.result === 'lost' ? `Verloren, ${POINTS.duelLoss}` : 'Unentschieden'
    : st.me > st.them ? 'Du führst' : st.me < st.them ? 'Rückstand' : 'Gleichstand';
  const tone = st.over ? (st.result === 'won' ? C.good : st.result === 'lost' ? C.bad : C.text2) : st.me > st.them ? C.good : st.me < st.them ? C.bad : C.text2;
  return (
    <Pressable onPress={() => router.push({ pathname: '/duel/[id]', params: { id: d.id } })} testID={'duel-' + d.id} style={{ gap: S[2], paddingVertical: S[3] }}>
      <Row between>
        <View style={{ flex: 1 }}>
          <T v="small">{t?.label}{d.type === 'max' && d.ex ? ` · ${EX[d.ex]?.name || ''}` : ''}</T>
          <T v="meta" tone="muted">gegen {them} · {st.over ? 'beendet' : `noch ${left} ${left === 1 ? 'Tag' : 'Tage'}`}{d.cloud ? ' · online' : ''}</T>
        </View>
        <T v="meta" color={tone}>{status}</T>
      </Row>
      <Row between>
        <Num size={15} color={C.accentInk}>Du {nf(st.me, dec)}</Num>
        <Num size={15} color={C.text2}>{nf(st.them, dec)} {them}</Num>
      </Row>
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', gap: 2 }}>
        <View style={{ width: `${mePct}%`, backgroundColor: C.accentInk, borderRadius: 3 }} />
        <View style={{ flex: 1, backgroundColor: C.bar, borderRadius: 3 }} />
      </View>
      <T v="meta" tone="muted">{duelUnit(d)}{d.type === 'loss' ? ' abgenommen' : ''}</T>
    </Pressable>
  );
}
