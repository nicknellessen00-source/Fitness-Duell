import { router } from 'expo-router';
import { ChartColumn, Dumbbell, Flag, Trophy, UtensilsCrossed, Zap, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { C, R, S } from '@/constants/theme';
import { useStore } from '@/context/app-store';
import { EXERCISES, POINTS } from '@/lib/data';

import { CoinIcon } from './coin';
import { measureSpot, type SpotRect } from './spot';
import { Btn, Icon, Row, T } from './ui';

type Href = '/' | '/training' | '/tracker' | '/food' | '/friends';
interface Step { icon: LucideIcon | 'coin'; title: string; text: string; href: Href; spot?: string }
const STEPS: Step[] = [
  { icon: Zap, title: 'So funktioniert FitDuell', text: 'Du trainierst, sammelst Punkte und trittst jede Woche gegen deine Freunde an. Ein paar Beispieldaten zeigen dir, wie das aussieht.', href: '/' },
  { icon: Flag, title: 'Wochen-Challenge', text: `Jeden Montag startet eine neue Aufgabe für alle. Geschafft bringt +${POINTS.challengeDone} Punkte, verpasst kostet ${POINTS.challengeFailed}.`, href: '/', spot: 'challenge' },
  { icon: Trophy, title: 'Dein Platz', text: 'Hier siehst du, wo du in der Rangliste stehst und wie viele Punkte dir zum Vordermann fehlen.', href: '/', spot: 'rank' },
  { icon: 'coin', title: 'FitCoins', text: 'Für Trainings, Schritte und Challenges gibt es FitCoins. Damit kaufst du Joker, Shirts für deine Figur und Rahmen.', href: '/', spot: 'coins' },
  { icon: Dumbbell, title: 'Training', text: `Pläne passend zu deinem Ziel – einfach auf „Starten“ tippen. Dazu ${EXERCISES.length} Übungen mit Animation und 34 Sportarten.`, href: '/training', spot: 'plan' },
  { icon: ChartColumn, title: 'Schritte', text: 'Schritte, Gewicht und Wochenbilanz. Die Schritte kommen automatisch vom Handy oder aus Apple Health.', href: '/tracker', spot: 'steps' },
  { icon: UtensilsCrossed, title: 'Ernährung', text: 'Barcode scannen, Etikett fotografieren oder einfach „2 Eier und ein Brötchen“ schreiben – Kalorien werden direkt erkannt.', href: '/food', spot: 'foodAdd' },
  { icon: Trophy, title: 'Rangliste', text: `Jedes Training bringt ${POINTS.workout} Punkte, dazu Minuten und Schritte. Freunde fügst du per Code hinzu und forderst sie zum Duell.`, href: '/friends', spot: 'board' },
];

const PAD = 8, RAD = 16;

export function Tour() {
  const { user, update } = useStore();
  const { width: W, height: H } = useWindowDimensions();
  const [i, setI] = useState(0);
  const [tipH, setTipH] = useState(240);
  const [measured, setMeasured] = useState<{ step: number; rect: SpotRect } | null>(null);
  const active = !!user && !user.tourDone;
  const st = STEPS[i];

  // Bereich ausmessen, sobald der Bildschirm gewechselt hat
  useEffect(() => {
    if (!active) return;
    let alive = true; let tries = 0;
    const step = i;
    const tick = async () => {
      if (!st.spot) return;
      const r = await measureSpot(st.spot);
      if (!alive) return;
      if (r) setMeasured({ step, rect: r }); else if (++tries < 8) setTimeout(tick, 150);
    };
    const id = setTimeout(tick, 350);
    return () => { alive = false; clearTimeout(id); };
  }, [active, i, st.spot, W, H]);

  if (!active) return null;
  const hole = measured && measured.step === i && st.spot ? measured.rect : null;
  const last = i === STEPS.length - 1;
  const end = () => { update(x => { x.tourDone = true; }); setI(0); router.navigate('/'); };
  const go = (n: number) => { setI(n); router.navigate(STEPS[n].href); };

  // Freigestellter Bereich und Platz für die Erklärung: unten, oben – sonst Bereich kürzen und Erklärung darunter
  const TOP = 48, BOTTOM = 96, GAP = 12;
  let h = hole ? { x: Math.max(4, hole.x - PAD), y: hole.y - PAD, w: Math.min(W - 8, hole.w + PAD * 2), h: hole.h + PAD * 2 } : null;
  let place: 'below' | 'above' | 'none' = 'none';
  if (h) {
    const below = H - BOTTOM - (h.y + h.h) - GAP, above = h.y - TOP - GAP;
    if (below >= tipH) place = 'below';
    else if (above >= tipH) place = 'above';
    else { h = { ...h, h: Math.max(72, H - BOTTOM - tipH - GAP - h.y) }; place = 'below'; }
  }
  const r = RAD;
  const dim = h
    ? `M0 0H${W}V${H}H0Z M${h.x + r} ${h.y}H${h.x + h.w - r}Q${h.x + h.w} ${h.y} ${h.x + h.w} ${h.y + r}V${h.y + h.h - r}Q${h.x + h.w} ${h.y + h.h} ${h.x + h.w - r} ${h.y + h.h}H${h.x + r}Q${h.x} ${h.y + h.h} ${h.x} ${h.y + h.h - r}V${h.y + r}Q${h.x} ${h.y} ${h.x + r} ${h.y}Z`
    : `M0 0H${W}V${H}H0Z`;

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent onRequestClose={end}>
      <View style={{ flex: 1 }} testID="tourOverlay">
        <Svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Path d={dim} fill="rgba(0,0,0,0.58)" fillRule="evenodd" />
          {h && <Rect x={h.x} y={h.y} width={h.w} height={h.h} rx={r} fill="none" stroke={C.accent} strokeWidth={3} />}
        </Svg>
        <View style={[
          { position: 'absolute', left: S[4], right: S[4], alignItems: 'center' },
          h ? (place === 'below' ? { top: h.y + h.h + GAP } : { bottom: H - h.y + GAP }) : { bottom: 112 },
        ]}>
          <View onLayout={e => setTipH(Math.round(e.nativeEvent.layout.height))} style={{ backgroundColor: C.card, borderRadius: R.card + 4, padding: S[5], gap: S[3], width: '100%', maxWidth: 520, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 }} testID="tour">
            <Row between>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                {st.icon === 'coin' ? <CoinIcon size={22} /> : <Icon icon={st.icon} color={C.onAccent} />}
              </View>
              <T v="meta" tone="muted">{i + 1} von {STEPS.length}</T>
            </Row>
            <T v="h3" testID="tourTitle">{st.title}</T>
            <T tone="secondary">{st.text}</T>
            <Row gap={S[1]}>{STEPS.map((_, k) => <View key={k} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: k <= i ? C.accentInk : C.raised }} />)}</Row>
            <Row>
              <Btn title="Später" kind="quiet" grow onPress={end} testID="tourSkip" />
              {i > 0 && <Btn title="Zurück" grow onPress={() => go(i - 1)} />}
              <Btn title={last ? "Los geht's" : 'Weiter'} kind="primary" grow onPress={() => (last ? end() : go(i + 1))} testID="tourNext" />
            </Row>
          </View>
        </View>
      </View>
    </Modal>
  );
}
