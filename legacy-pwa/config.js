/* FitDuell – Online-Konfiguration.
 * Trage hier die Daten deines Supabase-Projekts ein (Project Settings → API).
 * Der „anon public“-Schlüssel darf öffentlich sein; der Zugriff wird über die
 * Row-Level-Security-Regeln aus supabase/schema.sql geschützt.
 * Leer lassen = App läuft rein lokal (Freundes-Codes statt Online-Rangliste).
 */
window.FITDUELL_CONFIG = {
  supabaseUrl: 'https://cnfdowfzsjhumvipptzf.supabase.co',
  supabaseAnonKey: 'sb_publishable_EHDKCvA-TQnK9Va6QgE6jg_Iw6bklis',
  // iCloud-Link des geteilten Kurzbefehls „FitDuell Schritte“ (Anleitung: README → Apple Health).
  // Leer = Kunden sehen die ausführliche Anleitung zum Selbstbauen.
  healthShortcutUrl: 'https://www.icloud.com/shortcuts/c3b72f8baee94ff983172b80b40af747',
  healthShortcutName: 'FitDuell Schritte'
};
