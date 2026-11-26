/* FitDuell – Gestaltung
 * Richtung: ehrgeizig, direkt, ein bisschen frech. Welt: Wettkampf und Anzeigetafel.
 * Aufbau nach Apples Human Interface Guidelines: Systemfarben, Textgrößen, 44-pt-Tippflächen.
 * Erkennungszeichen: Punkte und Platzierungen in Monospace-Ziffern wie auf einer Anzeigetafel.
 */
/* Apple-Systemfarben (Light Mode): systemGroupedBackground, weiße Karten, label-Abstufungen.
 * Lime ist Markenfarbe für Flächen mit schwarzer Schrift (Buttons, Auswahl).
 * Für Text, Linien, Icons und Fortschritt auf Weiß: accentInk (gleiche Farbfamilie, gut lesbar). */
export const C = {
  deep: '#F2F2F7',
  bg: '#F2F2F7',
  card: '#FFFFFF',
  raised: '#EEEEF3',
  fill: 'rgba(118,118,128,0.12)',
  line: 'rgba(60,60,67,0.12)',
  lineStrong: 'rgba(60,60,67,0.22)',
  text: '#000000',
  text2: '#5C5C61',
  muted: '#8A8A8F',
  accent: '#D7FF3A',
  accentInk: '#4E7A00',
  onAccent: '#000000',
  good: '#1E8E3E',
  bad: '#D70015',
  bar: '#D1D1D6',
  blue: '#007AFF',
} as const;

/** 4er-Raster */
export const S = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const R = { control: 12, card: 12, small: 8 } as const;
export const MaxContentWidth = 640;
export const MONO = 'GeistMono_500Medium';
export const ICON = { size: 20, stroke: 1.75 } as const;
/** Mindestgröße für Tippflächen nach Apple-Vorgabe */
export const HIT = 44;
