import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { SPORT_SF } from '@/lib/icons';
import { SP } from '@/lib/logic';
import { fmtWhen, matchState, nameOf, otherIn, sportName } from '@/lib/matches';
import { sportIcon } from '@/lib/sport-icons';
import type { Match } from '@/lib/types';

import { CoinIcon } from './coin';
import { Icon, Num, Row, T } from './ui';

/** Eine Sport-Herausforderung in Listen */
export function MatchRow({ m }: { m: Match }) {
  const u = useUser(); const { cloud } = useStore();
  const st = matchState(u, m);
  const them = nameOf(otherIn(u, m), u, cloud.friends);
  return (
    <Pressable onPress={() => router.push({ pathname: '/match/[id]', params: { id: m.id } })} testID={'match-' + m.id}>
      <Row gap={S[3]} style={{ minHeight: 60, paddingVertical: S[2] }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: st.needsMe ? C.accent : C.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={sportIcon(m.sport, SP[m.sport]?.cat)} sf={SPORT_SF[m.sport]} size={18} color={st.needsMe ? C.onAccent : C.text2} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="small" numberOfLines={1}>{sportName(m.sport)} gegen {them}</T>
          <T v="meta" tone={st.needsMe ? 'primary' : 'muted'} color={st.needsMe ? C.accentInk : undefined} numberOfLines={1}>
            {st.text}{st.active && m.playAt ? ` · ${fmtWhen(m.playAt)}` : ''}
          </T>
        </View>
        {m.stake > 0 && <Row gap={S[1]}><CoinIcon size={14} /><Num size={13} color={C.text2}>{m.stake}</Num></Row>}
        <Icon icon={ChevronRight} size={16} />
      </Row>
    </Pressable>
  );
}
