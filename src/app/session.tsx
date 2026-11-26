import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Check, ChevronLeft, ChevronRight, Minus, Plus, Timer } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, Vibration, View } from 'react-native';

import { ChallengeCard } from '@/components/challenge-card';
import { ExercisePlayer } from '@/components/exercise-anim';
import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Divider, Icon, Num, Row, Screen, T, Track } from '@/components/ui';
import { C, MONO, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { PLANS, POINTS } from '@/lib/data';
import { digestOf, EX, weekStats } from '@/lib/logic';
import { confirmDestructive, success, tap } from '@/lib/haptics';
import { finishSession } from '@/lib/training';
import type { SessionSet, Workout } from '@/lib/types';
import { mondayOf, nf, today } from '@/lib/util';

/** Zahlenfeld mit eigenem Text-Zustand (Komma-Eingabe), übernimmt den Wert beim Verlassen */
function NumField({ value, onCommit, decimal, testID }: { value: number | '' | undefined; onCommit: (v: number | '') => void; decimal?: boolean; testID?: string }) {
  const [txt, setTxt] = useState(value === '' || value == null ? '' : String(value).replace('.', ','));
  const commit = () => { const v = parseFloat(txt.replace(',', '.')); onCommit(Number.isFinite(v) ? v : ''); };
  return (
    <TextInput value={txt} onChangeText={setTxt} onBlur={commit} onSubmitEditing={commit} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} placeholder="0" placeholderTextColor={C.muted}
      selectTextOnFocus testID={testID}
      style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 10, backgroundColor: C.raised, color: C.text, textAlign: 'center', fontFamily: MONO, fontSize: 17 }} />
  );
}

function KeepAwake() { useKeepAwake(); return null; }

