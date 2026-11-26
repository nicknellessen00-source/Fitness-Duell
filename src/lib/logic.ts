/* FitDuell – Rechenlogik (1:1 aus der Web-App übernommen) */
import { CHALLENGES, EXERCISES, GOALS, POINTS, SPORTS, type Challenge } from './data';
import type { Day, Digest, Duel, Friend, Profile, SetEntry, User } from './types';
import { addDays, clamp, hash, mondayOf, parseKey, rng, today, weekDays } from './util';

export const SP = Object.fromEntries(SPORTS.map(x => [x.id, x]));
export const EX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));
export const COLORS = ['#D7FF3A', '#38D1FF', '#FF8A3D', '#B98CFF', '#3DDC84', '#FF6FA8', '#FFD24A'];
export const MEALS = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snacks' } as const;

/* ---------- Körperwerte ---------- */
export function age(p: Pick<Profile, 'birth'>) {
  if (!p.birth) return 30;
  const b = parseKey(p.birth), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}
export function calc(p: Pick<Profile, 'weightKg' | 'heightCm' | 'birth' | 'sex' | 'activity' | 'goal'>) {
  const kg = +p.weightKg || 75, cm = +p.heightCm || 175, a = age(p);
  const bmi = kg / ((cm / 100) ** 2);
  const bmr = Math.round(10 * kg + 6.25 * cm - 5 * a + (p.sex === 'f' ? -161 : p.sex === 'd' ? -78 : 5));
  const tdee = Math.round(bmr * (+p.activity || 1.375));
  const g = GOALS[p.goal] || GOALS.lose;
  const kcal = Math.max(p.sex === 'f' ? 1200 : 1500, tdee + g.kcal);
  const protein = Math.round(kg * g.protein), fat = Math.round(kg * g.fat);
  const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const water = Math.round((kg * 35) / 250) * 250;
  let bmiTxt = 'Normalgewicht';
  if (bmi < 18.5) bmiTxt = 'Untergewicht'; else if (bmi >= 30) bmiTxt = 'Adipositas'; else if (bmi >= 25) bmiTxt = 'Übergewicht';
  return { kg, cm, age: a, bmi, bmiTxt, bmr, tdee, kcal, protein, fat, carbs, water };
}

/* ---------- Training ---------- */
export function setStats(ex: string, s: SetEntry, bodyKg: number) {
  const e = EX[ex]; if (!e) return { vol: 0, sec: 0, kcal: 0 };
  const reps = +(s.reps || 0), kg = +(s.kg || 0);
  const sec = e.type === 'time' ? +(s.sec || 0) : reps * 3.5;
  const vol = e.type === 'reps' ? reps * (kg + (e.bw || 0) * bodyKg) : 0;
  const kcal = (e.met * bodyKg * sec) / 3600 * (e.type === 'reps' ? 1.5 : 1);
  return { vol, sec, kcal };
}
const isCardio = (e: (typeof EXERCISES)[number] | undefined) => !!e && e.type === 'time' && ['Cardio', 'HYROX'].includes(e.cat) && e.id !== 'farmers';
const emptyDay = (): Day => ({ vol: 0, wo: 0, kcal: 0, steps: 0, min: 0, cardio: 0, water: 0, food: 0, reps: {}, sec: {}, max: {} });

/** Tageszusammenfassung („Digest“) – gleiche Form für mich und Freunde */
export function digestOf(u: User): Digest {
  const days: Record<string, Day> = {}; const bodyKg = +u.profile.weightKg || 75;
  const day = (k: string) => days[k] || (days[k] = emptyDay());
  for (const w of u.workouts || []) {
    const d = day(w.date); d.wo++; d.min += w.min || 0; d.kcal += w.kcal || 0;
    if (w.sport && SP[w.sport]?.cardio) d.cardio += w.min || 0;
    for (const it of w.items) for (const s of it.sets) {
      const st = setStats(it.ex, s, bodyKg); d.vol += st.vol;
      const e = EX[it.ex]; if (!e) continue;
      if (e.type === 'reps') d.reps[it.ex] = (d.reps[it.ex] || 0) + +(s.reps || 0);
      else d.sec[it.ex] = (d.sec[it.ex] || 0) + +(s.sec || 0);
      if (+(s.kg || 0) > 0) d.max[it.ex] = Math.max(d.max[it.ex] || 0, +(s.kg || 0));
      if (isCardio(e)) d.cardio += +(s.sec || 0) / 60;
    }
  }
  for (const [k, v] of Object.entries(u.steps || {})) day(k).steps += v;
  for (const [k, v] of Object.entries(u.water || {})) day(k).water += v;
  for (const [k, v] of Object.entries(u.food || {})) if (v.length) day(k).food = 1;
  for (const [k, d] of Object.entries(u.cloudBase?.days || {})) {
    if (days[k]) continue;
    days[k] = { ...emptyDay(), ...JSON.parse(JSON.stringify(d)) };
  }
  return { id: u.id, name: u.profile.name, color: u.profile.color, goal: u.profile.goal, since: u.createdAt, days, weights: (u.weights || []).map(w => [w.d, w.kg]), at: Date.now(), jokers: u.inv?.jokerWeeks || [], frame: u.inv?.frame,
    countFrom: u.sample ? Object.keys(days).sort()[0] : undefined };
}

