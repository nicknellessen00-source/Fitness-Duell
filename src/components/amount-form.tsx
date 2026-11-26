import { useState } from 'react';
import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { useStore } from '@/context/app-store';
import { success } from '@/lib/haptics';
import { MEALS } from '@/lib/logic';
import type { FoodEntry } from '@/lib/types';
import { nf, today, uid } from '@/lib/util';

import { Btn, Card, Divider, Field, Num, Row, Seg, T } from './ui';

export type MealKey = keyof typeof MEALS;
export const guessMeal = (): MealKey => { const h = new Date().getHours(); return h < 10 ? 'breakfast' : h < 14 ? 'lunch' : h < 17 ? 'snack' : 'dinner'; };
export const MEAL_SEG: [MealKey, string][] = [['breakfast', 'Früh'], ['lunch', 'Mittag'], ['dinner', 'Abend'], ['snack', 'Snack']];

export interface Per100 { name: string; brand?: string; kcal: number; p: number; c: number; f: number; serving?: number | null; barcode?: string }

/** Menge und Mahlzeit wählen, Werte pro 100 g hochrechnen und eintragen */
export function AmountForm({ food, src, onDone }: { food: Per100; src: FoodEntry['src']; onDone: () => void }) {
  const { update } = useStore();
  const [g, setG] = useState(String(food.serving || 100));
  const [meal, setMeal] = useState<MealKey>(guessMeal);
  const grams = parseFloat(g.replace(',', '.')) || 0, k = grams / 100;
  const add = () => {
    if (grams <= 0) return;
    const t = today();
    update(x => {
      (x.food[t] = x.food[t] || []).push({ id: uid(), name: food.name, meal, grams: Math.round(grams), kcal: Math.round(food.kcal * k), p: Math.round(food.p * k * 10) / 10, c: Math.round(food.c * k * 10) / 10, f: Math.round(food.f * k * 10) / 10, src, barcode: food.barcode });
    });
    success(); onDone();
  };
  return (
    <Card testID="amountForm">
      <View style={{ gap: 2 }}>
        <T v="h3">{food.name}</T>
        <T v="small" tone="muted">{food.brand ? food.brand + ' · ' : ''}{nf(food.kcal)} kcal pro 100 g</T>
      </View>
      <Row>
        <Field label="Menge in g" value={g} onChangeText={setG} keyboardType="decimal-pad" testID="amountG" />
        {!!food.serving && food.serving !== 100 && <Btn title={`1 Portion · ${food.serving} g`} small onPress={() => setG(String(food.serving))} style={{ alignSelf: 'flex-end', marginBottom: 4 }} />}
      </Row>
      <Seg items={MEAL_SEG} value={meal} onChange={setMeal} />
      <Divider />
      <Row>
        {[['kcal', food.kcal * k, ''], ['Eiweiß', food.p * k, ' g'], ['KH', food.c * k, ' g'], ['Fett', food.f * k, ' g']].map(([l, v, u]) => (
          <View key={l as string} style={{ flex: 1, gap: 2 }}>
            <Num size={18} color={l === 'kcal' ? C.accentInk : C.text}>{nf(v as number, l === 'kcal' ? 0 : 1)}{u}</Num>
            <T v="meta" tone="muted">{l}</T>
          </View>
        ))}
      </Row>
      <View style={{ height: S[1] }} />
      <Btn title="Hinzufügen" kind="primary" disabled={grams <= 0} onPress={add} testID="amountAdd" />
    </Card>
  );
}
