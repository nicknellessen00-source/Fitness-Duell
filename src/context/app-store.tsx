/* Zentraler App-Zustand: angemeldeter Nutzer, lokale Konten, Online-Verbindung */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import * as Cloud from '@/lib/cloud';
import { balance, emptyInv, pendingRewards, SHOP } from '@/lib/coins';
import { health, sensor } from '@/lib/health';
import { clearReminders, planReminders } from '@/lib/notify';
import { GOALS, type GoalId } from '@/lib/data';
import { COLORS, DEMO, digestOf } from '@/lib/logic';
import { deleteUser, getSession, hashPw, listAccounts, loadUser, saveUser, setSession, type Account } from '@/lib/storage';
import type { CoinTx, Digest, Duel, Sex, User } from '@/lib/types';
import { addDays, today, uid } from '@/lib/util';

export interface RegData {
  name: string; email: string; pw: string; color: string; sex: Sex; birth: string; heightCm: number; weightKg: number;
  targetKg: number | null; bodyFat: number | null; restHr: number | null; activity: number; level: string; days: number;
  stepGoal: number; injuries: string; goal: GoalId;
}
interface CloudState {
  status: 'off' | 'connecting' | 'on' | 'error'; code: string | null; friends: Digest[]; duels: Duel[]; err: string;
  /** FitCoins vom Server (null = nicht verfügbar, z. B. coins.sql noch nicht eingespielt) */
  coins: { balance: number; ledger: CoinTx[] } | null; coinsErr: string;
}
interface Store {
  ready: boolean; user: User | null; accounts: Account[]; cloud: CloudState;
  register(d: RegData): Promise<void>;
  login(id: string, pw: string): Promise<void>;
  cloudLogin(email: string, pw: string): Promise<void>;
  logout(): Promise<void>;
  /** Konto endgültig löschen: lokal und – falls verbunden – online */
  deleteAccount(): Promise<void>;
  update(fn: (u: User) => void): void;
  /** Schritte automatisch übernehmen einschalten; liefert false, wenn nicht erlaubt/verfügbar */
  connectHealth(): Promise<boolean>;
  connectSensor(): Promise<boolean>;
  syncSteps(): Promise<void>;
  /** Online-Freunde und -Duelle neu laden */
  refreshCloud(): Promise<void>;
  /** FitCoins: zuletzt gutgeschrieben (für die kurze Einblendung) */
  coinFlash: { amount: number; text: string; id: number } | null;
  buy(itemId: string): Promise<string | null>;
  equip(kind: 'shirt' | 'frame', itemId: string | undefined): void;
  applyJoker(mon: string): void;
  /** Coins an einen Online-Freund schicken; liefert eine Fehlermeldung oder null */
  cheer(friendUid: string, amount: number): Promise<string | null>;
  /** Einsatz für ein Online-Duell */
  stake(duelCloudId: string, amount: number): Promise<string | null>;
  syncCoins(): Promise<void>;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('StoreProvider fehlt'); return s; };
export const useUser = () => { const u = useStore().user; if (!u) throw new Error('Nicht angemeldet'); return u; };

