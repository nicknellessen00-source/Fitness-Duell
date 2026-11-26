import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import type { User } from './types';

export interface Account { id: string; name: string; color: string; email: string }

async function get<T>(k: string, d: T): Promise<T> {
  try { const v = await AsyncStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
}
async function set(k: string, v: unknown) {
  try { await AsyncStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

export const listAccounts = () => get<Account[]>('fx.users', []);
export const loadUser = (id: string) => get<User | null>('fx.u.' + id, null);
export const getSession = () => AsyncStorage.getItem('fx.session').catch(() => null);
export const setSession = (id: string | null) => (id ? AsyncStorage.setItem('fx.session', id) : AsyncStorage.removeItem('fx.session'));

export async function saveUser(u: User) {
  await set('fx.u.' + u.id, u);
  const list = await listAccounts();
  const entry: Account = { id: u.id, name: u.profile.name, color: u.profile.color, email: u.profile.email };
  const i = list.findIndex(x => x.id === u.id);
  if (i >= 0) list[i] = entry; else list.push(entry);
  await set('fx.users', list);
}

/** Konto und alle lokalen Daten vom Gerät entfernen */
export async function deleteUser(id: string) {
  await AsyncStorage.removeItem('fx.u.' + id);
  await set('fx.users', (await listAccounts()).filter(a => a.id !== id));
}

/** Gleiche Hash-Form wie die Web-App (SHA-256 über "salt:pw") */
export const hashPw = (pw: string, salt: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + pw);
