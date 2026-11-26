export type GoalId = 'lose' | 'muscle' | 'endurance' | 'golf' | 'hyrox' | 'pilates';
export interface Goal { label: string; icon: string; kcal: number; protein: number; fat: number; desc: string }
export interface Exercise {
  id: string; name: string; cat: string; goals: GoalId[]; muscles: string; equip: string; level: number;
  type: 'reps' | 'time'; met: number; bw?: number; steps: string[]; tips: string; anim: unknown;
}
export interface Plan { name: string; items: [string, number, number][] }
export interface Challenge { id: string; title: string; desc: string; icon: string; kind: string; ex?: string; target: number; unit: string }
export interface Sport { id: string; name: string; icon: string; met: number; dist?: boolean; speed?: 'run' | 'bike' | 'walk'; cardio: boolean; cat: string }
export const GOALS: Record<GoalId, Goal>;
export const ACTIVITY: { id: number; label: string }[];
export const LEVELS: Record<string, string>;
export const CATS: string[];
export const EXERCISES: Exercise[];
export const PLANS: Record<GoalId, Plan[]>;
export const CHALLENGES: Challenge[];
export const POINTS: { workout: number; perMinutes: number; perSteps: number; challengeDone: number; challengeFailed: number; duelWin: number; duelLoss: number };
export const DUEL_TYPES: Record<string, { label: string; unit: string; desc: string }>;
export const FOODS: [string, number, number, number, number][];
export const SPORTS: Sport[];
