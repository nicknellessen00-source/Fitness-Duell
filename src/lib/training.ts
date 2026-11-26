/* Training & Sport: Session-Logik, Bestleistungen, Sport-Kalorien (aus der Web-App übernommen) */
import { EXERCISES, PLANS, type Sport } from './data';
import { EX, setStats } from './logic';
import type { Session, User, Workout } from './types';
import { clamp, today, uid } from './util';

export const fmtSec = (s: number) => { const m = Math.floor(s / 60), r = Math.round(s % 60); return m ? `${m}:${String(r).padStart(2, '0')} min` : `${r} s`; };
export const fmtDur = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
};

/** Bester Wert einer Übung: höchstes Gewicht, sonst meiste Wdh., bei Zeit-Übungen längste Dauer */
export function bestValue(u: User, id: string, skipWorkout?: string) {
  const e = EX[id]; let kg = 0, reps = 0, sec = 0;
  for (const w of u.workouts) {
    if (w.id === skipWorkout || w.sample) continue;
    for (const it of w.items) if (it.ex === id) for (const s of it.sets) {
      kg = Math.max(kg, +(s.kg || 0)); reps = Math.max(reps, +(s.reps || 0)); sec = Math.max(sec, +(s.sec || 0));
    }
  }
  return { kg, reps, sec, type: e?.type };
}
export function bestText(u: User, id: string) {
  const b = bestValue(u, id);
  if (b.type === 'time') return b.sec ? fmtSec(b.sec) : '';
  if (b.kg) return `${b.kg.toLocaleString('de-DE')} kg`;
  return b.reps ? `${b.reps} Wdh.` : '';
}
export function lastKg(u: User, id: string) {
  for (let i = u.workouts.length - 1; i >= 0; i--) if (!u.workouts[i].sample) for (const it of u.workouts[i].items) if (it.ex === id) {
    const s = it.sets.filter(x => +(x.kg || 0) > 0); if (s.length) return +(s[s.length - 1].kg || 0);
  }
  return 0;
}

export function newSession(u: User, title: string, items: [string, number, number][], planIdx?: number): Session {
  return {
    title, planIdx, started: Date.now(), cur: 0,
    items: items.filter(([ex]) => EX[ex]).map(([ex, sets, n]) => ({
      ex, sets: Array.from({ length: sets }, () => (EX[ex].type === 'time' ? { sec: n, done: false } : { reps: n, kg: lastKg(u, ex) || '', done: false })),
    })),
  };
}
export function planSession(u: User, idx?: number) {
  const plans = PLANS[u.profile.goal]; const i = idx ?? (u.planIdx || 0) % plans.length;
  return newSession(u, plans[i].name, plans[i].items, i);
}

/** Session in ein gespeichertes Training umwandeln; liefert null, wenn kein Satz erledigt ist */
export function finishSession(u: User, s: Session): Workout | null {
  const bodyKg = +u.profile.weightKg || 75;
  const items = s.items.map(it => ({
    ex: it.ex,
    sets: it.sets.filter(x => x.done).map(x => (EX[it.ex].type === 'time' ? { sec: +(x.sec || 0) } : { reps: +(x.reps || 0), kg: +(x.kg || 0) })),
  })).filter(it => it.sets.length);
  if (!items.length) return null;
  let kcal = 0, vol = 0, secSum = 0;
  for (const it of items) for (const st of it.sets) { const r = setStats(it.ex, st, bodyKg); kcal += r.kcal; vol += r.vol; secSum += r.sec; }
  const min = Math.max(1, Math.round((Date.now() - s.started) / 60000), Math.round(secSum / 60));
  // Neue Bestleistungen gegenüber allen bisherigen Trainings
  const prs: string[] = [];
  for (const it of items) {
    const prev = bestValue(u, it.ex); const e = EX[it.ex];
    const kg = Math.max(...it.sets.map(x => +(x.kg || 0))), reps = Math.max(...it.sets.map(x => +(x.reps || 0))), sec = Math.max(...it.sets.map(x => +(x.sec || 0)));
    const had = prev.kg || prev.reps || prev.sec;
    if (!had) continue;
    if (e.type === 'time' ? sec > prev.sec : kg > 0 ? kg > prev.kg : !prev.kg && reps > prev.reps)
      prs.push(`${e.name}: ${e.type === 'time' ? fmtSec(sec) : kg > 0 ? kg.toLocaleString('de-DE') + ' kg' : reps + ' Wdh.'}`);
  }
  return { id: uid(), date: today(), title: s.title, items, min, kcal: Math.round(kcal), vol: Math.round(vol), prs };
}

/* ---------- Sport ---------- */
export const INTENS = { leicht: { label: 'Locker', f: 0.8 }, mittel: { label: 'Mittel', f: 1 }, intensiv: { label: 'Intensiv', f: 1.25 } } as const;
export type Intensity = keyof typeof INTENS;
export function sportMet(sp: Sport, intensity: Intensity, min: number, km: number) {
  const kmh = km > 0 && min > 0 ? km / (min / 60) : 0;
  const speed = sp.speed as unknown as string | undefined;
  if (kmh && speed === 'run') return clamp(1.02 * kmh, 6, 16);
  if (kmh && speed === 'bike') return kmh < 16 ? 4 : kmh < 19 ? 6.8 : kmh < 22 ? 8 : kmh < 25 ? 10 : 12;
  if (kmh && speed === 'walk') return kmh < 4 ? 2.8 : kmh < 5 ? 3.5 : kmh < 6 ? 4.3 : 5;
  return sp.met * INTENS[intensity].f;
}
export const sportKcal = (u: User, sp: Sport, intensity: Intensity, min: number, km: number) =>
  Math.round((sportMet(sp, intensity, min, km) * (+u.profile.weightKg || 75) * min) / 60);
export const sportElapsed = (a: { start: number; pausedMs: number; pausedAt: number | null }, now = Date.now()) => (a.pausedAt || now) - a.start - (a.pausedMs || 0);
export function paceText(sp: Sport, min: number, km: number) {
  const kmh = km && min ? km / (min / 60) : 0; if (!kmh) return '';
  const speed = sp.speed as unknown as string | undefined;
  if (speed === 'run' || speed === 'walk') { const pace = 60 / kmh; return `Ø ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')} min/km`; }
  return `Ø ${(Math.round(kmh * 10) / 10).toLocaleString('de-DE')} km/h`;
}
export const exerciseCount = EXERCISES.length;
