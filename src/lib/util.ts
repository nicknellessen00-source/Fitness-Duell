export const nf = (n: number | null | undefined, d = 0) =>
  Number(n || 0).toLocaleString('de-DE', { maximumFractionDigits: d, minimumFractionDigits: d });
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k: string, n: number) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
export const today = () => dateKey();
export const mondayOf = (k: string) => { const d = parseKey(k); return addDays(k, -((d.getDay() + 6) % 7)); };
export const weekDays = (mon: string) => Array.from({ length: 7 }, (_, i) => addDays(mon, i));
export function isoWeekNo(k: string) {
  const d = parseKey(k); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}
export const fmtDate = (k: string) => parseKey(k).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const initials = (name: string) => ((name || '?').replace(/\(.*?\)/g, '').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2) || '?').toUpperCase();