export default function SessionScreen() {
  const u = useUser(); const { update } = useStore();
  const s = u.activeSession;
  const [now, setNow] = useState(() => Date.now());
  const [restEnd, setRestEnd] = useState(0);
  const [timer, setTimer] = useState<{ i: number; end: number } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [result, setResult] = useState<Workout | null>(null);
  const [msg, setMsg] = useState('');

  const mut = (fn: (x: NonNullable<typeof s>) => void) => update(x => { if (x.activeSession) fn(x.activeSession); });

  // Uhr: Pausen-Ende melden, Satz-Timer abschließen
  const tick = useRef({ restEnd, timer, mut });
  useEffect(() => { tick.current = { restEnd, timer, mut }; });
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now(); const c = tick.current;
      if (c.restEnd && t >= c.restEnd) { setRestEnd(0); success(); Vibration.vibrate([0, 200, 100, 200]); }
      if (c.timer && t >= c.timer.end) {
        const i = c.timer.i; setTimer(null); success(); Vibration.vibrate(400);
        c.mut(x => { const st = x.items[x.cur].sets[i]; if (st) st.done = true; });
        setRestEnd(t + 45000);
      }
      setNow(t);
    }, 500);
    return () => clearInterval(id);
  }, []);
  const restLeft = Math.max(0, Math.ceil((restEnd - now) / 1000));

  if (result) {
    const ws = weekStats(digestOf(u), mondayOf(today()));
    return (
      <Screen bottomInset>
        <ModalHeader kicker="Training gespeichert" title={result.title} />
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            {[[result.min, 'Minuten'], [result.kcal, 'kcal'], [result.vol || 0, 'kg bewegt']].map(([v, l]) => (
              <View key={l as string} style={{ flex: 1, gap: 2 }}><Num size={24}>{nf(v as number)}</Num><T v="meta" tone="muted">{l}</T></View>
            ))}
          </Row>
          <Divider />
          <Row between><T v="small" tone="secondary">Für die Rangliste</T><Num color={C.accentInk}>+{POINTS.workout + Math.floor(result.min / POINTS.perMinutes)} Punkte</Num></Row>
        </Card>
        {!!result.prs?.length && (
          <Card testID="prs">
            <T v="h3">Neue Bestleistung</T>
            {result.prs.map(p => <T key={p} v="small" tone="secondary">{p}</T>)}
          </Card>
        )}
        <ChallengeCard ws={ws} />
        <Btn title="Fertig" kind="primary" onPress={close} testID="doneBtn" />
      </Screen>
    );
  }

  if (!s) {
    return (
      <Screen bottomInset>
        <ModalHeader title="Kein Training aktiv" />
        <Btn title="Zum Training" onPress={() => router.replace('/training')} />
      </Screen>
    );
  }

  const it = s.items[s.cur]; const e = EX[it.ex];
  const doneSets = s.items.reduce((n, x) => n + x.sets.filter(y => y.done).length, 0);
  const allSets = s.items.reduce((n, x) => n + x.sets.length, 0);
  const elapsedMin = Math.floor((now - s.started) / 60000);
  const last = s.cur === s.items.length - 1;

  const toggleDone = (i: number) => {
    const wasDone = it.sets[i].done; tap();
    mut(x => { x.items[x.cur].sets[i].done = !wasDone; });
    if (!wasDone) setRestEnd(Date.now() + (e.type === 'time' ? 45 : 75) * 1000);
  };
  const setField = (i: number, f: keyof SessionSet, v: number | '') => mut(x => { (x.items[x.cur].sets[i] as unknown as Record<string, number | ''>)[f] = v; });
  const finish = () => {
    const w = finishSession(u, s);
    if (!w) { setMsg('Hake mindestens einen Satz als erledigt ab'); return; }
    update(x => {
      x.workouts.push(w);
      if (s.planIdx != null) x.planIdx = (s.planIdx + 1) % PLANS[x.profile.goal].length;
      x.activeSession = null;
    });
    success(); setResult(w);
  };

  return (
    <Screen bottomInset>
      {Platform.OS !== 'web' && <KeepAwake />}
      <ModalHeader kicker={`${s.title} · Übung ${s.cur + 1} von ${s.items.length}`} title={e.name} />
      <View style={{ gap: S[1] + 2 }}>
        <Track value={doneSets} max={allSets} />
        <Row between><Num size={12} color={C.muted}>{doneSets}/{allSets} Sätze</Num><Num size={12} color={C.muted}>{elapsedMin} Min</Num></Row>
      </View>

      <ExercisePlayer anim={e.anim} />
      <Row gap={S[2]} style={{ alignItems: 'flex-start' }}>
        <T v="small" tone="secondary" style={{ flex: 1 }}>{e.steps[1] || e.steps[0]}</T>
        <Pressable onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: it.ex } })}><T v="small" color={C.text} style={{ textDecorationLine: 'underline' }}>Anleitung</T></Pressable>
      </Row>

      {restLeft > 0 && (
        <Card testID="restBox">
          <Row between>
            <View><T v="small" tone="muted">Pause</T><Num size={32}>{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}</Num></View>
            <Row><Btn title="+15 s" small onPress={() => setRestEnd(r => r + 15000)} /><Btn title="Weiter" small kind="primary" onPress={() => setRestEnd(0)} testID="skipRest" /></Row>
          </Row>
        </Card>
      )}

      <Card style={{ gap: S[2] }}>
        <Row gap={S[2]}>
          <T v="meta" tone="muted" style={{ width: 28 }}>Satz</T>
          <T v="meta" tone="muted" style={{ flex: 1, textAlign: 'center' }}>{e.type === 'time' ? 'Sekunden' : 'Wdh.'}</T>
          <T v="meta" tone="muted" style={{ flex: 1, textAlign: 'center' }}>{e.type === 'time' ? 'Timer' : 'kg'}</T>
          <View style={{ width: 44 }} />
        </Row>
        {it.sets.map((st, i) => (
          <Row key={`${s.cur}-${i}-${it.sets.length}`} gap={S[2]} style={{ opacity: st.done ? 0.6 : 1 }}>
            <Num size={14} color={C.muted} style={{ width: 28 }}>{i + 1}</Num>
            {e.type === 'time' ? (<>
              <NumField value={st.sec} onCommit={v => setField(i, 'sec', v)} />
              <Pressable onPress={() => setTimer(timer?.i === i ? null : { i, end: Date.now() + (+(st.sec || 30)) * 1000 })} testID={`timer-${i}`}
                style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: timer?.i === i ? C.accent : C.raised, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S[1] }}>
                {timer?.i === i ? <Num color={C.onAccent}>{Math.max(0, Math.ceil((timer.end - now) / 1000))} s</Num> : <><Icon icon={Timer} size={16} color={C.text} /><T v="small">Start</T></>}
              </Pressable>
            </>) : (<>
              <NumField value={st.reps} onCommit={v => setField(i, 'reps', v)} testID={`reps-${i}`} />
              <NumField value={st.kg} onCommit={v => setField(i, 'kg', v)} decimal testID={`kg-${i}`} />
            </>)}
            <Pressable onPress={() => toggleDone(i)} accessibilityLabel={`Satz ${i + 1} ${st.done ? 'offen' : 'erledigt'}`} testID={`done-${i}`}
              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: st.done ? C.accent : C.bar, backgroundColor: st.done ? C.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {st.done && <Icon icon={Check} color={C.onAccent} />}
            </Pressable>
          </Row>
        ))}
        <Row>
          <Btn title="Satz" icon={Plus} small kind="quiet" onPress={() => mut(x => { const sets = x.items[x.cur].sets; const l = sets[sets.length - 1]; sets.push({ ...(l || {}), done: false }); })} />
          <Btn title="Satz" icon={Minus} small kind="quiet" disabled={it.sets.length < 2} onPress={() => mut(x => { if (x.items[x.cur].sets.length > 1) x.items[x.cur].sets.pop(); })} />
        </Row>
      </Card>

      <Row>
        <Btn title="Zurück" icon={ChevronLeft} grow disabled={s.cur === 0} onPress={() => mut(x => { x.cur--; })} />
        {last
          ? <Btn title="Training beenden" kind="primary" grow onPress={finish} testID="finishBtn" />
          : <Btn title="Nächste Übung" icon={ChevronRight} kind="primary" grow onPress={() => mut(x => { x.cur++; })} testID="nextEx" />}
      </Row>
      {!!msg && <T v="small" color={C.bad} center>{msg}</T>}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S[2] }}>
        {s.items.map((x, i) => {
          const done = x.sets.every(y => y.done);
          return (
            <Pressable key={i} onPress={() => mut(y => { y.cur = i; })}
              hitSlop={6} style={{ height: 34, paddingHorizontal: S[4], borderRadius: 17, backgroundColor: i === s.cur ? C.accent : C.raised, flexDirection: 'row', alignItems: 'center', gap: S[1] }}>
              {done && <Icon icon={Check} size={14} color={i === s.cur ? C.onAccent : C.good} />}
              <T v="small" strong={i === s.cur} color={i === s.cur ? C.onAccent : C.text}>{EX[x.ex]?.name}</T>
            </Pressable>
          );
        })}
      </ScrollView>

      <Row>
        <Btn title={confirmDiscard ? 'Wirklich verwerfen' : 'Verwerfen'} kind="danger" grow
          onPress={() => {
            const discard = () => { update(x => { x.activeSession = null; }); close(); };
            if (confirmDestructive('Training verwerfen?', 'Alle Sätze dieser Einheit gehen verloren.', 'Verwerfen', discard)) return;
            if (!confirmDiscard) return setConfirmDiscard(true); discard();
          }} />
        {!last && <Btn title="Beenden" grow onPress={finish} />}
      </Row>
    </Screen>
  );
}
