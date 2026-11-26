import { router } from 'expo-router';
import { Flag, Pause, Play } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Icon, Num, Row, Screen, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { SP } from '@/lib/logic';
import { confirmDestructive, success, tap } from '@/lib/haptics';
import { SPORT_SF } from '@/lib/icons';
import { sportIcon } from '@/lib/sport-icons';
import { fmtDur, sportElapsed, sportKcal } from '@/lib/training';
import { dateKey, nf } from '@/lib/util';

/** Live-Stoppuhr über Zeitstempel – läuft weiter, wenn die App geschlossen oder das Handy gesperrt ist */
export default function SportLive() {
  const u = useUser(); const { update } = useStore();
  const a = u.activeSport;
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  if (!a || !SP[a.sport]) {
    return <Screen bottomInset><ModalHeader title="Keine Aktivität aktiv" /><Btn title="Zum Training" onPress={() => router.replace('/training')} /></Screen>;
  }
  const sp = SP[a.sport]; const el = sportElapsed(a, now); const paused = !!a.pausedAt;
  const toggle = () => { tap(); update(x => {
    const s = x.activeSport; if (!s) return;
    if (s.pausedAt) { s.pausedMs += Date.now() - s.pausedAt; s.pausedAt = null; } else s.pausedAt = Date.now();
  }); };
  const finish = () => { success(); router.replace({ pathname: '/sport/[id]', params: { id: a.sport, live: '1', min: String(Math.max(1, Math.round(el / 60000))), date: dateKey(new Date(a.start)) } }); };

  return (
    <Screen bottomInset>
      <ModalHeader kicker={paused ? 'Pausiert' : 'Läuft'} title={sp.name} />
      <Card style={{ alignItems: 'center', paddingVertical: S[8], gap: S[4] }}>
        <View style={{ width: 48, height: 48, borderRadius: R.control + 2, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={sportIcon(sp.id, sp.cat)} sf={SPORT_SF[sp.id]} size={28} color={paused ? C.muted : C.accentInk} />
        </View>
        <View testID="spT"><Num size={64} color={paused ? C.muted : C.text} style={{ lineHeight: 72 }}>{fmtDur(el)}</Num></View>
        <T v="small" tone="muted">ca. {nf(sportKcal(u, sp, 'mittel', el / 60000, 0))} kcal</T>
      </Card>
      <Row>
        <Btn title={paused ? 'Weiter' : 'Pause'} icon={paused ? Play : Pause} grow onPress={toggle} testID="spP" />
        <Btn title="Beenden" icon={Flag} kind="primary" grow onPress={finish} testID="spF" />
      </Row>
      <Btn title={confirm ? 'Wirklich verwerfen' : 'Verwerfen'} kind="danger" onPress={() => {
        const discard = () => { update(x => { x.activeSport = null; }); close(); };
        if (confirmDestructive('Aktivität verwerfen?', 'Die Zeit wird nicht gespeichert.', 'Verwerfen', discard)) return;
        if (!confirm) return setConfirm(true); discard();
      }} />
      <T v="meta" tone="muted" center>Die Zeit läuft weiter, auch wenn du die App schließt oder das Handy sperrst</T>
    </Screen>
  );
}