/* ---------- Demo-Freunde ---------- */
export const DEMO = [
  { id: 'demo-max', name: 'Max (Demo)', color: '#38D1FF', goal: 'muscle', kg: 84, p: 0.5, steps: 8500 },
  { id: 'demo-lena', name: 'Lena (Demo)', color: '#FF6FA8', goal: 'hyrox', kg: 63, p: 0.6, steps: 10500 },
  { id: 'demo-tim', name: 'Tim (Demo)', color: '#FF8A3D', goal: 'lose', kg: 96, p: 0.38, steps: 7000 },
] as const;
const demoCache: Record<string, Digest> = {};
export function demoDigest(id: string): Digest {
  const key = id + today() + new Date().getHours();
  if (demoCache[key]) return demoCache[key];
  const cfg = DEMO.find(d => d.id === id) || DEMO[0];
  const start = addDays(today(), -84); const days: Record<string, Day> = {}; const weights: [string, number][] = [];
  const frac = clamp((new Date().getHours() - 6) / 16, 0, 1);
  for (let i = 0; i <= 84; i++) {
    const k = addDays(start, i); const r = rng(hash(id + k)); const isToday = k === today();
    const d: Day = { ...emptyDay(), steps: Math.round(cfg.steps * (0.5 + r()) * (isToday ? frac : 1)), water: Math.round(1600 + r() * 1700), food: r() < 0.75 ? 1 : 0 };
    if (r() < cfg.p && (!isToday || r() < frac)) {
      d.wo = 1; d.min = Math.round(35 + r() * 40); d.kcal = Math.round(d.min * (6 + r() * 4));
      d.vol = Math.round((cfg.goal === 'muscle' ? 5000 : 2200) * (0.6 + r() * 0.9));
      d.reps = { pushup: Math.round(r() * 70), squat: Math.round(r() * 90), burpee: Math.round(r() * 35) };
      d.sec = { plank: Math.round(r() * 240) }; d.cardio = Math.round((cfg.goal === 'muscle' ? 8 : 25) * r() * 2);
      const prog = i * 0.06;
      d.max = { bench: Math.round(cfg.kg * 0.95 + prog), backsquat: Math.round(cfg.kg * 1.2 + prog), deadlift: Math.round(cfg.kg * 1.4 + prog), curl: Math.round(cfg.kg * 0.17 + prog / 6), ohp: Math.round(cfg.kg * 0.22 + prog / 5) };
    }
    days[k] = d;
    if (i % 3 === 0) weights.push([k, Math.round((cfg.kg - i * (cfg.goal === 'lose' ? 0.045 : cfg.goal === 'muscle' ? -0.012 : 0.01) + (r() - 0.5) * 0.8) * 10) / 10]);
  }
  return (demoCache[key] = { id, name: cfg.name, color: cfg.color, goal: cfg.goal, since: start, days, weights, demo: true, at: Date.now() });
}

