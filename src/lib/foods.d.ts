export interface DbFood { id: string; name: string; aliases: string[]; kcal: number; p: number; c: number; f: number; portion: number; units: Record<string, number> }
export const FOOD_DB: DbFood[];
export function norm(s: string): string;
