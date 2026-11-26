import { router, useLocalSearchParams } from 'expo-router';
import { Pause, Play, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ExercisePlayer } from '@/components/exercise-anim';
import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Divider, Field, Icon, Num, Row, Screen, Seg, T, ValueRow } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { EX, setStats } from '@/lib/logic';
import { select, success } from '@/lib/haptics';
import { bestText, lastKg, newSession } from '@/lib/training';
import { nf, today, uid } from '@/lib/util';

const LEVEL = ['', 'Leicht', 'Mittel', 'Schwer'];

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const u = useUser(); const { update } = useStore();
  const e = EX[id];
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [log, setLog] = useState(false);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState(e?.type === 'time' ? '45' : '10');
  const [kg, setKg] = useState(() => { const k = lastKg(u, id); return k ? String(k) : ''; });
  if (!e) return <Screen><ModalHeader title="Übung nicht gefunden" /></Screen>;
  const fav = u.favorites.includes(id);
  const best = bestText(u, id);

  const train = () => {
    if (u.activeSession) return router.replace('/session');
    update(x => { x.activeSession = newSession(x, e.name, [[id, 3, e.type === 'time' ? 45 : 12]]); });
    router.replace('/session');
  };
  const saveLog = () => {
    const n = Math.max(1, Math.min(20, parseInt(sets, 10) || 1)), r = parseFloat(reps.replace(',', '.')) || 0, k = parseFloat(kg.replace(',', '.')) || 0;
    if (r <= 0) return;
    const list = Array.from({ length: n }, () => (e.type === 'time' ? { sec: r } : { reps: r, kg: k }));
    const bodyKg = +u.profile.weightKg || 75;
    let kcal = 0, vol = 0, sec = 0;
    for (const s of list) { const x = setStats(id, s, bodyKg); kcal += x.kcal; vol += x.vol; sec += x.sec; }
    update(x => { x.workouts.push({ id: uid(), date: today(), title: e.name, items: [{ ex: id, sets: list }], min: Math.max(1, Math.round((sec / 60) * (e.type === 'reps' ? 2 : 1))), kcal: Math.round(kcal), vol: Math.round(vol) }); });
    success(); close();
  };

  return (
    <Screen bottomInset>
      <ModalHeader kicker={`${e.cat} · ${LEVEL[e.level]}`} title={e.name} />
      <ExercisePlayer anim={e.anim} playing={playing} speed={speed} />
      <Row>
        <Pressable onPress={() => setPlaying(p => !p)} accessibilityLabel={playing ? 'Pause' : 'Abspielen'}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={playing ? Pause : Play} color={C.text} />
        </Pressable>
        <View style={{ flex: 1 }}><Seg items={[[0.5, '0,5×'], [1, '1×'], [1.5, '1,5×']]} value={speed} onChange={setSpeed} /></View>
        <Pressable onPress={() => { select(); update(x => { x.favorites = fav ? x.favorites.filter(f => f !== id) : [...x.favorites, id]; }); }} accessibilityLabel={fav ? 'Favorit entfernen' : 'Als Favorit markieren'}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={Star} filled={fav} color={fav ? C.accentInk : C.text} />
        </Pressable>
      </Row>

      <Card style={{ gap: S[2] }}>
        <T v="h3">So geht’s</T>
        {e.steps.map((s, i) => (
          <Row key={i} gap={S[3]} style={{ alignItems: 'flex-start' }}>
            <Num size={13} color={C.muted} style={{ width: 16, marginTop: 3 }}>{i + 1}</Num>
            <T v="small" tone="secondary" style={{ flex: 1 }}>{s}</T>
          </Row>
        ))}
        <Divider />
        <T v="small" tone="secondary"><T v="small">Tipp </T>{e.tips}</T>
      </Card>

      <Card>
        <View style={{ gap: 2 }}><T v="meta" tone="muted">Muskeln</T><T v="small">{e.muscles}</T></View>
        <View style={{ gap: 2 }}><T v="meta" tone="muted">Ausrüstung</T><T v="small">{e.equip}</T></View>
        {!!best && (<><Divider /><ValueRow label="Deine Bestleistung" value={best} accent /></>)}
      </Card>

      {log ? (
        <Card>
          <T v="h3">Sätze eintragen</T>
          <Row>
            <Field label="Sätze" value={sets} onChangeText={setSets} keyboardType="number-pad" />
            <Field label={e.type === 'time' ? 'Sekunden' : 'Wdh.'} value={reps} onChangeText={setReps} keyboardType="number-pad" />
            {e.type === 'reps' && <Field label="kg" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="0" />}
          </Row>
          <Row><Btn title="Abbrechen" kind="quiet" grow onPress={() => setLog(false)} /><Btn title="Speichern" kind="primary" grow onPress={saveLog} testID="saveLog" /></Row>
        </Card>
      ) : (
        <Row>
          <Btn title="Eintragen" grow onPress={() => setLog(true)} testID="logEx" />
          <Btn title={u.activeSession ? 'Zum laufenden Training' : 'Jetzt trainieren'} kind="primary" grow onPress={train} testID="trainEx" />
        </Row>
      )}
      <T v="meta" tone="muted" center>{nf(e.met, 1)} MET · {e.type === 'time' ? 'Zeitübung' : 'Wiederholungen'}</T>
    </Screen>
  );
}
