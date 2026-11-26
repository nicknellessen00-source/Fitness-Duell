import type { GoalId } from './data';

export type Sex = 'm' | 'f' | 'd';
export interface Profile {
  name: string; email: string; pass: string; color: string; sex: Sex; birth: string;
  heightCm: number; weightKg: number; targetKg: number | null; bodyFat: number | null; restHr: number | null;
  activity: number; level: string; days: number; stepGoal: number; injuries: string; goal: GoalId;
}
export interface SetEntry { reps?: number; kg?: number; sec?: number; done?: boolean }
export interface Workout {
  id: string; date: string; title: string; min: number; kcal: number; vol?: number; sport?: string; intensity?: string; distKm?: number;
  items: { ex: string; sets: SetEntry[] }[]; prs?: string[];
  /** Beispieldaten nach der Anmeldung */
  sample?: boolean;
}
export interface SessionSet { reps?: number | ''; kg?: number | ''; sec?: number | ''; done: boolean }
export interface Session { title: string; planIdx?: number; started: number; cur: number; items: { ex: string; sets: SessionSet[] }[] }
export interface ActiveSport { sport: string; start: number; pausedMs: number; pausedAt: number | null }
export interface FoodEntry { id: string; name: string; meal: string; grams: number; kcal: number; p: number; c: number; f: number; src?: 'text' | 'scan' | 'label' | 'search'; barcode?: string; sample?: boolean }
export interface Friend { id: string; kind: 'demo' | 'local' | 'code' | 'cloud'; uid?: string; digest?: Digest }
export interface Duel { id: string; friendId: string; type: string; ex?: string; start: string; end: string; cloudId?: string; cloud?: boolean; challenger?: boolean }
export interface User {
  id: string; v: number; createdAt: string; profile: Profile; favorites: string[]; workouts: Workout[];
  weights: { d: string; kg: number; sample?: boolean }[]; steps: Record<string, number>; water: Record<string, number>;
  food: Record<string, FoodEntry[]>; duels: Duel[]; friends: Friend[]; planIdx: number; seen: Record<string, number>;
  activeSession?: Session | null; activeSport?: ActiveSport | null;
  /** Beispieldaten aktiv: welche Schritt- und Wasserwerte von ihnen stammen */
  sample?: { steps: Record<string, number>; water: Record<string, number> } | null;
  /** Automatische Schritte vom Gerät (iPhone-Bewegungssensor / Health Connect) */
  health?: { on: boolean; last?: number; src?: 'device' | 'sensor' };
  /** Schlüssel für den Apple-Health-Kurzbefehl (Web-App auf dem iPhone) */
  stepToken?: string; shortcutLast?: number;
  /** FitCoins: Buchungen (positiv = verdient, negativ = ausgegeben); key verhindert doppelte Buchungen */
  coins?: CoinTx[];
  /** Gekaufte Dinge und Auswahl */
  inv?: Inventory;
  /** Erinnerungen (Wochen-Challenge, Duelle) */
  notify?: { on: boolean };
  cloud?: { uid: string; email: string }; cloudBase?: { days: Record<string, Partial<Day>> }; tourDone?: boolean;
}
export interface CoinTx { key: string; amount: number; reason: CoinReason; at: number; note?: string; synced?: boolean }
export type CoinReason = 'training' | 'steps' | 'pr' | 'streak' | 'challenge' | 'duel' | 'buy' | 'gift_in' | 'gift_out' | 'stake' | 'pot' | 'refund' | 'start';
export interface Inventory { jokers: number; jokerWeeks: string[]; owned: string[]; shirt?: string; frame?: string }
export interface Day {
  vol: number; wo: number; kcal: number; steps: number; min: number; cardio: number; water: number; food: number;
  reps: Record<string, number>; sec: Record<string, number>; max: Record<string, number>;
}
export interface Digest {
  id: string; name: string; color: string; goal: GoalId; since: string; days: Record<string, Day>;
  weights: [string, number][]; at: number; demo?: boolean;
  /** Wochen (Montag), in denen ein Joker die Strafe aufhebt */
  jokers?: string[];
  /** Profilrahmen aus dem Shop */
  frame?: string;
  /** Ab wann Tage für Wochenwerte zählen (Beispieldaten vor der Anmeldung); sonst since */
  countFrom?: string;
}
