import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { ModalHeader } from '@/components/modal-header';
import { Btn, Card, Divider, Num, Row, Screen, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import * as Cloud from '@/lib/cloud';
import { success } from '@/lib/haptics';

/* Der Kurzbefehl liest die Tagesschritte aus Apple Health (inkl. Apple Watch) und schickt sie mit dem
 * persönlichen Schlüssel an Supabase (import_steps). Die App holt sie beim Öffnen ab. */
export const SHORTCUT_URL = 'https://www.icloud.com/shortcuts/c3b72f8baee94ff983172b80b40af747';
export const SHORTCUT_NAME = 'FitDuell Schritte';

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Row gap={S[3]} style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
        <T v="small" strong color={C.onAccent}>{n}</T>
      </View>
      <View style={{ flex: 1, gap: S[2] }}>
        <T strong>{title}</T>
        {children}
      </View>
    </Row>
  );
}

export default function HealthSetup() {
  const u = useUser(); const { update, syncSteps } = useStore();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const tok = u.stepToken;

  const makeKey = async () => {
    setBusy(true); setMsg('');
    try { const t = await Cloud.createStepToken(); update(x => { x.stepToken = t; }); success(); }
    catch (e) { const m = (e as Error).message; setMsg(/could not find the function|schema cache/i.test(m) ? 'Die Datenbank-Erweiterung health_steps.sql fehlt noch in Supabase' : m); }
    setBusy(false);
  };
  const addShortcut = async () => {
    if (tok) await Clipboard.setStringAsync(tok).catch(() => {});
    setMsg('Schlüssel kopiert – in der Kurzbefehle-App bei der Frage einfügen');
    setTimeout(() => { Linking.openURL(SHORTCUT_URL).catch(() => {}); }, 500);
  };
  const check = async () => { setMsg('Prüfe …'); await syncSteps(); setMsg('Abgerufen – pro Tag zählt immer der höhere Wert'); };

  return (
    <Screen bottomInset>
      <ModalHeader kicker="iPhone" title="Schritte aus Apple Health" />
      <T v="small" tone="secondary">Ein Kurzbefehl liest jeden Abend deine Schritte aus Apple Health – auch von der Apple Watch – und schickt sie an FitDuell, selbst wenn die App geschlossen ist.</T>

      {!u.cloud ? (
        <Card>
          <T>Dafür brauchst du ein Online-Konto, damit dein iPhone die Schritte an dein Konto schicken kann.</T>
          <Btn title="Online-Konto verbinden" kind="primary" onPress={() => router.replace('/profile')} testID="hsConnect" />
        </Card>
      ) : !tok ? (
        <Card>
          <T>Zuerst erstellst du einen persönlichen Schlüssel. Er verbindet den Kurzbefehl mit deinem Konto.</T>
          <Btn title="Schlüssel erstellen" kind="primary" disabled={busy} onPress={makeKey} testID="hsKey" />
        </Card>
      ) : (
        <Card style={{ gap: S[5] }}>
          <Step n={1} title="Kurzbefehl hinzufügen">
            <T v="small" tone="secondary">Dein Schlüssel wird dabei kopiert. In der Kurzbefehle-App „Kurzbefehl hinzufügen“ tippen und bei der Frage den Schlüssel einfügen.</T>
            <Btn title="Kurzbefehl hinzufügen" kind="primary" onPress={addShortcut} testID="hsAdd" />
          </Step>
          <Step n={2} title="Einmal testen">
            <T v="small" tone="secondary">Startet den Kurzbefehl. Beim ersten Mal den Zugriff auf Health erlauben, danach zurück zu FitDuell.</T>
            <Btn title="Jetzt synchronisieren" onPress={() => Linking.openURL('shortcuts://run-shortcut?name=' + encodeURIComponent(SHORTCUT_NAME)).catch(() => {})} />
          </Step>
          <Step n={3} title="Täglich automatisch">
            <T v="small" tone="secondary">Kurzbefehle-App → Automation → + → Tageszeit → 23:00, täglich → Sofort ausführen → Aktion „Kurzbefehl ausführen“ → „{SHORTCUT_NAME}“ wählen → Fertig.</T>
          </Step>
        </Card>
      )}

      {!!tok && (
        <Card>
          <Row between>
            <T v="small" tone="secondary">Zuletzt angekommen</T>
            <Num size={13} color={C.text2}>{u.shortcutLast ? new Date(u.shortcutLast).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'noch nie'}</Num>
          </Row>
          <Divider />
          <T v="meta" tone="muted">Dein Schlüssel (nicht weitergeben)</T>
          <T v="small" selectable style={{ fontFamily: 'monospace' }} testID="hsToken">{tok}</T>
          <Row>
            <Btn title="Status prüfen" grow onPress={check} />
            <Btn title="Neuer Schlüssel" kind="quiet" grow onPress={makeKey} />
          </Row>
        </Card>
      )}
      {!!msg && <T v="small" tone="secondary" center>{msg}</T>}
    </Screen>
  );
}
