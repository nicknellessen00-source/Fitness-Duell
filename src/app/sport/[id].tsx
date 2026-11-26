import { router, useLocalSearchParams } from 'expo-router';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Divider, Field, Num, Row, Screen, Seg, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { POINTS } from '@/lib/data';
import { SP } from '@/lib/logic';
import { success } from '@/lib/haptics';
import { INTENS, paceText, sportKcal, type Intensity } from '@/lib/training';
import { addDays, nf, today, uid } from '@/lib/util';

export default function SportLog() {
  const p = useLocalSearchParams<{ id: string; live?: string; min?: string; date?: string }>();
  const u = useUser(); const { update } = useStore();
  const sp = SP[p.id];
  const live = p.live === '1';
  const [day, setDay] = useState(p.date || today());
  const [min, setMin] = useState(p.min || '');
  const [km, setKm] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('mittel');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  if (!sp) return <Screen><ModalHeader title="Sportart nicht gefunden" /></Screen>;

  const m = Math.round(parseFloat(min.replace(',', '.')) || 0), d = sp.dist ? parseFloat(km.replace(',', '.')) || 0 : 0;
  const kcal = sportKcal(u, sp, intensity, m, d);
  const pace = paceText(sp, m, d);
  const t = today();
  const days: [string, string][] = [[t, 'Heute'], [addDays(t, -1), 'Gestern'], [addDays(t, -2), 'Vorgestern']];
  if (!days.some(x => x[0] === day)) days.unshift([day, new Date(day).toLocaleDateString('de-DE')]);

  const startLive = () => {
    if (u.activeSport) return router.replace('/sport-live');
    update(x => { x.activeSport = { sport: sp.id, start: Date.now(), pausedMs: 0, pausedAt: null }; });
    router.replace('/sport-live');
  };
  const save = () => {
    if (m < 1) return setErr('Bitte die Dauer in Minuten angeben');
    if (m > 900) return setErr('Dauer bitte in Minuten angeben');
    update(x => {
      x.workouts.push({ id: uid(), date: day, title: sp.name + (note.trim() ? ' – ' + note.trim() : ''), sport: sp.id, intensity, distKm: d || undefined, items: [], min: m, kcal, vol: 0 });
      x.workouts.sort((a, b) => (a.date < b.date ? -1 : 1));
      if (live) x.activeSport = null;
    });
    success(); close();
  };

  return (
    <Screen bottomInset>
      <ModalHeader kicker={live ? 'Aktivität speichern' : sp.cat} title={sp.name} />
      {!live && (
        <Card>
          <T v="small" tone="secondary">Die Stoppuhr läuft weiter, auch wenn du die App schließt.</T>
          <Btn title={u.activeSport ? 'Laufende Aktivität öffnen' : 'Live starten'} icon={Play} kind="primary" onPress={startLive} testID="spLive" />
        </Card>
      )}
      <Card>
        <T v="h3">{live ? 'Details' : 'Nachtragen'}</T>
        <Seg items={days} value={day} onChange={setDay} />
        <Row>
          <Field label="Dauer in Minuten" value={min} onChangeText={setMin} keyboardType="number-pad" placeholder="60" testID="spM" />
          {sp.dist && <Field label="Distanz in km" value={km} onChangeText={setKm} keyboardType="decimal-pad" placeholder="optional" testID="spK" />}
        </Row>
        <T v="small" tone="secondary">Intensität</T>
        <Seg items={Object.entries(INTENS).map(([k, x]) => [k as Intensity, x.label] as [Intensity, string])} value={intensity} onChange={setIntensity} />
        <Field label="Notiz" value={note} onChangeText={setNote} maxLength={80} placeholder={sp.id === 'tennis' || sp.id === 'padel' ? 'Doppel mit Max, 6:4 6:3' : 'Strecke, Gegner, Gefühl'} />
        <Divider />
        <Row between>
          <T v="small" tone="muted" testID="spInfo">{pace || (m ? `${m} Min · ${INTENS[intensity].label}` : 'Dauer eingeben')}</T>
          <Num color={C.accentInk} testID="spKcal">{nf(kcal)} kcal</Num>
        </Row>
        {m > 0 && <T v="meta" tone="muted">+{POINTS.workout + Math.floor(m / POINTS.perMinutes)} Punkte für die Rangliste</T>}
        {!!err && <T v="small" color={C.bad}>{err}</T>}
        <View style={{ height: S[1] }} />
        <Btn title="Speichern" kind="primary" onPress={save} testID="spSave" />
      </Card>
    </Screen>
  );
}
