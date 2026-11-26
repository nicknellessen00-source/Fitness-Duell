import { router } from 'expo-router';
import { Dumbbell, Footprints, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Spot } from '@/components/spot';
import { Btn, Card, Divider, Field, Icon, Num, Row, Screen, T, Track, ValueRow } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { confirmDestructive } from '@/lib/haptics';
import { health, sensor } from '@/lib/health';
import { SPORT_SF } from '@/lib/icons';
import { calc, digestOf, SP } from '@/lib/logic';
import { sportIcon } from '@/lib/sport-icons';
import { fmtDate, isoWeekNo, mondayOf, nf, parseKey, today, weekDays } from '@/lib/util';

export default function Tracker() {
  const u = useUser(); const { update, connectHealth, connectSensor, syncSteps } = useStore();
  const [kg, setKg] = useState('');
  const [steps, setSteps] = useState('');
  const [armed, setArmed] = useState<string | null>(null);
  const [hmsg, setHmsg] = useState('');
  const [canAuto, setCanAuto] = useState(false);
  const [canSensor, setCanSensor] = useState(false);
  useEffect(() => {
    health.available().then(setCanAuto).catch(() => {});
    sensor.available().then(setCanSensor).catch(() => {});
  }, []);
  const enableSensor = async () => { setHmsg(''); if (!(await connectSensor())) setHmsg('Zugriff auf „Körperliche Aktivität“ wurde nicht erlaubt – in den Einstellungen änderbar'); };
  const hist = [...u.workouts].reverse().slice(0, 15);
  const dg = digestOf(u); const t = today(); const days = weekDays(mondayOf(t));
  const sum = (f: 'wo' | 'min' | 'steps' | 'kcal') => days.reduce((s, k) => s + (dg.days[k]?.[f] || 0), 0);
  const c = calc(u.profile);
  const goal = u.profile.stepGoal || 10000;
  const ws = u.weights.slice().sort((a, b) => (a.d < b.d ? -1 : 1));
  const last = ws[ws.length - 1]; const first = ws[0];
  const diff = last && first ? last.kg - first.kg : 0;
  const maxSteps = Math.max(goal, ...days.map(k => dg.days[k]?.steps || 0)) * 1.1;

  const saveWeight = () => {
    const v = parseFloat(kg.replace(',', '.')); if (!(v >= 35 && v <= 300)) return;
    update(x => { x.weights = x.weights.filter(w => w.d !== t).concat({ d: t, kg: v }); x.profile.weightKg = v; }); setKg('');
  };
  const saveSteps = () => {
    const v = parseInt(steps, 10); if (!(v >= 0 && v < 200000)) return;
    update(x => { x.steps[t] = v; }); setSteps('');
  };

  return (
    <Screen title="Tracker">
      <Card>
        <T v="small" tone="secondary">Woche {isoWeekNo(t)}</T>
        <Row style={{ alignItems: 'flex-start' }}>
          {[[sum('wo'), 'Trainings'], [sum('min'), 'Minuten'], [sum('steps'), 'Schritte'], [sum('kcal'), 'kcal']].map(([v, l], i) => (
            <View key={l as string} style={{ flex: i === 2 ? 1.4 : 1, gap: 2 }}>
              <Num size={22}>{nf(v as number)}</Num>
              <T v="meta" tone="muted">{l}</T>
            </View>
          ))}
        </Row>
      </Card>

      <Spot id="steps"><Card>
        <Row between><T v="h3">Schritte</T><T v="small" tone="muted">Ziel {nf(goal)}</T></Row>
        <View style={{ height: 140 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 20 + (goal / maxSteps) * 120, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.lineStrong }} />
          <Row style={{ alignItems: 'flex-end', height: '100%' }} gap={S[2]}>
            {days.map(k => {
              const v = dg.days[k]?.steps || 0;
              return (
                <View key={k} style={{ flex: 1, alignItems: 'center', gap: S[1], height: '100%', justifyContent: 'flex-end' }}>
                  <View style={{ width: '64%', height: Math.max(3, (v / maxSteps) * 120), backgroundColor: k === t ? C.accentInk : C.bar, borderRadius: 4 }} />
                  <Num size={11} color={k === t ? C.text : C.muted}>{parseKey(k).toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2)}</Num>
                </View>
              );
            })}
          </Row>
        </View>
        {u.health?.on ? (
          <View style={{ gap: S[2] }}>
            <Row gap={S[2]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.good }} />
              <T v="small" tone="secondary" style={{ flex: 1 }} testID="stepSource">
                {u.health.src === 'sensor' ? 'Handy-Sensor · zählt, solange FitDuell offen ist' : `Automatisch über ${health.label}`}
                {u.health.last ? ` · ${new Date(u.health.last).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </T>
              {u.health.src !== 'sensor' && <Btn title="Aktualisieren" small kind="quiet" onPress={() => syncSteps()} />}
            </Row>
            {Platform.OS === 'android' && u.health.src !== 'sensor' && !(u.steps[t] > 0) && (
              <View style={{ gap: S[2] }}>
                <T v="meta" tone="muted">Keine Schritte angekommen? Verbinde Google Fit oder Samsung Health mit Health Connect – oder nutze den Schrittsensor des Handys.</T>
                {canSensor && <Btn title="Handy-Sensor nutzen" small onPress={enableSensor} />}
              </View>
            )}
            <Btn title="Automatik ausschalten" small kind="quiet" onPress={() => update(x => { x.health = { on: false }; })} />
          </View>
        ) : (canAuto || canSensor) ? (
          <View style={{ gap: S[2] }}>
            {canAuto && <Btn title="Schritte automatisch übernehmen" icon={Footprints} kind="primary" onPress={async () => { setHmsg(''); if (!(await connectHealth())) setHmsg(Platform.OS === 'android' ? 'Health Connect ist nicht installiert oder der Zugriff wurde nicht erlaubt' : 'Zugriff auf „Bewegung & Fitness“ wurde nicht erlaubt – in den Einstellungen änderbar'); }} testID="healthOn" />}
            {canAuto && <T v="meta" tone="muted">{Platform.OS === 'ios' ? 'Liest die Schritte deines iPhones, bis zu 7 Tage rückwirkend.' : 'Liest deine Schritte aus Health Connect – von Handy, Uhr und Fitness-Apps wie Google Fit oder Samsung Health.'}</T>}
            {canSensor && <Btn title="Ohne Fitness-App: Handy-Sensor nutzen" kind={canAuto ? 'secondary' : 'primary'} onPress={enableSensor} testID="sensorOn" />}
            {canSensor && <T v="meta" tone="muted">Zählt mit dem Schrittsensor deines Handys, solange FitDuell geöffnet ist.</T>}
            {!!hmsg && <T v="small" color={C.bad}>{hmsg}</T>}
          </View>
        ) : Platform.OS === 'web' ? (
          <View style={{ gap: S[2] }}>
            {u.stepToken && u.cloud ? (
              <Row gap={S[2]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: u.shortcutLast ? C.good : C.muted }} />
                <T v="small" tone="secondary" style={{ flex: 1 }}>Apple Health per Kurzbefehl{u.shortcutLast ? ` · ${new Date(u.shortcutLast).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ' · noch nichts angekommen'}</T>
                <Btn title="Einrichtung" small kind="quiet" onPress={() => router.push('/health-setup')} />
              </Row>
            ) : (<>
              <Btn title="Apple Health verbinden" icon={Footprints} kind="primary" onPress={() => router.push('/health-setup')} testID="healthWeb" />
              <T v="meta" tone="muted">Ein iPhone-Kurzbefehl schickt deine Schritte automatisch an FitDuell – auch von der Apple Watch.</T>
            </>)}
          </View>
        ) : null}
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="Schritte heute" value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder={nf(u.steps[t] || 0)} />
          <Btn title="Speichern" onPress={saveSteps} />
        </Row>
      </Card></Spot>

      <Card>
        <T v="h3">Gewicht</T>
        <Row style={{ alignItems: 'flex-end' }} gap={S[2]}>
          <Num size={36}>{nf(last?.kg, 1)}</Num>
          <Num size={16} color={C.muted} style={{ marginBottom: 5 }}>kg</Num>
          <View style={{ flex: 1 }} />
          <T v="small" tone="muted" style={{ marginBottom: 4 }}>{diff > 0 ? '+' : diff < 0 ? '−' : '±'}{nf(Math.abs(diff), 1)} kg seit {first ? parseKey(first.d).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : '–'}</T>
        </Row>
        {u.profile.targetKg && first && last ? (
          <View style={{ gap: S[1] }}>
            <Track value={Math.abs(first.kg - last.kg)} max={Math.abs(first.kg - u.profile.targetKg) || 1} color={C.good} />
            <T v="meta" tone="muted">Ziel {nf(u.profile.targetKg, 1)} kg</T>
          </View>
        ) : null}
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="Gewicht heute in kg" value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder={nf(last?.kg, 1)} />
          <Btn title="Speichern" onPress={saveWeight} />
        </Row>
        <Divider />
        <ValueRow label={'BMI · ' + c.bmiTxt} value={nf(c.bmi, 1)} />
        {ws.slice(-5).reverse().map(w => <ValueRow key={w.d} label={parseKey(w.d).toLocaleDateString('de-DE')} value={nf(w.kg, 1) + ' kg'} />)}
      </Card>

      <Card style={{ gap: 0 }} testID="history">
        <T v="h3" style={{ marginBottom: S[2] }}>Verlauf</T>
        {!hist.length && <T v="small" tone="muted">Noch keine Trainings. Starte dein erstes unter Training.</T>}
        {hist.map((w, i) => (
          <View key={w.id}>
            {i > 0 && <Divider />}
            <Row gap={S[3]} style={{ minHeight: 56, paddingVertical: S[2] }}>
              <Icon icon={w.sport ? sportIcon(w.sport, SP[w.sport]?.cat) : Dumbbell} sf={w.sport ? SPORT_SF[w.sport] : undefined} />
              <View style={{ flex: 1 }}>
                <T v="small" numberOfLines={1}>{w.title}</T>
                <T v="meta" tone="muted">{fmtDate(w.date)} · {w.min} Min · {nf(w.kcal)} kcal{w.vol ? ` · ${nf(w.vol)} kg` : ''}{w.distKm ? ` · ${nf(w.distKm, 1)} km` : ''}</T>
              </View>
              <Pressable hitSlop={10} accessibilityLabel={`${w.title} löschen`} testID={'del-' + i} onPress={() => {
                const del = () => update(x => { x.workouts = x.workouts.filter(y => y.id !== w.id); });
                if (confirmDestructive('Training löschen?', 'Es wird auch aus der Rangliste entfernt.', 'Löschen', del)) return;
                if (armed === w.id) del(); else setArmed(w.id);
              }}>
                {armed === w.id ? <T v="small" color={C.bad}>Löschen</T> : <Icon icon={Trash2} size={18} />}
              </Pressable>
            </Row>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
