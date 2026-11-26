import { ChevronRight, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';

import { AmountForm, type Per100 } from '@/components/amount-form';
import { close, ModalHeader } from '@/components/modal-header';
import { Card, Divider, Icon, Num, Row, Screen, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { norm } from '@/lib/foods';
import { findFoods } from '@/lib/meal';
import { searchProducts, type Product } from '@/lib/off';
import { nf } from '@/lib/util';

export default function FoodSearch() {
  const [q, setQ] = useState('');
  const [results, setOnline] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Per100 | null>(null);
  const online = q.trim().length >= 3 ? results : [];
  const local = useMemo(() => (q.trim().length >= 2 ? findFoods(norm(q)).map(x => x.food) : []), [q]);

  useEffect(() => {
    const term = q.trim(); if (term.length < 3) return;
    let alive = true;
    const id = setTimeout(() => {
      setBusy(true);
      searchProducts(term).then(r => { if (alive) setOnline(r); }).catch(() => { if (alive) setOnline([]); }).finally(() => alive && setBusy(false));
    }, 500);
    return () => { alive = false; clearTimeout(id); };
  }, [q]);

  if (pick) return <Screen bottomInset><ModalHeader kicker="Lebensmittel" title="Menge wählen" /><AmountForm food={pick} src="search" onDone={close} /></Screen>;

  const row = (key: string, name: string, sub: string, kcal: number, p: Per100) => (
    <Pressable key={key} onPress={() => setPick(p)} testID={'res-' + key}>
      <Row gap={S[3]} style={{ minHeight: 52 }}>
        <View style={{ flex: 1 }}><T v="small" numberOfLines={1}>{name}</T>{!!sub && <T v="meta" tone="muted" numberOfLines={1}>{sub}</T>}</View>
        <Num size={13} color={C.text2}>{nf(kcal)} kcal</Num>
        <Icon icon={ChevronRight} size={16} />
      </Row>
    </Pressable>
  );

  return (
    <Screen bottomInset>
      <ModalHeader kicker="Ernährung" title="Lebensmittel suchen" />
      <View style={{ height: 40, borderRadius: 10, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: S[3], gap: S[2] }}>
        <Icon icon={Search} />
        <TextInput value={q} onChangeText={setQ} placeholder="Skyr, Haferflocken, Marke …" placeholderTextColor={C.muted} autoFocus style={{ flex: 1, color: C.text, fontSize: 17, height: '100%' }} testID="sq" />
      </View>
      {local.length > 0 && (
        <Card style={{ gap: 0 }}>
          <T v="meta" tone="muted" style={{ marginBottom: S[1] }}>Grundnahrungsmittel · pro 100 g</T>
          {local.map((f, i) => <View key={f.id}>{i > 0 && <Divider />}{row(f.id, f.name, '', f.kcal, { name: f.name, kcal: f.kcal, p: f.p, c: f.c, f: f.f, serving: f.portion })}</View>)}
        </Card>
      )}
      {((busy && q.trim().length >= 3) || online.length > 0) && (
        <Card style={{ gap: 0 }}>
          <Row between style={{ marginBottom: S[1] }}><T v="meta" tone="muted">Markenprodukte · Open Food Facts</T>{busy && <ActivityIndicator size="small" color={C.muted} />}</Row>
          {online.map((p, i) => <View key={p.id + i}>{i > 0 && <Divider />}{row(p.id + i, p.name, p.brand, p.kcal, p)}</View>)}
        </Card>
      )}
      {q.trim().length >= 3 && !busy && !local.length && !online.length && <T v="small" tone="muted" center>Nichts gefunden</T>}
    </Screen>
  );
}
