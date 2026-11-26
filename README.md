# FitDuell – Fitness als Wettkampf unter Freunden

Trainiere, sammle Punkte und tritt jede Woche gegen deine Freunde an: Wochen-Challenges, 30-Tage-Duelle, Rangliste, 88 animierte Übungen, 34 Sportarten, Schritte aus Apple Health / Health Connect, Ernährung per Text, Sprache, Barcode oder Etikett – und FitCoins als Belohnung.

| Ordner | Inhalt |
|---|---|
| `/` | Native App (Expo / React Native) für iPhone, Android und Web |
| `supabase/` | Datenbank: Schema, Schritte, Konto löschen, FitCoins |
| `legacy-pwa/` | Erste Web-App (Vanilla JS) – nur noch als Referenz |
| `docs/` | QR-Code zum Laden der App, Screenshots |

**Web-Version:** https://nicknellessen00-source.github.io/Fitness-Duell/ · **Download-Seite (QR-Code):** https://nicknellessen00-source.github.io/Fitness-Duell/download

Die Web-Version wird bei jedem Push auf `main` automatisch gebaut und auf GitHub Pages veröffentlicht (`.github/workflows/pages.yml`). Die Android-App für den Download-Button gehört als `FitDuell.apk` in ein GitHub-Release.

---

# Native App (iPhone & Android)

Gebaut mit Expo SDK 58 / React Native. Eine Codebasis für iOS, Android und die Web-Vorschau.

## Von hier zur App im Store

Einmalig nötig:
1. **Expo-Konto** (kostenlos): https://expo.dev/signup
2. **Apple Developer Program** (99 $/Jahr) für iPhone/TestFlight: https://developer.apple.com/programs/
3. **Google Play Console** (einmalig 25 $) für Android: https://play.google.com/console
4. Im Supabase SQL Editor `supabase/delete_account.sql` (erledigt) und `supabase/coins.sql` (FitCoins online: Kontostand, Anfeuern, Duell-Einsätze) ausführen.

Auf einem Rechner mit Node.js (kein Mac nötig, gebaut wird in der Expo-Cloud):

```sh
npm install
npx eas-cli login              # mit dem Expo-Konto
npx eas-cli init               # verknüpft das Projekt mit Expo (trägt die projectId in app.json ein)

# Testversion für dein eigenes Handy
npx eas-cli build -p android --profile preview   # APK zum direkten Installieren
npx eas-cli build -p ios --profile preview       # iPhone registrieren, Link öffnen, installieren

# Store-Versionen
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --latest               # lädt zu App Store Connect hoch → TestFlight
npx eas-cli build -p android --profile production
npx eas-cli submit -p android --latest           # Google Play (interner Test)
```

Beim ersten iOS-Build fragt EAS nach dem Apple-Login und erstellt Zertifikate und Profile automatisch.
Bundle-ID / Paketname: `app.fitduell` (in `app.json` änderbar, solange noch nichts veröffentlicht ist).

## Entwickeln

```sh
npx expo start            # Vorschau (Web: Taste w)
npx tsc --noEmit          # Typprüfung
npx expo lint             # Lint
npx expo export -p web    # Web-Vorschau bauen (Ordner dist/ → Netlify)
```

`ios/` und `android/` werden bei jedem Build aus `app.json` erzeugt (Continuous Native Generation) – nicht von Hand anlegen.

## Aufbau

- `src/app/` – Bildschirme (expo-router): Tabs Start, Training, Tracker, Ernährung, Rangliste; Live-Training, Sport, Scanner, Duelle, Profil, Datenschutz
- `src/lib/` – Logik: Punkte/Challenges/Rangliste (`logic.ts`), Training & Sport (`training.ts`), Mahlzeit-Erkennung ohne KI (`meal.js`, `foods.js`), Übungsfiguren (`anim.js`, `anim-native.ts`), Supabase (`cloud.ts`), Schritte (`health.*.ts`), Texterkennung (`ocr*.ts`), Erinnerungen (`notify*.ts`), FitCoins (`coins.ts`)
- `src/constants/theme.ts` – Farben, Raster, Schrift (Apple-Systemfarben, Lime als Akzent)
- `supabase/` – Datenbank-Schema und Funktionen
- `STORE.md` – Texte und Angaben für App Store und Google Play