/* ---------- Wochen-Challenge & Punkte ---------- */
export function challengeFor(mon: string): Challenge {
  const idx = Math.round((parseKey(mon).getTime() - new Date(2024, 0, 1).getTime()) / (7 * 864e5));
  return CHALLENGES[(((idx * 7) % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
}
type Sum = { vol: number; wo: number; kcal: number; steps: number; min: number; cardio: number; waterDays: number; foodDays: number; reps: Record<string, number>; sec: Record<string, number> };
function sumDays(dg: Digest, keys: string[]): Sum {
  const a: Sum = { vol: 0, wo: 0, kcal: 0, steps: 0, min: 0, cardio: 0, waterDays: 0, foodDays: 0, reps: {}, sec: {} };
  for (const k of keys) {
    const d = dg.days[k]; if (!d || k < (dg.countFrom || dg.since)) continue;
    for (const f of ['vol', 'wo', 'kcal', 'steps', 'min', 'cardio'] as const) a[f] += d[f] || 0;
    if ((d.water || 0) >= 2500) a.waterDays++;
    if (d.food) a.foodDays++;
    for (const [e, v] of Object.entries(d.reps || {})) a.reps[e] = (a.reps[e] || 0) + v;
    for (const [e, v] of Object.entries(d.sec || {})) a.sec[e] = (a.sec[e] || 0) + v;
  }
  return a;
}
function chProgress(ch: Challenge, a: Sum) {
  if (ch.kind === 'reps') return a.reps[ch.ex || ''] || 0;
  if (ch.kind === 'sec') return a.sec[ch.ex || ''] || 0;
  const v = (a as unknown as Record<string, number>)[ch.kind];
  return typeof v === 'number' ? v : 0;
}
export type WeekStatus = 'done' | 'failed' | 'grace' | 'open' | 'grace-open' | 'joker';
export function weekStats(dg: Digest, mon: string) {
  const keys = weekDays(mon); const a = sumDays(dg, keys); const ch = challengeFor(mon);
  const prog = chProgress(ch, a); const done = prog >= ch.target;
  const ended = keys[6] < today(); const eligible = dg.since <= mon;
  let status: WeekStatus = done ? 'done' : ended ? (eligible ? 'failed' : 'grace') : 'open';
  if (!done && !ended && !eligible) status = 'grace-open';
  if (status === 'failed' && dg.jokers?.includes(mon)) status = 'joker';
  const base = a.wo * POINTS.workout + Math.floor(a.min / POINTS.perMinutes) + Math.floor(a.steps / POINTS.perSteps);
  const bonus = done ? POINTS.challengeDone : status === 'failed' ? POINTS.challengeFailed : 0;
  return { mon, a, ch, prog, done, ended, status, base, bonus, pts: base + bonus };
}

/* ---------- Duelle ---------- */
function weightAt(dg: Digest, k: string, mode: 'start' | 'end') {
  const ws = (dg.weights || []).slice().sort((x, y) => (x[0] < y[0] ? -1 : 1));
  if (!ws.length) return null;
  const upto = ws.filter(w => w[0] <= k);
  if (mode === 'start') return (upto.length ? upto[upto.length - 1] : ws.find(w => w[0] >= k) || ws[0])[1];
  return upto.length ? upto[upto.length - 1][1] : null;
}
export function duelMetric(dg: Digest | null, d: Duel) {
  if (!dg) return 0;
  const end = d.end < today() ? d.end : today();
  if (d.type === 'loss') {
    const a = weightAt(dg, d.start, 'start'), b = weightAt(dg, end, 'end');
    return a != null && b != null ? Math.round((a - b) * 10) / 10 : 0;
  }
  let v = 0;
  for (let k = d.start; k <= end; k = addDays(k, 1)) {
    const day = dg.days[k]; if (!day) continue;
    if (d.type === 'max') v = Math.max(v, day.max?.[d.ex || ''] || 0);
    else v += (day as unknown as Record<string, number>)[d.type] || 0;
  }
  return Math.round(v);
}

/* ---------- Rangliste ---------- */
export function friendDigest(f: Friend, cloudFriends: Digest[] = []): Digest | null {
  if (f.kind === 'demo') return demoDigest(f.id);
  if (f.kind === 'code') return f.digest || null;
  if (f.kind === 'cloud') return cloudFriends.find(x => x.id === f.uid) || null;
  return null;
}
/** Alle Freunde: lokal gespeicherte + Online-Freunde */
export const allFriends = (u: User, cloudFriends: Digest[] = []): Friend[] =>
  [...u.friends, ...cloudFriends.map(dg => ({ id: 'cloud-' + dg.id, kind: 'cloud' as const, uid: dg.id }))];
export const allDuels = (u: User, cloudDuels: Duel[] = []) => [...u.duels, ...cloudDuels];
export function duelState(u: User, d: Duel, cloudFriends: Digest[] = []) {
  const f = allFriends(u, cloudFriends).find(x => x.id === d.friendId);
  const me = duelMetric(digestOf(u), d); const fdg = f ? friendDigest(f, cloudFriends) : null; const them = duelMetric(fdg, d);
  const over = d.end < today();
  const result = !over ? 'open' : me > them ? 'won' : me < them ? 'lost' : 'draw';
  return { f, fdg, me, them, over, result };
}
function seasonWeeks(u: User) {
  const start = mondayOf(u.createdAt); const cur = mondayOf(today()); const out: string[] = [];
  for (let m = cur; m >= start && out.length < 12; m = addDays(m, -7)) out.push(m);
  return out;
}
export interface Ranked { me: boolean; dg: Digest; week: ReturnType<typeof weekStats>; total: number }
export function leaderboard(u: User, cloudFriends: Digest[] = [], cloudDuels: Duel[] = []): Ranked[] {
  const cur = mondayOf(today()); const weeks = seasonWeeks(u);
  const list: { me: boolean; id: string; dg: Digest }[] = [{ me: true, id: u.id, dg: digestOf(u) }];
  const friends = allFriends(u, cloudFriends);
  for (const f of friends) { const dg = friendDigest(f, cloudFriends); if (dg) list.push({ me: false, id: f.id, dg }); }
  const duelPts = (id: string, isMe: boolean) => {
    let p = 0;
    for (const d of allDuels(u, cloudDuels)) {
      if (d.end >= today() || (!isMe && d.friendId !== id)) continue;
      const r = duelState(u, d, cloudFriends).result;
      if (isMe) p += r === 'won' ? POINTS.duelWin : r === 'lost' ? POINTS.duelLoss : 0;
      else p += r === 'lost' ? POINTS.duelWin : r === 'won' ? POINTS.duelLoss : 0;
    }
    return p;
  };
  return list.map(p => ({
    me: p.me, dg: p.dg, week: weekStats(p.dg, cur),
    total: weeks.reduce((s, m) => s + weekStats(p.dg, m).pts, 0) + duelPts(p.id, p.me),
  }));
}
