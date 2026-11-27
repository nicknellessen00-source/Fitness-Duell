/* Sport-Herausforderungen: Hilfsfunktionen für Anzeige und Demo-Freunde */
import { DEMO, SP } from './logic';
import type { Digest, Match, MatchMsg, User } from './types';
import { uid } from './util';

/** Meine Kennung in dieser Herausforderung (online: Supabase-Nutzer, lokal: Geräte-Konto) */
export const meIn = (u: User, m: Match) => (m.cloud ? u.cloud?.uid || '' : u.id);
export const otherIn = (u: User, m: Match) => (m.challenger === meIn(u, m) ? m.opponent : m.challenger);

export function nameOf(id: string, u: User, cloudFriends: Digest[]) {
  if (id === u.id || id === u.cloud?.uid) return 'Du';
  const d = DEMO.find(x => x.id === id); if (d) return d.name.replace(' (Demo)', '');
  return cloudFriends.find(f => f.id === id)?.name || 'Freund';
}
export const sportName = (id: string) => SP[id]?.name || id;

/** Kurzer Status aus meiner Sicht; needsMe = ich muss etwas tun */
export function matchState(u: User, m: Match): { text: string; needsMe: boolean; active: boolean } {
  const me = meIn(u, m);
  switch (m.status) {
    case 'open': return m.opponent === me ? { text: 'Wartet auf deine Antwort', needsMe: true, active: true } : { text: 'Einladung verschickt', needsMe: false, active: true };
    case 'accepted': return { text: (m.playAt || 0) > Date.now() ? 'Zugesagt' : 'Ergebnis eintragen', needsMe: (m.playAt || 0) <= Date.now(), active: true };
    case 'reported': return m.reportedBy === me ? { text: 'Wartet auf Bestätigung', needsMe: false, active: true } : { text: 'Ergebnis bestätigen', needsMe: true, active: true };
    case 'done': return { text: m.winner == null ? 'Unentschieden' : m.winner === me ? 'Gewonnen' : 'Verloren', needsMe: false, active: false };
    case 'declined': return { text: 'Abgelehnt', needsMe: false, active: false };
    case 'cancelled': return { text: 'Abgesagt', needsMe: false, active: false };
    case 'disputed': return { text: 'Ergebnis strittig – Einsätze zurück', needsMe: false, active: false };
  }
}

export function allMatches(u: User, cloudMatches: Match[]) {
  return [...cloudMatches, ...(u.matches || [])].sort((a, b) => b.updatedAt - a.updatedAt);
}

export const fmtWhen = (t?: number | null) => (t ? new Date(t).toLocaleString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Termin offen');

/* ---------- Demo-Freunde antworten automatisch ---------- */
const ACCEPT = ['Bin dabei. Mach dich auf was gefasst.', 'Gerne! Wer verliert, gibt das Getränk aus.', 'Deal. Ich bring die Bälle mit.', 'Endlich mal eine echte Herausforderung.'];
const CONFIRM = ['Passt, gut gespielt.', 'Stimmt leider. Revanche nächste Woche?', 'Respekt – nächstes Mal hole ich mir das.'];
export const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
export const msg = (user: string, text: string): MatchMsg => ({ id: uid(), user, text, at: Date.now() });
export const DEMO_REPLY = { accept: () => pick(ACCEPT), confirm: () => pick(CONFIRM) };
