export interface HealthSource {
  /** Name, wie ihn Nutzer kennen */
  label: string;
  /** Gibt es auf diesem Gerät eine Schrittquelle? */
  available(): Promise<boolean>;
  /** Zugriff erfragen; true wenn erlaubt */
  connect(): Promise<boolean>;
  /** Schritte je Tag (Schlüssel JJJJ-MM-TT) für die letzten `days` Tage inkl. heute */
  readDays(days: number): Promise<Record<string, number>>;
}

/** Schrittsensor des Handys – zählt live, solange die App geöffnet ist */
export interface StepSensor {
  available(): Promise<boolean>;
  connect(): Promise<boolean>;
  /** Liefert die Schritte seit Start der Beobachtung; gibt eine Abmelde-Funktion zurück */
  watch(cb: (stepsSinceStart: number) => void): () => void;
}
