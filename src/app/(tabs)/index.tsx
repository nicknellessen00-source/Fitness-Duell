import { router } from 'expo-router';
import { ChevronRight, Droplet } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { ActiveBanner } from '@/components/active-banner';
import { ChallengeCard } from '@/components/challenge-card';
import { CoinBadge } from '@/components/coin';
import { Spot } from '@/components/spot';
import { DuelRow } from '@/components/duel-row';
import { Avatar, Bib, Btn, Card, Divider, Icon, Num, Ring, Row, Screen, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { PLANS } from '@/lib/data';
import { allDuels, calc, digestOf, EX, leaderboard, weekStats } from '@/lib/logic';
import { tap } from '@/lib/haptics';
import { frameColor } from '@/lib/coins';
import { planSession } from '@/lib/training';
import { isoWeekNo, mondayOf, nf, parseKey, today } from '@/lib/util';

export default function Home() {
  const u = useUser();
  const { cloud, update, clearSample } = useStore();
  const p = u.profile, c = calc(p), t = today();
  const dg = digestOf(u); const d = dg.days[t];
  const eaten = (u.food[t] || []).reduce((s, x) => s + x.kcal, 0);
  const ws = weekStats(dg, mondayOf(t));
  const lb = leaderboard(u, cloud.friends, cloud.duels).sort((a, b) => b.week.pts - a.week.pts);
  const myPos = lb.findIndex(x => x.me) + 1;
  const ahead = myPos > 1 ? lb[myPos - 2] : null;
  const plans = PLANS[p.goal]; const plan = plans[(u.planIdx || 0) % plans.length];
  const water = u.water[t] || 0;
  const activeDuels = allDuels(u, cloud.duels).filter(d => d.end >= t);
  const dateTxt = parseKey(t).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  const rings = [
    { v: eaten, max: c.kcal, cap: 'Gegessen', unit: 'kcal', goal: nf(c.kcal) },
    { v: d?.steps || 0, max: p.stepGoal || 10000, cap: 'Schritte', unit: '', goal: nf(p.stepGoal || 10000) },
    { v: d?.kcal || 0, max: 400, cap: 'Verbrannt', unit: 'kcal', goal: '400' },
  ];

  return (
    <Screen title={`Woche ${isoWeekNo(t)}`}
      right={<Row gap={S[2]}><Spot id="coins"><CoinBadge /></Spot><Pressable onPress={() => router.push('/profile')} accessibilityLabel="Profil" testID="profileBtn"><Avatar name={p.name} color={p.color} size={36} frame={frameColor(u.inv?.frame)} /></Pressable></Row>}>
      <T v="small" tone="secondary" style={{ marginTop: -S[3] }}>{dateTxt}</T>

      <ActiveBanner />
      {(!!u.sample || u.workouts.some(w => w.sample)) && (
        <Card style={{ backgroundColor: 'rgba(78,122,0,0.08)', paddingVertical: S[3] }} testID="sampleBanner">
          <Row gap={S[3]}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="small" strong>Beispieldaten</T>
              <T v="meta" tone="secondary">So sieht FitDuell nach zwei Wochen aus. Nur für dich sichtbar, ohne FitCoins.</T>
            </View>
            <Btn title="Entfernen" small onPress={clearSample} testID="clearSample" />
          </Row>
        </Card>
      )}
      <Spot id="challenge"><ChallengeCard ws={ws} /></Spot>

      <Spot id="rank"><Pressable onPress={() => router.navigate('/friends')} testID="rankCard">
        <Card>
          <Row gap={S[3]}>
            <Bib n={myPos} lead={myPos === 1} />
            <View style={{ flex: 1 }}>
              <T>{myPos === 1 ? 'Du liegst vorne' : `Platz ${myPos} von ${lb.length}`}</T>
              <T v="small" tone="muted">{ahead ? `${nf(ahead.week.pts - ws.pts)} Punkte hinter ${ahead.dg.name.replace(' (Demo)', '')}` : lb[1] ? `${nf(ws.pts - lb[1].week.pts)} Punkte Vorsprung` : 'Noch keine Gegner'}</T>
            </View>
            <Num size={20}>{nf(ws.pts)}</Num>
            <Icon icon={ChevronRight} />
          </Row>
        </Card>
      </Pressable></Spot>

      <Card>
        <Row between><T v="h3">Heute</T></Row>
        <Row style={{ justifyContent: 'space-between' }}>
          {rings.map(r => (
            <View key={r.cap} style={{ alignItems: 'center', gap: S[2], flex: 1 }}>
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ring value={r.v} max={r.max} size={84} />
                <View style={{ position: 'absolute', alignItems: 'center' }}><Num size={16}>{nf(r.v)}</Num></View>
              </View>
              <View style={{ alignItems: 'center' }}>
                <T v="small">{r.cap}</T>
                <T v="meta" tone="muted">von {r.goal}{r.unit ? ' ' + r.unit : ''}</T>
              </View>
            </View>
          ))}
        </Row>
      </Card>

      {activeDuels.length > 0 && (
        <Card style={{ gap: 0 }}>
          <T v="h3">Laufende Duelle</T>
          {activeDuels.map((d, i) => <View key={d.id}>{i > 0 && <Divider />}<DuelRow d={d} /></View>)}
        </Card>
      )}

      <Card>
        <Row gap={S[3]}>
          <View style={{ flex: 1 }}>
            <T v="small" tone="muted">Nächstes Training</T>
            <T>{plan.name}</T>
            <T v="small" tone="secondary" numberOfLines={1}>{plan.items.length} Übungen · {plan.items.slice(0, 3).map(i => EX[i[0]]?.name).join(', ')}</T>
          </View>
          <Btn title="Starten" small kind="primary" testID="startPlan" onPress={() => {
            if (!u.activeSession) update(x => { x.activeSession = planSession(x); });
            router.push('/session');
          }} />
        </Row>
      </Card>

      <Card>
        <Row gap={S[3]}>
          <Icon icon={Droplet} filled color={C.blue} />
          <View style={{ flex: 1 }}>
            <T>Wasser</T>
            <T v="small" tone="muted">{nf(water / 1000, 2)} von {nf(c.water / 1000, 1)} l</T>
          </View>
          <Btn title="+250 ml" small onPress={() => { tap(); update(x => { x.water[t] = (x.water[t] || 0) + 250; }); }} testID="qWater" />
        </Row>
      </Card>
    </Screen>
  );
}
