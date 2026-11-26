import { router } from 'expo-router';
import { ChevronRight, Play, Search, Star } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';

import { ActiveBanner } from '@/components/active-banner';
import { ExerciseThumb } from '@/components/exercise-anim';
import { Spot } from '@/components/spot';
import { Btn, Card, Divider, Icon, Num, Row, Screen, Seg, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { CATS, EXERCISES, GOALS, PLANS, SPORTS } from '@/lib/data';
import { norm } from '@/lib/foods';
import { EX, SP } from '@/lib/logic';
import { SPORT_SF } from '@/lib/icons';
import { select } from '@/lib/haptics';
import { sportIcon } from '@/lib/sport-icons';
import { planSession } from '@/lib/training';
import { fmtDate, nf } from '@/lib/util';

type Sub = 'plan' | 'sport' | 'lib' | 'fav';
const SPORT_CATS = [...new Set(SPORTS.map(x => x.cat))];

export default function Training() {
  const u = useUser(); const { update } = useStore();
  const [sub, setSub] = useState<Sub>('plan');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const plans = PLANS[u.profile.goal];
  const next = (u.planIdx || 0) % plans.length;

  const list = useMemo(() => {
    const nq = norm(q);
    return EXERCISES.filter(e => (sub !== 'fav' || u.favorites.includes(e.id)) && (!cat || e.cat === cat) && (!nq || norm(e.name + ' ' + e.muscles).includes(nq)));
  }, [q, cat, sub, u.favorites]);
  const toggleFav = (id: string) => { select(); update(x => { x.favorites = x.favorites.includes(id) ? x.favorites.filter(f => f !== id) : [...x.favorites, id]; }); };
  const startPlan = (i: number) => {
    if (!u.activeSession) update(x => { x.activeSession = planSession(x, i); });
    router.push('/session');
  };
  const recent = useMemo(() => {
    const out: string[] = [];
    for (let i = u.workouts.length - 1; i >= 0 && out.length < 4; i--) { const w = u.workouts[i]; if (w.sport && SP[w.sport] && !out.includes(w.sport)) out.push(w.sport); }
    return out;
  }, [u.workouts]);
  const lastSports = u.workouts.filter(w => w.sport).slice(-5).reverse();

  const sportRow = (id: string, prefix = 'sp-') => {
    const sp = SP[id];
    return (
      <Pressable key={id} onPress={() => router.push({ pathname: '/sport/[id]', params: { id } })} testID={prefix + id}
        style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, height: 52, flexDirection: 'row', alignItems: 'center', gap: S[2] + 2, paddingHorizontal: S[3], borderRadius: R.card, backgroundColor: pressed ? C.raised : C.card })}>
        <Icon icon={sportIcon(id, sp.cat)} sf={SPORT_SF[id]} color={C.accentInk} />
        <T v="small" numberOfLines={1} style={{ flex: 1 }}>{sp.name}</T>
      </Pressable>
    );
  };

  return (
    <Screen title="Training">
      <ActiveBanner />
      <Seg items={[['plan', 'Pläne'], ['sport', 'Sport'], ['lib', 'Übungen'], ['fav', 'Favoriten']]} value={sub} onChange={setSub} />

      {sub === 'plan' && (<>
        <T v="small" tone="secondary">Für dein Ziel {GOALS[u.profile.goal].label.replace('-spezifisch', '')}</T>
        {plans.map((p, i) => (
          <Spot key={p.name} id={i === 0 ? 'plan' : 'plan' + i}><Card>
            <Row between>
              <View style={{ flex: 1 }}>
                <T v="h3">{p.name}</T>
                {i === next && <T v="meta" color={C.accentInk}>Als Nächstes</T>}
              </View>
              <Btn title="Starten" icon={Play} small kind={i === next ? 'primary' : 'secondary'} onPress={() => startPlan(i)} testID={`startPlan-${i}`} />
            </Row>
            <View>
              {p.items.map(([id, sets, reps]) => {
                const e = EX[id];
                return (
                  <Pressable key={id} onPress={() => router.push({ pathname: '/exercise/[id]', params: { id } })}>
                    <Row between style={{ minHeight: 32 }}>
                      <T v="small" tone="secondary" style={{ flex: 1 }}>{e?.name || id}</T>
                      <Num size={13} color={C.text2}>{sets} × {e?.type === 'time' ? `${reps} s` : reps}</Num>
                    </Row>
                  </Pressable>
                );
              })}
            </View>
          </Card></Spot>
        ))}
      </>)}

      {sub === 'sport' && (<>
        <T v="small" tone="secondary">Live mit Stoppuhr starten oder nachtragen. Zählt wie ein Training für Punkte und Challenges.</T>
        {recent.length > 0 && (<View style={{ gap: S[2] }}><T v="meta" tone="muted">Zuletzt</T><Row wrap>{recent.map(id => sportRow(id, 'sp-recent-'))}</Row></View>)}
        {SPORT_CATS.map(c => (
          <View key={c} style={{ gap: S[2] }}>
            <T v="meta" tone="muted">{c}</T>
            <Row wrap>{SPORTS.filter(x => x.cat === c).map(x => sportRow(x.id))}</Row>
          </View>
        ))}
        {lastSports.length > 0 && (
          <Card style={{ gap: 0 }}>
            <T v="h3" style={{ marginBottom: S[2] }}>Letzte Aktivitäten</T>
            {lastSports.map((w, i) => (
              <View key={w.id}>
                {i > 0 && <Divider />}
                <Row gap={S[3]} style={{ minHeight: 52 }}>
                  <Icon icon={sportIcon(w.sport!, SP[w.sport!]?.cat)} sf={SPORT_SF[w.sport!]} />
                  <View style={{ flex: 1 }}>
                    <T v="small" numberOfLines={1}>{w.title}</T>
                    <T v="meta" tone="muted">{fmtDate(w.date)} · {w.min} Min{w.distKm ? ` · ${nf(w.distKm, 1)} km` : ''}</T>
                  </View>
                  <Num size={13} color={C.text2}>{nf(w.kcal)} kcal</Num>
                </Row>
              </View>
            ))}
          </Card>
        )}
      </>)}

      {(sub === 'lib' || sub === 'fav') && (<>
        <View style={{ height: 40, borderRadius: 10, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[3], gap: S[2] }}>
          <Icon icon={Search} />
          <TextInput value={q} onChangeText={setQ} placeholder="Suchen" placeholderTextColor={C.muted} style={{ flex: 1, color: C.text, fontSize: 17, height: '100%' }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S[2] }}>
          {[null, ...CATS].map(c => (
            <Pressable key={c || 'alle'} onPress={() => setCat(c)}
              hitSlop={6} style={{ paddingHorizontal: S[4], height: 34, justifyContent: 'center', borderRadius: 17, backgroundColor: cat === c ? C.accent : C.raised }}>
              <T v="small" strong={cat === c} color={cat === c ? C.onAccent : C.text}>{c || 'Alle'}</T>
            </Pressable>
          ))}
        </ScrollView>
        <T v="meta" tone="muted">{list.length} Übungen{sub === 'fav' && !list.length ? ' – markiere Übungen mit dem Stern, um sie hier zu sammeln' : ''}</T>
        {list.length > 0 && (
          <Card style={{ paddingVertical: S[1], gap: 0 }}>
            <FlatList data={list} scrollEnabled={false} keyExtractor={e => e.id} initialNumToRender={14}
              ItemSeparatorComponent={Divider}
              renderItem={({ item: e }) => (
                <Pressable onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: e.id } })} testID={'ex-' + e.id}>
                  <Row gap={S[3]} style={{ minHeight: 64 }}>
                    <ExerciseThumb anim={e.anim} width={56} />
                    <View style={{ flex: 1 }}>
                      <T>{e.name}</T>
                      <T v="small" tone="muted" numberOfLines={1}>{e.cat} · {e.muscles}</T>
                    </View>
                    <Pressable onPress={() => toggleFav(e.id)} hitSlop={12} accessibilityLabel={u.favorites.includes(e.id) ? 'Favorit entfernen' : 'Als Favorit markieren'}>
                      <Icon icon={Star} filled={u.favorites.includes(e.id)} color={u.favorites.includes(e.id) ? C.accentInk : C.muted} />
                    </Pressable>
                    <Icon icon={ChevronRight} size={16} />
                  </Row>
                </Pressable>
              )} />
          </Card>
        )}
      </>)}
    </Screen>
  );
}
