import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImageIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AmountForm, type Per100 } from '@/components/amount-form';
import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Field, Row, Screen, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { parseLabel } from '@/lib/meal';
import { readText } from '@/lib/ocr';

const n = (s: string) => { const v = parseFloat(s.replace(',', '.')); return Number.isFinite(v) ? v : NaN; };

export default function Label() {
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [f, setF] = useState({ name: '', kcal: '', p: '', c: '', fat: '', serving: '' });
  const [ready, setReady] = useState<Per100 | null>(null);
  const set = (k: keyof typeof f, v: string) => setF(x => ({ ...x, [k]: v }));

  const pick = async (camera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
    if (camera) { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) { setNote('Kamera-Zugriff wurde nicht erlaubt'); return; } }
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets[0]) return;
    const uri = r.assets[0].uri; setImg(uri); setBusy(true); setNote('');
    try {
      const v = parseLabel(await readText(uri));
      const s = (x?: number) => (x == null ? '' : String(x).replace('.', ','));
      setF(x => ({ ...x, kcal: s(v.kcal), p: s(v.p), c: s(v.c), fat: s(v.f), serving: s(v.serving) }));
      setNote(v.found >= 3 ? `${v.found} von 4 Werten erkannt – bitte kurz mit dem Foto vergleichen${v.warn ? '. ' + v.warn : ''}` : 'Nicht alle Werte erkannt – bitte ergänzen');
    } catch {
      setNote('Texterkennung nicht möglich – bitte Werte abtippen');
    }
    setBusy(false);
  };
  const next = () => {
    const kcal = n(f.kcal); if (!(kcal >= 0)) { setNote('Bitte Kalorien pro 100 g angeben'); return; }
    setReady({ name: f.name.trim() || 'Produkt vom Etikett', kcal, p: n(f.p) || 0, c: n(f.c) || 0, f: n(f.fat) || 0, serving: n(f.serving) || null });
  };

  if (ready) return <Screen bottomInset><ModalHeader kicker="Nährwerttabelle" title="Menge wählen" /><AmountForm food={ready} src="label" onDone={close} /></Screen>;

  return (
    <Screen bottomInset>
      <ModalHeader kicker="Nährwerttabelle" title="Etikett fotografieren" />
      <T v="small" tone="secondary">Die Werte pro 100 g werden direkt auf deinem Handy ausgelesen, nichts wird hochgeladen.</T>
      <Row>
        <Btn title="Kamera" icon={Camera} kind="primary" grow onPress={() => pick(true)} testID="lCam" />
        <Btn title="Fotos" icon={ImageIcon} grow onPress={() => pick(false)} testID="lPick" />
      </Row>
      {img && <Image source={{ uri: img }} style={{ width: '100%', height: 200, borderRadius: R.card, backgroundColor: C.card }} contentFit="contain" />}
      {busy && <Row style={{ justifyContent: 'center' }}><ActivityIndicator color={C.accentInk} /><T v="small" tone="muted">Text wird erkannt …</T></Row>}
      {!!note && !busy && <T v="small" tone="secondary">{note}</T>}
      <Card>
        <Field label="Produktname" value={f.name} onChangeText={v => set('name', v)} placeholder="Müsli Schoko" />
        <T v="meta" tone="muted">Pro 100 g bzw. 100 ml</T>
        <Row><Field label="Kalorien (kcal)" value={f.kcal} onChangeText={v => set('kcal', v)} keyboardType="decimal-pad" testID="lk" /><Field label="Eiweiß (g)" value={f.p} onChangeText={v => set('p', v)} keyboardType="decimal-pad" testID="lp" /></Row>
        <Row><Field label="Kohlenhydrate (g)" value={f.c} onChangeText={v => set('c', v)} keyboardType="decimal-pad" testID="lc" /><Field label="Fett (g)" value={f.fat} onChangeText={v => set('fat', v)} keyboardType="decimal-pad" testID="lf" /></Row>
        <Field label="Portion in g (optional)" value={f.serving} onChangeText={v => set('serving', v)} keyboardType="decimal-pad" />
        <View style={{ height: S[1] }} />
        <Btn title="Weiter" kind="primary" onPress={next} testID="lNext" />
      </Card>
    </Screen>
  );
}
