/* Erinnerungen als lokale Mitteilungen – werden bei jeder Änderung neu geplant, damit der Text den aktuellen Stand zeigt */
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { DUEL_TYPES } from './data';
import { digestOf, duelState, weekStats } from './logic';
import type { Digest, Duel, User } from './types';
import { addDays, mondayOf, nf, parseKey, today } from './util';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export const notifySupported = true;
export const clearReminders = () => Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

export async function enableNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', { name: 'Erinnerungen', importance: AndroidImportance.DEFAULT });
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

const at = (dayKey: string, h: number, m = 0) => { const d = parseKey(dayKey); d.setHours(h, m, 0, 0); return d; };

/** Alle FitDuell-Erinnerungen neu planen */
export async function planReminders(u: User, cloudFriends: Digest[], cloudDuels: Duel[]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!u.notify?.on) return;
  const now = Date.now(); const jobs: { date: Date; title: string; body: string }[] = [];

  // Wochen-Challenge: Samstag 11 Uhr und Sonntag 18 Uhr, falls noch offen
  const mon = mondayOf(today()); const ws = weekStats(digestOf(u), mon);
  if (!ws.done) {
    const rest = `${nf(Math.max(0, ws.ch.target - ws.prog))} ${ws.ch.unit}`;
    jobs.push({ date: at(addDays(mon, 5), 11), title: `Noch ${rest} bis zur Wochen-Challenge`, body: `„${ws.ch.title}“ endet morgen. Verpasst kostet Punkte in der Rangliste.` });
    jobs.push({ date: at(addDays(mon, 6), 18), title: 'Letzte Chance für die Wochen-Challenge', body: `Dir fehlen noch ${rest} für „${ws.ch.title}“.` });
  }
  // Nächste Woche: neue Challenge am Montag 8 Uhr
  jobs.push({ date: at(addDays(mon, 7), 8), title: 'Neue Wochen-Challenge', body: 'Eine neue Aufgabe wartet – hol dir die Punkte zuerst.' });

  // Duelle: am Vortag des Endes
  for (const d of [...u.duels, ...cloudDuels]) {
    if (d.end < today()) continue;
    const st = duelState(u, d, cloudFriends); const name = (st.fdg?.name || 'deinen Freund').replace(' (Demo)', '');
    const lead = st.me > st.them ? 'Du führst knapp – bleib dran.' : st.me < st.them ? 'Du liegst hinten – jetzt aufholen.' : 'Gleichstand – jede Einheit zählt.';
    jobs.push({ date: at(addDays(d.end, -1), 17), title: `Duell gegen ${name} endet morgen`, body: `${DUEL_TYPES[d.type]?.label}: ${lead}` });
  }

  for (const j of jobs.filter(x => x.date.getTime() > now + 60000)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: j.title, body: j.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.date, ...(Platform.OS === 'android' ? { channelId: 'reminders' } : {}) },
    });
  }
}
