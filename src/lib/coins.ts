/* FitCoins – Belohnungswährung (kein Geldwert, nicht kaufbar, nicht auszahlbar).
 * Verdient wird aus vorhandenen Daten; jede Buchung hat einen eindeutigen Schlüssel, damit nichts doppelt zählt. */
import { digestOf, duelState, weekStats } from './logic';
import type { CoinReason, CoinTx, Digest, Duel, Inventory, User } from './types';
import { addDays, mondayOf, today } from './util';

export const COIN = {
  training: 10, steps: 5, pr: 15, streak: 25, challenge: 50, duel: 40, start: 50,
  /** Tageslimit für Training, Schritte und Bestleistungen zusammen */
  dailyCap: 60,
} as const;

export const REASON_LABEL: Record<CoinReason, string> = {
  training: 'Training', steps: 'Schrittziel', pr: 'Bestleistung', streak: '7 Tage aktiv', challenge: 'Wochen-Challenge',
  duel: 'Duell gewonnen', buy: 'Shop', gift_in: 'Anfeuern erhalten', gift_out: 'Anfeuern', stake: 'Duell-Einsatz', pot: 'Duell-Topf', refund: 'Einsatz zurück', start: 'Startguthaben',
};

/* ---------- Shop ---------- */
export interface ShopItem { id: string; kind: 'joker' | 'shirt' | 'frame'; name: string; price: number; color?: string; desc: string }
export const SHOP: ShopItem[] = [
  { id: 'joker', kind: 'joker', name: 'Joker', price: 150, desc: 'Hebt einmal die −75 Punkte für eine verpasste Wochen-Challenge auf. Höchstens einmal pro Monat einsetzbar.' },
  { id: 'shirt-blue', kind: 'shirt', name: 'Shirt Blau', price: 80, color: '#2F7BFF', desc: 'Für deine Trainingsfigur' },
  { id: 'shirt-orange', kind: 'shirt', name: 'Shirt Orange', price: 80, color: '#FF8A3D', desc: 'Für deine Trainingsfigur' },
  { id: 'shirt-pink', kind: 'shirt', name: 'Shirt Pink', price: 80, color: '#FF5FA2', desc: 'Für deine Trainingsfigur' },
  { id: 'shirt-black', kind: 'shirt', name: 'Shirt Schwarz', price: 120, color: '#26272B', desc: 'Für deine Trainingsfigur' },
  { id: 'shirt-gold', kind: 'shirt', name: 'Shirt Gold', price: 300, color: '#E7B416', desc: 'Für deine Trainingsfigur' },
  { id: 'frame-silver', kind: 'frame', name: 'Rahmen Silber', price: 100, color: '#A7ADB7', desc: 'Um dein Profilbild in der Rangliste' },
  { id: 'frame-lime', kind: 'frame', name: 'Rahmen Lime', price: 150, color: '#9BD000', desc: 'Um dein Profilbild in der Rangliste' },
  { id: 'frame-gold', kind: 'frame', name: 'Rahmen Gold', price: 250, color: '#E7B416', desc: 'Um dein Profilbild in der Rangliste' },
];
export const SHIRT_DEFAULT = '#D7FF3A';
export const shirtColor = (u: User) => SHOP.find(s => s.id === u.inv?.shirt)?.color || SHIRT_DEFAULT;
export const frameColor = (id?: string) => SHOP.find(s => s.id === id)?.color;
export const emptyInv = (): Inventory => ({ jokers: 0, jokerWeeks: [], owned: [] });

export const balance = (u: User) => (u.coins || []).reduce((s, t) => s + t.amount, 0);

/** Alle Belohnungen, die sich aus den aktuellen Daten ergeben (ohne bereits gebuchte) */
export function pendingRewards(u: User, cloudFriends: Digest[] = [], cloudDuels: Duel[] = []): CoinTx[] {
  const have = new Set((u.coins || []).map(t => t.key));
  const out: CoinTx[] = []; const now = Date.now();
  const add = (key: string, amount: number, reason: CoinReason, note?: string) => { if (!have.has(key)) { have.add(key); out.push({ key, amount, reason, at: now, note }); } };
  const since = addDays(today(), -30); // nur jüngere Ereignisse belohnen

  add('start', COIN.start, 'start', 'Willkommen bei FitCoins');

  // Tageslimit je Tag für Training/Schritte/Bestleistungen
  const used: Record<string, number> = {};
  for (const t of u.coins || []) if (['training', 'steps', 'pr'].includes(t.reason)) { const d = t.key.split(':')[1]?.slice(0, 10) || ''; used[d] = (used[d] || 0) + t.amount; }
  const capped = (day: string, key: string, amount: number, reason: CoinReason, note?: string) => {
    if (have.has(key)) return;
    const left = COIN.dailyCap - (used[day] || 0); if (left <= 0) return;
    const a = Math.min(amount, left); used[day] = (used[day] || 0) + a; add(key, a, reason, note);
  };

  for (const w of u.workouts) {
    if (w.date < since) continue;
    if (w.min >= 20) capped(w.date, `training:${w.date}:${w.id}`, COIN.training, 'training', w.title);
    (w.prs || []).slice(0, 2).forEach((p, i) => capped(w.date, `pr:${w.date}:${w.id}:${i}`, COIN.pr, 'pr', p));
  }
  // Schrittziel – nur wenn Schritte automatisch gezählt werden
  const auto = !!u.health?.on || !!(u.stepToken && u.cloud);
  const goal = u.profile.stepGoal || 10000;
  if (auto) for (const [d, n] of Object.entries(u.steps)) if (d >= since && d <= today() && n >= goal) capped(d, `steps:${d}`, COIN.steps, 'steps');

  // 7 Tage in Folge aktiv (Training oder Schrittziel) – alle 7 Tage einmal
  const active = (d: string) => u.workouts.some(w => w.date === d) || (u.steps[d] || 0) >= goal;
  let run = 0;
  for (let d = since; d <= today(); d = addDays(d, 1)) {
    run = active(d) ? run + 1 : 0;
    if (run > 0 && run % 7 === 0) add(`streak:${d}`, COIN.streak, 'streak');
  }
  // Wochen-Challenge geschafft (abgeschlossene und laufende Woche)
  const dg = digestOf(u);
  for (let m = mondayOf(since); m <= mondayOf(today()); m = addDays(m, 7)) {
    if (m < mondayOf(u.createdAt)) continue;
    const ws = weekStats(dg, m); if (ws.done) add(`challenge:${m}`, COIN.challenge, 'challenge', ws.ch.title);
  }
  // Duelle gewonnen
  for (const d of [...u.duels, ...cloudDuels]) {
    if (d.end >= today()) continue;
    const st = duelState(u, d, cloudFriends); if (st.result === 'won') add(`duel:${d.id}`, COIN.duel, 'duel', st.fdg?.name);
  }
  return out;
}

/** Joker darf höchstens einmal pro Kalendermonat eingesetzt werden */
export function jokerAllowed(u: User, mon: string) {
  const inv = u.inv || emptyInv();
  return inv.jokers > 0 && !inv.jokerWeeks.includes(mon) && !inv.jokerWeeks.some(w => w.slice(0, 7) === mon.slice(0, 7));
}
