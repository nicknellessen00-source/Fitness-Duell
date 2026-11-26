import { router } from 'expo-router';
import { ChartColumn, Dumbbell, Flag, Trophy, UtensilsCrossed, Zap, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, View } from 'react-native';

import { C, R, S } from '@/constants/theme';
import { useStore } from '@/context/app-store';
import { EXERCISES, POINTS } from '@/lib/data';

import { Btn, Icon, Row, T } from './ui';

type Href = '/' | '/training' | '/tracker' | '/food' | '/friends';
const STEPS: { icon: LucideIcon; title: string; text: string; href: Href }[] = [
  { icon: Zap, title: 'So funktioniert FitDuell', text: 'Du trainierst, sammelst Punkte und trittst jede Woche gegen deine Freunde an. Fünf kurze Schritte zeigen dir, wo was ist.', href: '/' },
  { icon: Flag, title: 'Wochen-Challenge', text: `Jeden Montag startet eine neue Aufgabe für alle. Geschafft bringt +${POINTS.challengeDone} Punkte, verpasst kostet ${POINTS.challengeFailed}.`, href: '/' },
  { icon: Dumbbell, title: 'Training', text: `Pläne passend zu deinem Ziel und ${EXERCISES.length} Übungen. Markiere deine liebsten als Favoriten.`, href: '/training' },
  { icon: ChartColumn, title: 'Tracker', text: 'Schritte, Gewicht und deine Wochenbilanz auf einen Blick.', href: '/tracker' },
  { icon: UtensilsCrossed, title: 'Ernährung', text: 'Schreib „2 Eier und ein Brötchen“ – Mengen und Kalorien werden direkt auf dem Gerät erkannt.', href: '/food' },
  { icon: Trophy, title: 'Rangliste', text: `Jedes Training bringt ${POINTS.workout} Punkte, dazu Minuten und Schritte. Freunde fügst du per Code hinzu.`, href: '/friends' },
];

export function Tour() {
  const { user, update } = useStore();
  const [i, setI] = useState(0);
  if (!user || user.tourDone) return null;
  const st = STEPS[i]; const last = i === STEPS.length - 1;
  const end = () => { update(x => { x.tourDone = true; }); setI(0); router.navigate('/'); };
  const go = (n: number) => { setI(n); router.navigate(STEPS[n].href); };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={end}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end', padding: S[4], paddingBottom: 112 }}>
        <View style={{ backgroundColor: C.card, borderRadius: R.card + 2, borderWidth: 1, borderColor: C.lineStrong, padding: S[5], gap: S[3], width: '100%', maxWidth: 520, alignSelf: 'center' }} testID="tour">
          <Row between>
            <View style={{ width: 36, height: 36, borderRadius: R.control, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' }}><Icon icon={st.icon} color={C.text} /></View>
            <T v="meta" tone="muted">{i + 1} von {STEPS.length}</T>
          </Row>
          <T v="h3">{st.title}</T>
          <T tone="secondary">{st.text}</T>
          <Row gap={S[1]}>{STEPS.map((_, k) => <View key={k} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= i ? C.accentInk : C.raised }} />)}</Row>
          <Row>
            <Btn title="Überspringen" kind="quiet" grow onPress={end} testID="tourSkip" />
            {i > 0 && <Btn title="Zurück" grow onPress={() => go(i - 1)} />}
            <Btn title={last ? 'Fertig' : 'Weiter'} kind="primary" grow onPress={() => (last ? end() : go(i + 1))} testID="tourNext" />
          </Row>
        </View>
      </View>
    </Modal>
  );
}
