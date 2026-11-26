import { router } from 'expo-router';
import { Barcode, ScanText, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Spot } from '@/components/spot';
import { VoiceButton } from '@/components/voice-button';
import { Btn, Card, Divider, Icon, Num, Row, Screen, Seg, T, Track } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { calc, MEALS } from '@/lib/logic';
import { parseMeal } from '@/lib/meal';
import { nf, today, uid } from '@/lib/util';

type MealKey = keyof typeof MEALS;
const guessMeal = (): MealKey => { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'snack' : 'dinner'; };

export default function Food() {
  const u = useUser(); const { update } = useStore();
  const t = today(); const c = calc(u.profile);
  const list = u.food[t] || [];
  const tot = list.reduce((s, x) => ({ kcal: s.kcal + x.kcal, p: s.p + x.p, c: s.c + x.c, f: s.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
  const [text, setText] = useState('');
  const [meal, setMeal] = useState<MealKey>(guessMeal);
  const [vmsg, setVmsg] = useState('');
  const parsed = useMemo(() => parseMeal(text).filter(i => i.food && i.grams), [text]);
  const left = c.kcal - tot.kcal;

  const add = () => {
    if (!parsed.length) return;
    update(x => {
      const day = (x.food[t] = x.food[t] || []);
      for (const it of parsed) {
        const f = it.food!, k = it.grams! / 100;
        day.push({ id: uid(), name: f.name, meal, grams: it.grams!, kcal: Math.round(f.kcal * k), p: Math.round(f.p * k * 10) / 10, c: Math.round(f.c * k * 10) / 10, f: Math.round(f.f * k * 10) / 10 });
      }
    });
    setText('');
  };
  const remove = (id: string) => update(x => { x.food[t] = (x.food[t] || []).filter(f => f.id !== id); });

  return (
    <Screen title="Ernährung">
      <Card>
        <Row style={{ alignItems: 'flex-end' }} gap={S[2]}>
          <Num size={36} color={left < 0 ? C.bad : C.text}>{nf(Math.abs(left))}</Num>
          <T v="small" tone="muted" style={{ marginBottom: 6 }}>kcal {left < 0 ? 'über dem Ziel' : 'übrig'}</T>
        </Row>
        <Track value={tot.kcal} max={c.kcal} color={left < 0 ? C.bad : C.accent} />
        <T v="meta" tone="muted">{nf(tot.kcal)} von {nf(c.kcal)} kcal gegessen</T>
        <Divider />
        <Row gap={S[4]}>
          {([['Eiweiß', tot.p, c.protein], ['Kohlenhydrate', tot.c, c.carbs], ['Fett', tot.f, c.fat]] as const).map(([l, v, m]) => (
            <View key={l} style={{ flex: 1, gap: S[1] }}>
              <T v="meta" tone="secondary">{l}</T>
              <Num size={14}>{nf(v)}<Num size={12} color={C.muted}> / {m} g</Num></Num>
              <Track value={v} max={m} color={C.text2} height={4} />
            </View>
          ))}
        </Row>
      </Card>

      <Spot id="foodAdd"><Row>
        {([[Barcode, 'Barcode', '/scan'], [ScanText, 'Etikett', '/label'], [Search, 'Suchen', '/food-search']] as const).map(([I, l, href]) => (
          <Pressable key={l} onPress={() => router.push(href)} testID={'f-' + href.slice(1)}
            style={({ pressed }) => ({ flex: 1, height: 72, borderRadius: 12, backgroundColor: pressed ? C.raised : C.card, alignItems: 'center', justifyContent: 'center', gap: S[1] + 2 })}>
            <Icon icon={I} color={C.accentInk} size={22} />
            <T v="small">{l}</T>
          </Pressable>
        ))}
      </Row></Spot>

      <Card>
        <T v="h3">Mahlzeit eintragen</T>
        <Seg items={[['breakfast', 'Früh'], ['lunch', 'Mittag'], ['dinner', 'Abend'], ['snack', 'Snack']]} value={meal} onChange={setMeal} />
        <Row style={{ alignItems: 'flex-start' }}>
          <TextInput value={text} onChangeText={setText} multiline placeholder="2 Eier, 1 Vollkornbrötchen mit Butter" placeholderTextColor={C.muted}
            style={{ flex: 1, minHeight: 88, borderRadius: 10, backgroundColor: C.raised, color: C.text, padding: S[3], paddingTop: S[3], fontSize: 17, textAlignVertical: 'top' }} testID="mtext" />
          <VoiceButton onText={t => { setText(t); setVmsg(''); }} onError={setVmsg} />
        </Row>
        {!!vmsg && <T v="small" color={C.bad}>{vmsg}</T>}
        {parsed.length > 0 && (
          <View>
            {parsed.map((it, i) => (
              <Row key={i} between style={{ minHeight: 32 }}>
                <T v="small" tone="secondary" style={{ flex: 1 }}>{it.food!.name}</T>
                <Num size={13} color={C.muted}>{it.grams} g</Num>
                <Num size={13} style={{ width: 72, textAlign: 'right' }}>{nf(it.food!.kcal * it.grams! / 100)} kcal</Num>
              </Row>
            ))}
          </View>
        )}
        {!!text.trim() && !parsed.length && <T v="small" tone="muted">Noch nichts erkannt – probier die Suche</T>}
        <Btn title={parsed.length ? `${parsed.length} hinzufügen` : 'Hinzufügen'} kind="primary" disabled={!parsed.length} onPress={add} testID="padd" />
      </Card>

      {(Object.keys(MEALS) as MealKey[]).map(m => {
        const items = list.filter(x => (x.meal || 'snack') === m); if (!items.length) return null;
        return (
          <Card key={m} style={{ gap: S[2] }}>
            <Row between><T v="h3">{MEALS[m]}</T><Num size={13} color={C.text2}>{nf(items.reduce((s, x) => s + x.kcal, 0))} kcal</Num></Row>
            {items.map(x => (
              <Row key={x.id} gap={S[3]} style={{ minHeight: 32 }}>
                <T v="small" style={{ flex: 1 }}>{x.name}</T>
                <Num size={13} color={C.muted}>{x.grams} g</Num>
                <Num size={13} style={{ width: 48, textAlign: 'right' }}>{nf(x.kcal)}</Num>
                <Pressable onPress={() => remove(x.id)} hitSlop={10} accessibilityLabel={`${x.name} entfernen`}><Icon icon={X} size={16} /></Pressable>
              </Row>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
