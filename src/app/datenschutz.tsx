import { router } from 'expo-router';
import { View } from 'react-native';

import { Btn, Card, Screen, T } from '@/components/ui';
import { S } from '@/constants/theme';

/* Datenschutzerklärung – auch ohne Anmeldung erreichbar (Link für App Store, Google Play und Health Connect).
 */
const SECTIONS: [string, string[]][] = [
  ['Verantwortlich', ['Nick Nelleßen', 'Am Böhmerwald 16a, 22851 Norderstedt', 'E-Mail: nellessenn@gmail.com']],
  ['Kurz gesagt', [
    'FitDuell speichert deine Daten zuerst nur auf deinem Gerät. Es gibt keine Werbung, kein Tracking und keine Analyse-Dienste.',
    'Nur wenn du ein Online-Konto verbindest, wird eine Tageszusammenfassung auf unserem Server gespeichert, damit deine Freunde dich in der Rangliste sehen.',
  ]],
  ['Daten auf deinem Gerät', [
    'Profil und Körperdaten (Name, Geschlecht, Geburtsdatum, Größe, Gewicht, Ziel, Aktivität), Trainings, Sport-Aktivitäten, Mahlzeiten, Wasser, Schritte, Gewichtsverlauf und Einstellungen.',
    'Diese Daten verlassen dein Gerät nicht, solange du kein Online-Konto verbindest. Du kannst sie in deinem Profil unter „Konto löschen“ jederzeit entfernen.',
  ]],
  ['Online-Konto (freiwillig)', [
    'Für Online-Freunde und Duelle speichern wir bei unserem Dienstleister Supabase: deine E-Mail-Adresse, dein Passwort (nur verschlüsselt), Name, Profilfarbe, Ziel sowie je Tag die Summen aus Trainings, aktiven Minuten, verbrannten Kalorien, Schritten, Wasser, bewegtem Gewicht und deinen Gewichtsverlauf.',
    'Diese Tageszusammenfassung sehen nur Personen, die du per Freundes-Code hinzugefügt hast. Mahlzeiten und Körperdaten außer dem Gewicht werden nicht hochgeladen.',
    'Serverstandort: Irland, EU (Supabase, Region eu-west-1). Die Daten verlassen die EU nicht. Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).',
  ]],
  ['Schritte (Apple / Health Connect)', [
    'Auf dem iPhone liest FitDuell nach deiner Erlaubnis die Schrittzahl aus „Bewegung & Fitness“, unter Android aus Health Connect. FitDuell liest ausschließlich Schritte und schreibt keine Gesundheitsdaten.',
    'Übernommen wird nur die Tagessumme. Gesundheitsdaten werden nie für Werbung genutzt, nicht verkauft und nicht an Dritte weitergegeben – außer als Tagessumme an deine Freunde, wenn du ein Online-Konto nutzt.',
  ]],
  ['Kamera, Fotos und Spracheingabe', [
    'Barcode-Scanner und Etikett-Foto werden auf deinem Gerät ausgewertet, Bilder werden nicht gespeichert oder hochgeladen. Die erkannte Barcode-Nummer und Suchbegriffe werden an die freie Produktdatenbank Open Food Facts (Open Food Facts, Frankreich) gesendet, um Nährwerte abzurufen.',
    'Die Spracheingabe nutzt die Spracherkennung deines Betriebssystems. Je nach Gerät kann Apple bzw. Google die Aufnahme dafür verarbeiten. FitDuell speichert keine Tonaufnahmen.',
  ]],
  ['Mitteilungen', ['Erinnerungen werden lokal auf deinem Gerät geplant. Es werden dafür keine Daten an uns übertragen.']],
  ['Deine Rechte', [
    'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch sowie auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde.',
    'Löschen kannst du dein Konto direkt in der App: Profil → Konto löschen. Dabei werden auch dein Online-Konto und alle zugehörigen Daten auf dem Server gelöscht.',
  ]],
];

export default function Datenschutz() {
  return (
    <Screen title="Datenschutz" bottomInset>
      <T v="small" tone="muted">Stand: November 2026</T>
      {SECTIONS.map(([h, ps]) => (
        <Card key={h}>
          <T v="h3">{h}</T>
          <View style={{ gap: S[2] }}>{ps.map((p, i) => <T key={i} v="small" tone="secondary">{p}</T>)}</View>
        </Card>
      ))}
      <Btn title="Zurück" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
