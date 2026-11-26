import type { DbFood } from './foods';
export interface ParsedItem {
  text: string; query: string; qty: number | null; unit: string | null; side: boolean; sizeF: number;
  candidates: DbFood[]; sure: boolean; food?: DbFood; grams?: number;
}
export function parseMeal(text: string, extra?: unknown[]): ParsedItem[];
export function parseLabel(text: string): { kcal?: number; p?: number; c?: number; f?: number; sugar?: number; fiber?: number; serving?: number; found: number; warn?: string };
export function findFoods(q: string, extra?: unknown[]): { food: DbFood; score: number }[];
export function regrams(item: ParsedItem): number;
export const UNIT_LABEL: Record<string, string>;
