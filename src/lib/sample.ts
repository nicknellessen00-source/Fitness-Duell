/* Beispieldaten für neue Konten: zwei Wochen mit Trainings, Schritten, Wasser, Gewicht und Mahlzeiten,
 * damit die App nicht leer wirkt. Alles ist als Beispiel markiert: bringt keine FitCoins, geht nicht an Freunde
 * und lässt sich mit einem Tipp vollständig entfernen. */
import { PLANS, type GoalId } from './data';
import { norm } from './foods';
import { EX, setStats } from './logic';
import { findFoods } from './meal';
import { sportKcal } from './training';
import type { FoodEntry, SetEntry, User, Workout } from './types';
import { addDays, hash, rng, today } from './util';

const SPORT_BY_GOAL: Record<GoalId, [string, number, number][]> = {
  // Sportart, Minuten, Kilometer
  lose: [['laufen', 32, 5.2], ['radfahren', 50, 18]],
  muscle: [['tennis', 60, 0]],
  endurance: [['laufen', 45, 8], ['radfahren', 70, 28], ['schwimmen', 35, 1.4]],
  golf: [['golf', 150, 0]],
  hyrox: [['laufen', 40, 7.5]],
  pilates: [['pilateskurs', 50, 0], ['yoga', 45, 0]],
};

function food(name: string, grams: number, meal: string, day: string): FoodEntry | null {
  const f = findFoods(norm(name))[0]?.food; if (!f) return null;
  const k = grams / 100;
  return { id: `s-${day}-${f.id}-${meal}`, name: f.name, meal, grams, kcal: Math.round(f.kcal * k), p: Math.round(f.p * k * 10) / 10, c: Math.round(f.c * k * 10) / 10, f: Math.round(f.f * k * 10) / 10, sample: true };
}

/** Beispieldaten in ein frisch angelegtes Konto schreiben */
export function addSample(u: User) {
  const t = today(); const r = rng(hash(u.id));
  const kg = +u.profile.weightKg || 75; const goal = u.profile.goal;
  const steps: Record<string, number> = {}, water: Record<string, number> = {};

  for (let i = 1; i <= 13; i++) {
    const d = addDays(t, -i);
    steps[d] = Math.round((5500 + r() * 7000) / 10) * 10;
    water[d] = Math.round((1500 + r() * 1100) / 250) * 250;
  }
  steps[t] = 3240; water[t] = 750;
  for (const [d, n] of Object.entries(steps)) if (!u.steps[d]) u.steps[d] = n; else delete steps[d];
  for (const [d, n] of Object.entries(water)) if (!u.water[d]) u.water[d] = n; else delete water[d];

  // Trainings: abwechselnd Plan-Einheiten und Sport
  const plans = PLANS[goal]; const sports = SPORT_BY_GOAL[goal] || SPORT_BY_GOAL.lose;
  const days = [12, 10, 8, 6, 4, 3, 1];
  const workouts: Workout[] = days.map((back, n) => {
    const date = addDays(t, -back);
    if (n % 3 === 2) {
      const [sp, min, km] = sports[n % sports.length];
      return { id: `s-w${n}`, date, title: { laufen: 'Laufen', radfahren: 'Radfahren', schwimmen: 'Schwimmen', tennis: 'Tennis', golf: 'Golf (Runde)', pilateskurs: 'Pilates-Kurs', yoga: 'Yoga' }[sp] || sp, sport: sp, intensity: 'mittel', distKm: km || undefined, items: [], min, kcal: sportKcal(u, { id: sp, name: sp, icon: '', met: 7, cardio: true, cat: '', ...(sp === 'laufen' ? { speed: 'run' as const } : sp === 'radfahren' ? { speed: 'bike' as const } : {}) }, 'mittel', min, km), vol: 0, sample: true };
    }
    const plan = plans[n % plans.length];
    const prog = Math.floor(n / 2) * 2.5; // leichte Steigerung über die Zeit
    const items = plan.items.filter(([ex]) => EX[ex]).map(([ex, sets, reps]) => {
      const e = EX[ex];
      const w = e.bw ? 0 : Math.max(2.5, Math.round((kg * 0.35) / 2.5) * 2.5 + prog);
      const list: SetEntry[] = Array.from({ length: sets }, () => (e.type === 'time' ? { sec: reps } : { reps, kg: w }));
      return { ex, sets: list };
    });
    let kcal = 0, vol = 0;
    for (const it of items) for (const s of it.sets) { const x = setStats(it.ex, s, kg); kcal += x.kcal; vol += x.vol; }
    return { id: `s-w${n}`, date, title: plan.name, items, min: 40 + (n % 3) * 8, kcal: Math.round(kcal + 120), vol: Math.round(vol), sample: true };
  });
  u.workouts = [...workouts, ...u.workouts].sort((a, b) => (a.date < b.date ? -1 : 1));

  // Gewichtsverlauf passend zum Ziel, endet beim eingetragenen Gewicht
  const trend = goal === 'lose' ? 0.13 : goal === 'muscle' ? -0.06 : 0.02;
  const ws = [12, 9, 6, 3].map(back => ({ d: addDays(t, -back), kg: Math.round((kg + trend * back + (r() - 0.5) * 0.3) * 10) / 10, sample: true }));
  u.weights = [...ws, ...u.weights].sort((a, b) => (a.d < b.d ? -1 : 1));

  // Mahlzeiten: gestern ein ganzer Tag, heute Frühstück
  const y = addDays(t, -1);
  const day = (d: string, list: [string, number, string][]) => {
    const items = list.map(([n, g, m]) => food(n, g, m, d)).filter((x): x is FoodEntry => !!x);
    u.food[d] = [...items, ...(u.food[d] || [])];
  };
  day(y, [['Haferflocken', 60, 'breakfast'], ['Banane', 120, 'breakfast'], ['Milch', 200, 'breakfast'],
    ['Hähnchenbrust', 150, 'lunch'], ['Reis', 200, 'lunch'], ['Brokkoli', 150, 'lunch'],
    ['Skyr', 150, 'snack'], ['Vollkornbrot', 100, 'dinner'], ['Gouda', 50, 'dinner']]);
  day(t, [['Skyr', 150, 'breakfast'], ['Apfel', 150, 'breakfast'], ['Haferflocken', 40, 'breakfast']]);

  if (!u.favorites.length) u.favorites = plans[0].items.slice(0, 3).map(([ex]) => ex).filter(ex => EX[ex]);
  u.sample = { steps, water };
}

/** Alle Beispieldaten entfernen; eigene Einträge bleiben erhalten */
export function removeSample(u: User) {
  u.workouts = u.workouts.filter(w => !w.sample);
  u.weights = u.weights.filter(w => !w.sample);
  for (const d of Object.keys(u.food)) { u.food[d] = u.food[d].filter(f => !f.sample); if (!u.food[d].length) delete u.food[d]; }
  for (const [d, n] of Object.entries(u.sample?.steps || {})) if (u.steps[d] === n) delete u.steps[d];
  for (const [d, n] of Object.entries(u.sample?.water || {})) if (u.water[d] === n) delete u.water[d];
  u.sample = null;
}

/** Kopie ohne Beispieldaten – für FitCoins und alles, was an Freunde geht */
export function withoutSample(u: User): User {
  if (!u.sample && !u.workouts.some(w => w.sample)) return u;
  const c: User = JSON.parse(JSON.stringify(u));
  removeSample(c);
  return c;
}
