import { router } from 'expo-router';
import { useState } from 'react';
import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Btn, Card, Divider, Field, Icon, Row, Seg, T, ValueRow } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useStore, type RegData } from '@/context/app-store';
import { ACTIVITY, GOALS, LEVELS, type GoalId } from '@/lib/data';
import { calc, COLORS } from '@/lib/logic';
import type { Sex } from '@/lib/types';
import { nf } from '@/lib/util';

const STEPS = ['Konto', 'Körper', 'Aktivität', 'Ziel', 'Fertig'];

/** „24.12.1995“ → „1995-12-24“ (oder null) */
function parseBirth(s: string) {
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const dt = new Date(y, mo - 1, d);
  if (dt.getMonth() !== mo - 1 || y < 1900 || dt > new Date()) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const num = (s: string) => { const v = parseFloat(s.replace(',', '.')); return Number.isFinite(v) ? v : 0; };

function Choice({ on, onPress, children, testID }: { on: boolean; onPress: () => void; children: React.ReactNode; testID?: string }) {
  return (
    <Pressable onPress={onPress} testID={testID}
      style={{ flexDirection: 'row', alignItems: 'center', gap: S[3], padding: S[3], borderRadius: R.control, borderWidth: 1, borderColor: on ? C.accentInk : C.line, backgroundColor: on ? 'rgba(78,122,0,0.06)' : 'transparent' }}>
      {children}
      <View style={{ width: 18 }}>{on && <Icon icon={Check} color={C.text} />}</View>
    </Pressable>
  );
}

export default function Register() {
  const { accounts, register } = useStore();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: '', email: '', pw: '', color: COLORS[0], sex: 'm' as Sex, birth: '01.01.1995', height: '', weight: '', target: '', bodyFat: '', restHr: '',
    activity: 1.375, level: 'beginner', days: 3, stepGoal: '10000', injuries: '', goal: 'lose' as GoalId,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));

  const data = (): RegData => ({
    name: f.name.trim(), email: f.email.trim(), pw: f.pw, color: f.color, sex: f.sex, birth: parseBirth(f.birth) || '1995-01-01',
    heightCm: num(f.height), weightKg: num(f.weight), targetKg: num(f.target) || null, bodyFat: num(f.bodyFat) || null, restHr: num(f.restHr) || null,
    activity: f.activity, level: f.level, days: f.days, stepGoal: num(f.stepGoal) || 10000, injuries: f.injuries.trim(), goal: f.goal,
  });

  const validate = () => {
    if (step === 0) {
      if (!f.name.trim()) return 'Bitte gib einen Namen ein';
      if (f.pw.length < 4) return 'Passwort: mindestens 4 Zeichen';
      if (accounts.some(a => a.name.toLowerCase() === f.name.trim().toLowerCase())) return 'Name ist auf diesem Gerät schon vergeben';
    }
    if (step === 1) {
      if (!parseBirth(f.birth)) return 'Geburtsdatum bitte als TT.MM.JJJJ';
      const h = num(f.height), w = num(f.weight);
      if (h < 120 || h > 230) return 'Größe zwischen 120 und 230 cm';
      if (w < 35 || w > 300) return 'Gewicht zwischen 35 und 300 kg';
    }
    return '';
  };
  const next = async () => {
    const e = validate(); setErr(e); if (e) return;
    if (step < 4) return setStep(step + 1);
    setBusy(true);
    try { await register(data()); } catch (x) { setErr((x as Error).message); setBusy(false); }
  };
  const back = () => (step > 0 ? setStep(step - 1) : router.canGoBack() ? router.back() : router.replace('/welcome'));

  return (
    <AuthShell>
      <View style={{ gap: S[2] }}>
        <T v="meta" tone="muted">Schritt {step + 1} von {STEPS.length} · {STEPS[step]}</T>
        <Row gap={S[1]}>{STEPS.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? C.accentInk : C.raised }} />)}</Row>
      </View>
      <Card>
        {step === 0 && (<>
          <T v="h3">Dein Konto</T>
          <T v="small" tone="secondary">So erkennen dich deine Freunde in der Rangliste</T>
          <Field label="Name / Spitzname" value={f.name} onChangeText={v => set('name', v)} maxLength={24} autoComplete="nickname" testID="r_name" />
          <Field label="E-Mail (optional)" value={f.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Field label="Passwort (mind. 4 Zeichen)" value={f.pw} onChangeText={v => set('pw', v)} secureTextEntry autoComplete="new-password" testID="r_pw" />
          <T v="small" tone="secondary">Farbe in der Rangliste</T>
          <Row wrap>
            {COLORS.map(c => (
              <Pressable key={c} onPress={() => set('color', c)} accessibilityLabel={'Farbe ' + c}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: 2, borderColor: c === f.color ? C.text : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {c === f.color && <Icon icon={Check} color={C.onAccent} size={16} />}
              </Pressable>
            ))}
          </Row>
        </>)}

        {step === 1 && (<>
          <T v="h3">Körperdaten</T>
          <T v="small" tone="secondary">Für Kalorienbedarf, BMI und Trainingsvolumen</T>
          <Seg items={[['m', 'Männlich'], ['f', 'Weiblich'], ['d', 'Divers']]} value={f.sex} onChange={v => set('sex', v)} />
          <Row><Field label="Geburtsdatum" value={f.birth} onChangeText={v => set('birth', v)} placeholder="TT.MM.JJJJ" keyboardType="numbers-and-punctuation" />
            <Field label="Größe (cm)" value={f.height} onChangeText={v => set('height', v)} keyboardType="number-pad" testID="r_h" /></Row>
          <Row><Field label="Gewicht (kg)" value={f.weight} onChangeText={v => set('weight', v)} keyboardType="decimal-pad" testID="r_w" />
            <Field label="Zielgewicht (kg)" value={f.target} onChangeText={v => set('target', v)} keyboardType="decimal-pad" /></Row>
          <Row><Field label="Körperfett % (opt.)" value={f.bodyFat} onChangeText={v => set('bodyFat', v)} keyboardType="decimal-pad" />
            <Field label="Ruhepuls (opt.)" value={f.restHr} onChangeText={v => set('restHr', v)} keyboardType="number-pad" /></Row>
        </>)}

        {step === 2 && (<>
          <T v="h3">Aktivität und Erfahrung</T>
          <T v="small" tone="secondary">Alltagsaktivität</T>
          <View style={{ gap: S[2] }}>{ACTIVITY.map(a => <Choice key={a.id} on={f.activity === a.id} onPress={() => set('activity', a.id)}><T v="small" style={{ flex: 1 }}>{a.label}</T></Choice>)}</View>
          <T v="small" tone="secondary">Trainingserfahrung</T>
          <Seg items={Object.entries(LEVELS) as [string, string][]} value={f.level} onChange={v => set('level', v)} />
          <T v="small" tone="secondary">Trainingstage pro Woche</T>
          <Seg items={[1, 2, 3, 4, 5, 6, 7].map(n => [n, String(n)] as [number, string])} value={f.days} onChange={v => set('days', v)} />
          <Field label="Tägliches Schrittziel" value={f.stepGoal} onChangeText={v => set('stepGoal', v)} keyboardType="number-pad" />
          <Field label="Verletzungen / Einschränkungen (optional)" value={f.injuries} onChangeText={v => set('injuries', v)} placeholder="z. B. Knieprobleme links" />
        </>)}

        {step === 3 && (<>
          <T v="h3">Dein Ziel</T>
          <T v="small" tone="secondary">Bestimmt Trainingsplan und Kalorienziel, jederzeit änderbar</T>
          <View style={{ gap: S[2] }}>
            {(Object.entries(GOALS) as [GoalId, (typeof GOALS)[GoalId]][]).map(([k, g]) => (
              <Choice key={k} on={f.goal === k} onPress={() => set('goal', k)} testID={'goal-' + k}>
                <View style={{ flex: 1, gap: 2 }}><T>{g.label.replace('-spezifisch', '')}</T><T v="small" tone="secondary">{g.desc}</T></View>
              </Choice>
            ))}
          </View>
        </>)}

        {step === 4 && (() => {
          const d = data(); const c = calc(d);
          return (<>
            <T v="h3">Dein Startprofil</T>
            <View>
              <ValueRow label="Tagesziel" value={nf(c.kcal) + ' kcal'} accent />
              <Divider />
              <ValueRow label="Gesamtumsatz" value={nf(c.tdee) + ' kcal'} />
              <ValueRow label="Grundumsatz" value={nf(c.bmr) + ' kcal'} />
              <ValueRow label="Protein pro Tag" value={c.protein + ' g'} />
              <ValueRow label="Wasser pro Tag" value={nf(c.water / 1000, 1) + ' l'} />
              <ValueRow label={'BMI · ' + c.bmiTxt} value={nf(c.bmi, 1)} />
            </View>
            <T v="small" tone="secondary">Ziel {GOALS[d.goal].label.replace('-spezifisch', '')}, {d.days} Trainings pro Woche. Drei Demo-Freunde stehen schon in deiner Rangliste, damit du sie gleich ausprobieren kannst.</T>
          </>);
        })()}

        {!!err && <T v="small" color={C.bad}>{err}</T>}
        <Row>
          <Btn title="Zurück" grow onPress={back} />
          <Btn title={step === 4 ? 'Konto anlegen' : 'Weiter'} kind="primary" grow disabled={busy} onPress={next} testID="regNext" />
        </Row>
      </Card>
    </AuthShell>
  );
}
