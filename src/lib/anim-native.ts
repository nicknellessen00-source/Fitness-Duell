/* Übungsfiguren für react-native-svg: Die Web-Figuren färben sich über CSS-Klassen.
 * Hier werden die Klassen in SVG-Attribute umgesetzt, damit SvgXml sie auf iOS, Android und Web gleich zeichnet. */
import { frameAt, render } from './anim';

const W = 240, H = 200; // muss zu anim.js passen

type Paint = Record<string, string>;
const PAINT: Record<string, Paint> = {
  'fx-bg': { fill: '#EEF0F3' },
  'fx-spot': { fill: '#4E7A00', 'fill-opacity': '0.06' },
  'fx-ground': { stroke: '#CDD1D7', 'stroke-linecap': 'round' },
  'fx-shadow': { fill: '#000000', 'fill-opacity': '0.16' },
  'fx-skin': { fill: '#E8B48A' },
  'fx-skin2': { fill: '#D49B70' },
  'fx-hair': { fill: '#3B2A22' },
  'fx-eye': { fill: '#17191C' },
  'fx-shirt': { fill: '#D7FF3A' },
  'fx-shorts': { fill: '#2F3B52' },
  'fx-belt': { fill: '#1E2636' },
  'fx-shoe': { fill: '#F3F5F8' },
  'fx-prop': { fill: '#8A94A4', stroke: '#07090C', 'stroke-width': '1.5' },
  'fx-prop-l': { stroke: '#8A94A4', 'stroke-linecap': 'round' },
  'fx-plate': { fill: '#2B313B', stroke: '#9AA4B4', 'stroke-width': '2.5' },
  'fx-ball': { fill: '#FF8A3D', stroke: '#07090C', 'stroke-width': '1.5' },
  'fx-club': { stroke: '#D5DBE4', 'stroke-linecap': 'round' },
  'fx-wheel': { fill: 'none', stroke: '#8A94A4', 'stroke-width': '3' },
};

/** Farbe abdunkeln (für die hintere Körperseite, im Web per CSS-Filter brightness .62) */
function dim(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const avg = (ch[0] + ch[1] + ch[2]) / 3;
  return '#' + ch.map(c => Math.round((c * 0.8 + avg * 0.2) * 0.62).toString(16).padStart(2, '0')).join('');
}

const attrs = (p: Paint, tag: string, far: boolean) =>
  Object.entries(p).filter(([k]) => !tag.includes(` ${k}=`)).map(([k, v]) => ` ${k}="${far && (k === 'fill' || k === 'stroke') ? dim(v) : v}"`).join('');

/** Klassen eines Abschnitts in Attribute umwandeln */
function paint(s: string, far = false, shirt?: string) {
  return s.replace(/<(\w+)([^>]*?)\sclass="([^"]*)"([^>]*?)(\/?)>/g, (_m, tag: string, a: string, cls: string, b: string, close: string) => {
    const rest = a + b; const c = cls.trim(); const p = c === 'fx-shirt' && shirt ? { fill: shirt } : PAINT[c];
    return `<${tag}${rest}${p ? attrs(p, rest, far) : ''}${close}>`;
  });
}
/** Kontur: alle Formen dunkel und mit dicker Linie (im Web: .fx-outline * {...}) */
function outline(s: string) {
  return s.replace(/<(path|line|circle|ellipse|rect)([^>]*?)(\/?)>/g, (_m, tag: string, a: string, close: string) => {
    const clean = a.replace(/\sclass="[^"]*"/g, '').replace(/\sstroke-width="[^"]*"/g, '');
    const hasFill = /\sfill="none"/.test(clean);
    return `<${tag}${clean}${hasFill ? '' : ' fill="#07090C"'} stroke="#07090C" stroke-width="3.4" stroke-linejoin="round"${close}>`;
  }).replace(/<g class="[^"]*">/g, '<g>');
}
/** Passenden schließenden </g> zu einem öffnenden <g ...> bei Index i finden */
function groupEnd(s: string, i: number) {
  const re = /<g[\s>]|<\/g>/g; re.lastIndex = i + 2; let depth = 1; let m;
  while ((m = re.exec(s))) { depth += m[0] === '</g>' ? -1 : 1; if (!depth) return m.index; }
  return s.length;
}

export function toNativeSvg(inner: string, shirt?: string) {
  let out = ''; let i = 0;
  while (i < inner.length) {
    const o = inner.indexOf('<g class="fx-outline">', i), f = inner.indexOf('<g class="fx-far">', i);
    const next = [o, f].filter(x => x >= 0).sort((a, b) => a - b)[0];
    if (next === undefined) { out += paint(inner.slice(i), false, shirt); break; }
    out += paint(inner.slice(i, next), false, shirt);
    const end = groupEnd(inner, next);
    const body = inner.slice(inner.indexOf('>', next) + 1, end);
    out += next === o ? `<g>${outline(body)}</g>` : `<g>${paint(body, true, shirt)}</g>`;
    i = end + 4;
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${out}</svg>`;
}

export const frameXml = (anim: unknown, t: number, shirt?: string) => toNativeSvg(render(frameAt(anim, t), anim), shirt);

const stillCache = new Map<string, string>();
const animIds = new WeakMap<object, number>(); let animSeq = 0;
export function stillXml(anim: { frames: unknown[]; dur?: number; stillAt?: number }, shirt?: string) {
  if (!animIds.has(anim)) animIds.set(anim, ++animSeq);
  const ck = animIds.get(anim) + '|' + (shirt || '');
  let x = stillCache.get(ck);
  if (!x) {
    const n = anim.frames.length;
    const ph = anim.stillAt ?? (n > 1 ? 1 / n : 0);
    x = frameXml(anim, (anim.dur || 2) * ph, shirt);
    stillCache.set(ck, x);
  }
  return x;
}
export const ANIM_RATIO = W / H;
