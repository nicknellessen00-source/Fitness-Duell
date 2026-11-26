import { router } from 'expo-router';
import { ChevronRight, Dumbbell } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { C, S } from '@/constants/theme';
import { useUser } from '@/context/app-store';
import { SP } from '@/lib/logic';
import { SPORT_SF } from '@/lib/icons';
import { sportIcon } from '@/lib/sport-icons';
import { fmtDur, sportElapsed } from '@/lib/training';

import { Card, Icon, Num, Row, T } from './ui';

/** Hinweis auf ein laufendes Training oder eine laufende Sport-Aktivität */
export function ActiveBanner() {
  const u = useUser();
  const [now, setNow] = useState(() => Date.now());
  const a = u.activeSport, s = u.activeSession;
  useEffect(() => { if (!a && !s) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [a, s]);
  if (!a && !s) return null;
  return (
    <View style={{ gap: S[2] }}>
      {s && (
        <Pressable onPress={() => router.push('/session')} testID="resumeSession">
          <Card>
            <Row gap={S[3]}>
              <Icon icon={Dumbbell} color={C.accentInk} />
              <View style={{ flex: 1 }}><T>Training läuft</T><T v="small" tone="muted">{s.title}</T></View>
              <Num size={14} color={C.text2}>{Math.floor((now - s.started) / 60000)} Min</Num>
              <Icon icon={ChevronRight} />
            </Row>
          </Card>
        </Pressable>
      )}
      {a && SP[a.sport] && (
        <Pressable onPress={() => router.push('/sport-live')} testID="sportGo">
          <Card>
            <Row gap={S[3]}>
              <Icon icon={sportIcon(a.sport, SP[a.sport].cat)} sf={SPORT_SF[a.sport]} color={C.accentInk} />
              <View style={{ flex: 1 }}><T>{SP[a.sport].name}</T><T v="small" tone="muted">{a.pausedAt ? 'pausiert' : 'läuft'}</T></View>
              <Num size={14} color={C.text2}>{fmtDur(sportElapsed(a, now))}</Num>
              <Icon icon={ChevronRight} />
            </Row>
          </Card>
        </Pressable>
      )}
    </View>
  );
}
