import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { CoinReason, CoinTx, Digest, Duel, Match, MatchStatus } from './types';

/* Öffentliche Projekt-Adresse + Publishable Key (dürfen in der App stehen, Schutz läuft über RLS) */
export const SUPABASE_URL = 'https://cnfdowfzsjhumvipptzf.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_EHDKCvA-TQnK9Va6QgE6jg_Iw6bklis';

let client: SupabaseClient | null = null;
export function sb() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storage: AsyncStorage, storageKey: 'fx.sb.auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web' },
    });
  }
  return client;
}
const check = <T,>(r: { data: T; error: { message?: string } | null }) => { if (r.error) throw new Error(r.error.message || 'Serverfehler'); return r.data; };

export async function signIn(email: string, password: string) {
  const r = await sb().auth.signInWithPassword({ email, password });
  if (r.error) throw new Error(r.error.message);
  return r.data.user;
}
export async function signUp(email: string, password: string, name: string) {
  const r = await sb().auth.signUp({ email, password, options: { data: { name } } });
  if (r.error) throw new Error(r.error.message);
  return { user: r.data.user, needsConfirm: !r.data.session };
}
export async function signOut() { await sb().auth.signOut(); }
/** Online-Konto samt aller Daten endgültig löschen (Funktion aus supabase/delete_account.sql) */
export async function deleteAccount() { check(await sb().rpc('delete_my_account')); await sb().auth.signOut().catch(() => {}); }

interface DigestRow { user_id: string; name: string; color: string; goal: Digest['goal']; since: string; data: { days?: Digest['days']; weights?: Digest['weights']; jokers?: string[]; frame?: string } | null; updated_at: string }
const COLS = 'user_id,name,color,goal,since,data,updated_at';
function rowToDigest(r: DigestRow): Digest {
  const days = r.data?.days || {};
  for (const d of Object.values(days)) {
    for (const f of ['vol', 'wo', 'kcal', 'steps', 'min', 'cardio', 'water', 'food'] as const) d[f] = d[f] || 0;
    d.reps = d.reps || {}; d.sec = d.sec || {}; d.max = d.max || {};
  }
  return { id: r.user_id, name: r.name, color: r.color, goal: r.goal, since: r.since || new Date().toISOString().slice(0, 10), days, weights: r.data?.weights || [], at: Date.parse(r.updated_at) || Date.now(), jokers: r.data?.jokers || [], frame: r.data?.frame || undefined };
}
async function me() { const { data } = await sb().auth.getSession(); return data.session?.user || null; }
export const currentUser = me;

export async function ownDigest() {
  const user = await me(); if (!user) return null;
  const rows = check(await sb().from('digests').select(COLS).eq('user_id', user.id)) as DigestRow[];
  return rows[0] ? rowToDigest(rows[0]) : null;
}

/** Eigenen Digest hochladen; liefert den Freundes-Code */
export async function pushDigest(p: Digest): Promise<string> {
  const user = await me(); if (!user) throw new Error('Nicht angemeldet');
  const row = { user_id: user.id, name: p.name, color: p.color, goal: p.goal, since: p.since, data: { days: p.days, weights: p.weights, jokers: p.jokers || [], frame: p.frame || null }, updated_at: new Date().toISOString() };
  const d = check(await sb().from('digests').upsert(row, { onConflict: 'user_id' }).select('friend_code').single()) as { friend_code: string };
  return d.friend_code;
}

/** Online-Freunde inkl. Digests */
export async function friends(): Promise<Digest[]> {
  const user = await me(); if (!user) return [];
  const fr = check(await sb().from('friendships').select('friend_id').eq('user_id', user.id)) as { friend_id: string }[];
  if (!fr.length) return [];
  const rows = check(await sb().from('digests').select(COLS).in('user_id', fr.map(f => f.friend_id))) as DigestRow[];
  return rows.map(rowToDigest);
}
export async function addFriend(code: string) { return check(await sb().rpc('add_friend', { code })); }

