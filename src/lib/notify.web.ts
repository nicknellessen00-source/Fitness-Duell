/* Web-Vorschau: keine Mitteilungen */
import type { Digest, Duel, User } from './types';

export const notifySupported = false;
export const clearReminders = async () => {};
export async function enableNotifications() { return false; }
export async function planReminders(_u: User, _f: Digest[], _d: Duel[]) { /* nur in der App */ }