const freshCloud = (): CloudState => ({ status: 'off', code: null, friends: [], duels: [], err: '', coins: null, coinsErr: '' });

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cloud, setCloud] = useState<CloudState>(freshCloud);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncCoinsRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    (async () => {
      setAccounts(await listAccounts());
      const sid = await getSession();
      const u = sid ? await loadUser(sid) : null;
      if (u) { const n = normalize(u); userRef.current = n; setUser(n); }
      setReady(true);
    })();
  }, []);

  /* Online: Freunde laden, eigenen Stand hochladen, Echtzeit-Updates */
  const cloudUid = user?.cloud?.uid;
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => {
    if (!cloudUid) { setCloud(freshCloud()); return; }
    let stop: (() => void) | null = null; let alive = true;
    const refresh = async () => {
      try {
        const u = userRef.current; if (!u) return;
        const code = await Cloud.pushDigest(digestOf(u));
        const [friends, duels] = await Promise.all([Cloud.friends(), Cloud.duels().catch(() => [])]);
        if (alive) setCloud(c => ({ ...c, status: 'on', code, friends, duels, err: '' }));
        syncCoinsRef.current?.();
      } catch (e) {
        if (alive) setCloud(c => ({ ...c, status: 'error', err: (e as Error).message }));
      }
    };
    setCloud(c => ({ ...c, status: 'connecting' }));
    Cloud.currentUser().then(cu => {
      if (!alive) return;
      if (!cu || cu.id !== cloudUid) { setCloud({ ...freshCloud(), status: 'error', err: 'Online-Sitzung abgelaufen – bitte neu anmelden' }); return; }
      refresh(); stop = Cloud.subscribe(() => { Promise.all([Cloud.friends(), Cloud.duels()]).then(([friends, duels]) => alive && setCloud(c => ({ ...c, friends, duels }))).catch(() => {}); syncCoinsRef.current?.(); });
    });
    return () => { alive = false; stop?.(); };
  }, [cloudUid]);

  const persist = useCallback(async (u: User) => {
    await saveUser(u); setAccounts(await listAccounts());
  }, []);

  const start = useCallback(async (u: User) => {
    await setSession(u.id); const n = normalize(u); userRef.current = n; setUser(n);
  }, []);

  const update = useCallback((fn: (u: User) => void) => {
    const prev = userRef.current; if (!prev) return;
    const next: User = JSON.parse(JSON.stringify(prev)); fn(next);
    userRef.current = next; setUser(next); persist(next);
    if (next.cloud) {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => { Cloud.pushDigest(digestOf(next)).catch(() => {}); }, 3000);
    }
  }, [persist]);

  const register = useCallback(async (d: RegData) => {
    const id = uid();
    const u: User = {
      id, v: 1, createdAt: today(),
      profile: { name: d.name, email: d.email, pass: await hashPw(d.pw, id), color: d.color, sex: d.sex, birth: d.birth, heightCm: d.heightCm, weightKg: d.weightKg, targetKg: d.targetKg, bodyFat: d.bodyFat, restHr: d.restHr, activity: d.activity, level: d.level, days: d.days, stepGoal: d.stepGoal, injuries: d.injuries, goal: d.goal },
      favorites: [], workouts: [], weights: [{ d: today(), kg: d.weightKg }], steps: {}, water: {}, food: {}, duels: [],
      friends: DEMO.map(x => ({ id: x.id, kind: 'demo' as const })), planIdx: 0, seen: {},
    };
    await persist(u); await start(u);
  }, [persist, start]);

  const login = useCallback(async (id: string, pw: string) => {
    const u = await loadUser(id); if (!u) throw new Error('Konto nicht gefunden');
    if ((await hashPw(pw, u.id)) !== u.profile.pass) throw new Error('Falsches Passwort');
    await start(u);
  }, [start]);

  const cloudLogin = useCallback(async (email: string, pw: string) => {
    let cu;
    try { cu = await Cloud.signIn(email, pw); } catch (e) {
      const m = (e as Error).message; throw new Error(m === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch' : m);
    }
    for (const a of await listAccounts()) { const x = await loadUser(a.id); if (x?.cloud?.uid === cu.id) return start(x); }
    const own = await Cloud.ownDigest(); const id = uid();
    const ws = (own?.weights || []).map(([d, kg]) => ({ d, kg })).sort((a, b) => (a.d < b.d ? -1 : 1));
    const u: User = {
      id, v: 1, createdAt: own?.since && own.since < today() ? own.since : today(),
      profile: { name: own?.name || email.split('@')[0], email, pass: await hashPw(pw, id), color: own?.color || COLORS[0], sex: 'm', birth: '1995-01-01', heightCm: 175, weightKg: ws.length ? ws[ws.length - 1].kg : 75, targetKg: null, bodyFat: null, restHr: null, activity: 1.375, level: 'beginner', days: 3, stepGoal: 10000, injuries: '', goal: own && GOALS[own.goal] ? own.goal : 'lose' },
      favorites: [], workouts: [], weights: ws.length ? ws : [{ d: today(), kg: 75 }], steps: {}, water: {}, food: {}, duels: [], friends: [], planIdx: 0, seen: {},
      cloud: { uid: cu.id, email }, cloudBase: { days: own?.days || {} }, tourDone: true,
    };
    await persist(u); await start(u);
  }, [persist, start]);

  const logout = useCallback(async () => {
    await clearReminders();
    if (userRef.current?.cloud) await Cloud.signOut().catch(() => {});
    await setSession(null); userRef.current = null; setUser(null); setCloud(freshCloud());
  }, []);

  /* Schritte: vom Gerät (iPhone-Bewegungssensor / Health Connect) und aus Apple Health per Kurzbefehl (Online-Konto).
   * Beim Start, beim Zurückkehren in die App und jede Minute im Vordergrund. Pro Tag zählt immer der höhere Wert. */
  const syncSteps = useCallback(async () => {
    const u = userRef.current; if (!u) return;
    const merged: Record<string, number> = {};
    const take = (k: string, v: number) => { if (v > (merged[k] || 0)) merged[k] = v; };
    if (u.health?.on && u.health.src !== 'sensor') {
      const days = await health.readDays(7).catch(() => ({} as Record<string, number>));
      for (const [k, v] of Object.entries(days)) take(k, v);
    }
    let fromShortcut = false;
    if (u.stepToken && u.cloud) {
      const rows = await Cloud.healthSteps(addDays(today(), -40)).catch(() => []);
      for (const r of rows) take(r.day, r.steps);
      fromShortcut = rows.length > 0;
    }
    update(x => {
      for (const [k, v] of Object.entries(merged)) if (v > (x.steps[k] || 0)) x.steps[k] = v;
      if (x.health?.on) x.health = { ...x.health, last: Date.now() };
      if (fromShortcut) x.shortcutLast = Date.now();
    });
  }, [update]);
  const connectHealth = useCallback(async () => {
    if (!(await health.available()) || !(await health.connect())) return false;
    update(x => { x.health = { on: true, src: 'device' }; });
    await syncSteps();
    return true;
  }, [update, syncSteps]);
  /** Android ohne Fitness-App: Schrittsensor des Handys */
  const connectSensor = useCallback(async () => {
    if (!(await sensor.available()) || !(await sensor.connect())) return false;
    update(x => { x.health = { on: true, src: 'sensor' }; });
    return true;
  }, [update]);
  const healthOn = !!user?.health?.on || !!(user?.stepToken && user?.cloud); const uid0 = user?.id;
  useEffect(() => {
    if (!healthOn) return;
    syncSteps();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') syncSteps(); });
    const id = setInterval(() => { if (AppState.currentState === 'active') syncSteps(); }, 60000);
    return () => { sub.remove(); clearInterval(id); };
  }, [healthOn, uid0, syncSteps]);

  /* Handy-Sensor live mitzählen, solange die App offen ist (in 10er-Schritten speichern) */
  const sensorOn = user?.health?.on && user.health.src === 'sensor';
  useEffect(() => {
    if (!sensorOn) return;
    let last = 0, pending = 0;
    const flush = () => {
      if (!pending) return; const add = pending; pending = 0;
      update(x => { const t = today(); x.steps[t] = (x.steps[t] || 0) + add; x.health = { on: true, src: 'sensor', last: Date.now() }; });
    };
    const stop = sensor.watch(n => { pending += Math.max(0, n - last); last = n; if (pending >= 10) flush(); });
    const id = setInterval(flush, 15000);
    return () => { stop(); clearInterval(id); flush(); };
  }, [sensorOn, uid0, update]);

  /* Erinnerungen mit aktuellem Stand neu planen (gebündelt, max. alle 5 s) */
  useEffect(() => {
    if (!user?.notify?.on) return;
    const id = setTimeout(() => { planReminders(user, cloud.friends, cloud.duels).catch(() => {}); }, 5000);
    return () => clearTimeout(id);
  }, [user, cloud.friends, cloud.duels]);

  const deleteAccount = useCallback(async () => {
    const u = userRef.current; if (!u) return;
    if (u.cloud) await Cloud.deleteAccount();
    await clearReminders();
    await deleteUser(u.id); await setSession(null);
    userRef.current = null; setUser(null); setCloud(freshCloud()); setAccounts(await listAccounts());
  }, []);

  /* FitCoins: neue Belohnungen aus den aktuellen Daten gutschreiben (gebündelt) */
  const [coinFlash, setCoinFlash] = useState<Store['coinFlash']>(null);
  useEffect(() => {
    if (!user) return;
    const id = setTimeout(() => {
      const u = userRef.current; if (!u) return;
      const add = pendingRewards(u, cloud.friends, cloud.duels);
      if (!add.length) return;
      update(x => { x.coins = [...(x.coins || []), ...add]; });
      const sum = add.reduce((s, t) => s + t.amount, 0);
      setCoinFlash({ amount: sum, text: add.length === 1 ? add[0].note || '' : `${add.length} Belohnungen`, id: Date.now() });
    }, 800);
    return () => clearTimeout(id);
  }, [user, cloud.friends, cloud.duels, update]);

  /* FitCoins online: lokale Buchungen an den Server melden, Duelle abrechnen, Kontostand holen.
   * Der Server legt Beträge und Preise selbst fest und lehnt Ungültiges ab. */
  const syncCoins = useCallback(async () => {
    const u = userRef.current; if (!u?.cloud) return;
    try {
      const open = (u.coins || []).filter(t => !t.synced);
      const earn = open.filter(t => ['start', 'training', 'steps', 'pr', 'streak', 'challenge'].includes(t.reason));
      if (earn.length) await Cloud.awardCoins(earn.map(t => ({ key: t.key, reason: t.reason, note: t.note })));
      for (const t of open.filter(x => x.reason === 'buy')) {
        await Cloud.spendCoins(t.key.split(':')[1] || '', t.key).catch(() => {});
      }
      if (open.length) {
        const done = new Set(open.map(t => t.key));
        update(x => { x.coins = (x.coins || []).map(t => (done.has(t.key) ? { ...t, synced: true } : t)); });
      }
      // beendete Online-Duelle abrechnen (Sieger +40 und Topf, idempotent)
      const ended = cloudRef.current.duels.filter(d => d.cloud && d.cloudId && d.end < today());
      await Promise.all(ended.map(d => Cloud.settleDuel(d.cloudId!).catch(() => null)));
      const coins = await Cloud.myCoins();
      setCloud(c => ({ ...c, coins, coinsErr: '' }));
    } catch (e) {
      const m = (e as Error).message;
      setCloud(c => ({ ...c, coins: null, coinsErr: /could not find|schema cache|does not exist/i.test(m) ? 'missing' : m }));
    }
  }, [update]);
  const cloudRef = useRef(cloud);
  useEffect(() => { cloudRef.current = cloud; syncCoinsRef.current = syncCoins; }, [cloud, syncCoins]);
  // neue lokale Belohnungen zeitnah melden
  const unsynced = (user?.coins || []).filter(t => !t.synced).length;
  useEffect(() => {
    if (!cloudUid || !unsynced) return;
    const id = setTimeout(() => { syncCoins(); }, 1500);
    return () => clearTimeout(id);
  }, [cloudUid, unsynced, syncCoins]);

  const buy = useCallback(async (itemId: string) => {
    const u = userRef.current; const it = SHOP.find(s => s.id === itemId);
    if (!u || !it) return 'Unbekannter Artikel';
    if (it.kind !== 'joker' && u.inv?.owned.includes(it.id)) return 'Schon gekauft';
    const online = !!u.cloud && cloudRef.current.coins != null;
    const bal = online ? cloudRef.current.coins!.balance : balance(u);
    if (bal < it.price) return 'Nicht genug FitCoins';
    const key = `buy:${it.id}:${Date.now()}`;
    if (online) {
      try { await Cloud.spendCoins(it.id, key); } catch (e) { return (e as Error).message; }
    }
    update(x => {
      x.coins = [...(x.coins || []), { key, amount: -it.price, reason: 'buy', at: Date.now(), note: it.name, synced: online }];
      const inv = x.inv || emptyInv();
      if (it.kind === 'joker') inv.jokers += 1;
      else { inv.owned = [...inv.owned, it.id]; if (it.kind === 'shirt') inv.shirt = it.id; else inv.frame = it.id; }
      x.inv = inv;
    });
    if (online) syncCoins();
    return null;
  }, [update, syncCoins]);
  const cheer = useCallback(async (friendUid: string, amount: number) => {
    try { await Cloud.sendCoins(friendUid, amount); await syncCoins(); return null; } catch (e) { return (e as Error).message; }
  }, [syncCoins]);
  const stake = useCallback(async (duelCloudId: string, amount: number) => {
    try { await Cloud.stakeDuel(duelCloudId, amount); await syncCoins(); return null; } catch (e) { return (e as Error).message; }
  }, [syncCoins]);
  const equip = useCallback((kind: 'shirt' | 'frame', itemId: string | undefined) => {
    update(x => { const inv = x.inv || emptyInv(); if (kind === 'shirt') inv.shirt = itemId; else inv.frame = itemId; x.inv = inv; });
  }, [update]);
  const applyJoker = useCallback((mon: string) => {
    update(x => { const inv = x.inv || emptyInv(); if (inv.jokers < 1 || inv.jokerWeeks.includes(mon)) return; inv.jokers -= 1; inv.jokerWeeks = [...inv.jokerWeeks, mon]; x.inv = inv; });
  }, [update]);

  const refreshCloud = useCallback(async () => {
    if (!userRef.current?.cloud) return;
    const [friends, duels] = await Promise.all([Cloud.friends(), Cloud.duels()]);
    setCloud(c => ({ ...c, friends, duels }));
  }, []);

  const value = useMemo<Store>(() => ({ ready, user, accounts, cloud, register, login, cloudLogin, logout, deleteAccount, update, connectHealth, connectSensor, syncSteps, refreshCloud, coinFlash, buy, equip, applyJoker, cheer, stake, syncCoins }),
    [ready, user, accounts, cloud, register, login, cloudLogin, logout, deleteAccount, update, connectHealth, connectSensor, syncSteps, refreshCloud, coinFlash, buy, equip, applyJoker, cheer, stake, syncCoins]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function normalize(u: User): User {
  return { ...u, seen: u.seen || {}, friends: u.friends || [], duels: u.duels || [], favorites: u.favorites || [], workouts: u.workouts || [], steps: u.steps || {}, water: u.water || {}, food: u.food || {}, weights: u.weights || [] };
}
