/* Level der Trainingsfigur: Erfahrungspunkte (XP) aus echtem Training – Beispieldaten zählen nicht. */
import { duelState } from './logic';
import { meIn } from './matches';
import { withoutSample } from './sample';
import type { Digest, Duel, Match, User } from './types';

export const XP = { workoutBase: 20, perMinute: 0.5, maxMinutes: 90, per1000Steps: 2, stepsDayMax: 30, pr: 15, duel: 50, match: 60, challenge: 75, streak: 30 } as const;

/** Gesamt-XP, die für ein Level nötig sind: 1 → 0, 2 → 100, 3 → 300, 4 → 600, 5 → 1000 … */
export const xpFor = (level: number) => 50 * level * (level - 1);

export const TIERS = [
  { from: 1, name: 'Einsteiger', color: '#A7ADB7' },
  { from: 3, name: 'Aufsteiger', color: '#B9804A' },
  { from: 5, name: 'Sportler', color: '#9BD000' },
  { from: 8, name: 'Athlet', color: '#A7ADB7' },
  { from: 12, name: 'Champion', color: '#E7B416' },
  { from: 16, name: 'Legende', color: '#E7B416' },
];

/** Was die Figur mit dem Level freischaltet (außer Shop-Artikeln) */
export const UNLOCKS = [
  { level: 3, text: 'Mehr Muskeln' },
  { level: 5, text: 'Siegerpose' },
  { level: 8, text: 'Breite Schultern' },
  { level: 12, text: 'Goldener Hintergrund' },
];

export interface LevelInfo { xp: number; level: number; into: number; need: number; tier: (typeof TIERS)[number]; bulk: number; pose: 'stand' | 'flex' }

export function xpOf(full: User, cloudMatches: Match[] = [], cloudFriends: Digest[] = [], cloudDuels: Duel[] = []) {
  const u = withoutSample(full);
  let xp = 0;
  for (const w of u.workouts) {
    xp += XP.workoutBase + Math.min(w.min || 0, XP.maxMinutes) * XP.perMinute;
    xp += (w.prs?.length || 0) * XP.pr;
  }
  for (const n of Object.values(u.steps)) xp += Math.min(XP.stepsDayMax, Math.floor((n || 0) / 1000) * XP.per1000Steps);
  for (const d of [...u.duels, ...cloudDuels]) if (duelState(u, d, cloudFriends).result === 'won') xp += XP.duel;
  const seen = new Set<string>();
  for (const m of [...(u.matches || []), ...cloudMatches]) {
    if (seen.has(m.id)) continue; seen.add(m.id);
    if (m.status === 'done' && m.winner && m.winner === meIn(u, m)) xp += XP.match;
  }
  for (const t of u.coins || []) { if (t.reason === 'challenge') xp += XP.challenge; else if (t.reason === 'streak') xp += XP.streak; }
  return Math.round(xp);
}

export function levelInfo(xp: number): LevelInfo {
  let level = 1;
  while (xp >= xpFor(level + 1) && level < 99) level++;
  const into = xp - xpFor(level), need = xpFor(level + 1) - xpFor(level);
  const tier = [...TIERS].reverse().find(t => level >= t.from)!;
  // Muskelmasse wächst mit dem Level, ab Level 8 etwas stärker (breite Schultern)
  const bulk = 1 + Math.min(level - 1, 15) * 0.024 + (level >= 8 ? 0.05 : 0);
  return { xp, level, into, need, tier, bulk, pose: level >= 5 ? 'flex' : 'stand' };
}

export const levelOf = (u: User, cloudMatches: Match[] = [], cloudFriends: Digest[] = [], cloudDuels: Duel[] = []) =>
  levelInfo(xpOf(u, cloudMatches, cloudFriends, cloudDuels));

export const nextUnlock = (level: number) => UNLOCKS.find(x => x.level > level);