interface DuelRow { id: string; challenger: string; opponent: string; type: string; exercise: string | null; start_date: string; end_date: string }
/** Online-Duelle; friendId zeigt auf den Online-Freund („cloud-<uid>“) */
export async function duels(): Promise<Duel[]> {
  const user = await me(); if (!user) return [];
  const rows = check(await sb().from('duels').select('*').order('start_date', { ascending: false })) as DuelRow[];
  return rows.map(r => ({ id: 'c-' + r.id, cloudId: r.id, cloud: true, friendId: 'cloud-' + (r.challenger === user.id ? r.opponent : r.challenger), challenger: r.challenger === user.id, type: r.type, ex: r.exercise || undefined, start: r.start_date, end: r.end_date }));
}
export async function createDuel(d: Duel, opponentId: string) {
  const user = await me(); if (!user) throw new Error('Nicht angemeldet');
  check(await sb().from('duels').insert({ challenger: user.id, opponent: opponentId, type: d.type, exercise: d.ex || null, start_date: d.start, end_date: d.end }));
}
export async function deleteDuel(cloudId: string) { check(await sb().from('duels').delete().eq('id', cloudId)); }
/** Persönlicher Schlüssel für den Apple-Health-Kurzbefehl (supabase/health_steps.sql) */
export async function createStepToken(): Promise<string> { return check(await sb().rpc('create_step_token')) as string; }
/** Vom Kurzbefehl hochgeladene Tagesschritte */
export async function healthSteps(since: string): Promise<{ day: string; steps: number }[]> {
  const user = await me(); if (!user) return [];
  return check(await sb().from('health_steps').select('day,steps').eq('user_id', user.id).gte('day', since)) as { day: string; steps: number }[];
}
/* ---------- FitCoins (supabase/coins.sql) ---------- */
interface LedgerRow { key: string; amount: number; reason: CoinReason; note: string | null; ref: string | null; created_at: string }
export async function myCoins(): Promise<{ balance: number; ledger: CoinTx[] }> {
  const balance = check(await sb().rpc('my_coins')) as number;
  const rows = check(await sb().from('coin_ledger').select('key,amount,reason,note,ref,created_at').order('created_at', { ascending: false }).limit(40)) as LedgerRow[];
  return { balance, ledger: rows.map(r => ({ key: r.key, amount: r.amount, reason: r.reason, note: r.note || undefined, at: Date.parse(r.created_at), synced: true })) };
}
export async function awardCoins(items: { key: string; reason: CoinReason; note?: string }[]) { return check(await sb().rpc('award_coins', { p_items: items })) as number; }
export async function spendCoins(item: string, key: string) { return check(await sb().rpc('spend_coins', { p_item: item, p_key: key })) as number; }
export async function sendCoins(to: string, amount: number) { return check(await sb().rpc('send_coins', { p_to: to, p_amount: amount })) as number; }
export async function stakeDuel(duelId: string, amount: number) { return check(await sb().rpc('stake_duel', { p_duel: duelId, p_amount: amount })) as number; }
export interface Settlement { duel_id: string; winner: string | null; pot: number; vals: Record<string, number> }
export async function settleDuel(duelId: string) { return check(await sb().rpc('settle_duel', { p_duel: duelId })) as Settlement | null; }
export async function duelStakes(duelIds: string[]): Promise<{ duel_id: string; user_id: string; amount: number }[]> {
  if (!duelIds.length) return [];
  return check(await sb().from('duel_stakes').select('duel_id,user_id,amount').in('duel_id', duelIds)) as { duel_id: string; user_id: string; amount: number }[];
}

/* ---------- Sport-Herausforderungen (supabase/matches.sql) ---------- */
interface MatchRow { id: string; challenger: string; opponent: string; sport: string; message: string | null; play_at: string | null; place: string | null; stake: number; status: MatchStatus; winner: string | null; score: string | null; reported_by: string | null; created_at: string; updated_at: string }
interface MatchMsgRow { id: number; match_id: string; user_id: string; text: string; created_at: string }
export async function matches(): Promise<Match[]> {
  const user = await me(); if (!user) return [];
  const rows = check(await sb().from('matches').select('*').order('updated_at', { ascending: false }).limit(50)) as MatchRow[];
  if (!rows.length) return [];
  const msgs = check(await sb().from('match_messages').select('id,match_id,user_id,text,created_at').in('match_id', rows.map(r => r.id)).order('created_at')) as MatchMsgRow[];
  return rows.map(r => ({
    id: r.id, cloud: true, challenger: r.challenger, opponent: r.opponent, sport: r.sport, message: r.message || undefined,
    playAt: r.play_at ? Date.parse(r.play_at) : null, place: r.place || undefined, stake: r.stake, status: r.status,
    winner: r.winner, score: r.score || undefined, reportedBy: r.reported_by, createdAt: Date.parse(r.created_at), updatedAt: Date.parse(r.updated_at),
    messages: msgs.filter(m => m.match_id === r.id).map(m => ({ id: String(m.id), user: m.user_id, text: m.text, at: Date.parse(m.created_at) })),
  }));
}
export async function createMatch(to: string, sport: string, message: string, playAt: number | null, place: string, stake: number) {
  return check(await sb().rpc('create_match', { p_to: to, p_sport: sport, p_message: message, p_play_at: playAt ? new Date(playAt).toISOString() : null, p_place: place, p_stake: stake })) as string;
}
export async function respondMatch(id: string, accept: boolean, message: string) { return check(await sb().rpc('respond_match', { p_match: id, p_accept: accept, p_message: message })); }
export async function cancelMatch(id: string, message: string) { return check(await sb().rpc('cancel_match', { p_match: id, p_message: message })); }
export async function reportMatch(id: string, winner: string | null, score: string) { return check(await sb().rpc('report_match', { p_match: id, p_winner: winner, p_score: score })); }
export async function confirmMatch(id: string, ok: boolean, message: string) { return check(await sb().rpc('confirm_match', { p_match: id, p_ok: ok, p_message: message })); }
export async function postMatchMessage(id: string, text: string) { return check(await sb().rpc('post_match_message', { p_match: id, p_text: text })); }

export async function removeFriend(fid: string) { check(await sb().rpc('remove_friend', { fid })); }

/** Echtzeit: bei Änderungen an Digests/Duellen benachrichtigen */
export function subscribe(cb: () => void) {
  const ch = sb().channel('fitduell')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'digests' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'duels' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'coin_ledger' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'duel_stakes' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, cb)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_messages' }, cb)
    .subscribe();
  return () => { sb().removeChannel(ch); };
}
