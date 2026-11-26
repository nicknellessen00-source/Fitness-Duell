import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { AmountForm } from '@/components/amount-form';
import { close, ModalHeader } from '@/components/modal-header';
import { Btn, Card, Field, Row, Screen, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { tap } from '@/lib/haptics';
import { lookupBarcode, type Product } from '@/lib/off';

export default function Scan() {
  const [perm, requestPerm] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Product | null>(null);
  const [msg, setMsg] = useState('');

  const look = async (c: string) => {
    if (busy || !/^\d{6,14}$/.test(c)) return;
    setBusy(true); setMsg(''); setCode(c); tap();
    try {
      const p = await lookupBarcode(c);
      if (p) setFound(p); else setMsg(`Produkt ${c} ist nicht in der Datenbank. Fotografiere stattdessen die Nährwerttabelle.`);
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  if (found) {
    return (
      <Screen bottomInset>
        <ModalHeader kicker={`Barcode ${found.barcode}`} title="Produkt gefunden" />
        <AmountForm food={found} src="scan" onDone={close} />
        <Btn title="Anderes Produkt scannen" kind="quiet" onPress={() => { setFound(null); setCode(''); }} />
      </Screen>
    );
  }

  return (
    <Screen bottomInset>
      <ModalHeader kicker="Barcode" title="Produkt scannen" />
      {perm?.granted ? (
        <View style={{ height: 300, borderRadius: R.card, overflow: 'hidden', backgroundColor: C.card }}>
          <CameraView style={{ flex: 1 }} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={busy ? undefined : r => look(r.data)} />
          <View pointerEvents="none" style={{ position: 'absolute', left: '12%', right: '12%', top: '38%', height: '24%', borderRadius: R.control, borderWidth: 2, borderColor: C.accent }} />
        </View>
      ) : (
        <Card>
          <T tone="secondary">Für den Scanner braucht FitDuell Zugriff auf die Kamera. Bilder werden nicht gespeichert.</T>
          <Btn title="Kamera erlauben" kind="primary" onPress={requestPerm} testID="camAllow" />
        </Card>
      )}
      <T v="small" tone="muted" center>{busy ? 'Suche Produkt …' : 'Halte den Barcode in den Rahmen'}</T>
      <Card>
        <Row style={{ alignItems: 'flex-end' }}>
          <Field label="Oder Nummer eintippen" value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="4001234567890" testID="eanInput" />
          <Btn title="Suchen" onPress={() => look(code.trim())} disabled={busy} testID="eanGo" />
        </Row>
        {!!msg && (
          <View style={{ gap: S[2] }}>
            <T v="small" color={C.bad}>{msg}</T>
            <Btn title="Nährwerttabelle fotografieren" onPress={() => router.replace('/label')} />
          </View>
        )}
      </Card>
      {Platform.OS === 'web' && <T v="meta" tone="muted" center>Im Browser funktioniert die Eingabe der Nummer zuverlässiger als der Scanner</T>}
    </Screen>
  );
}
