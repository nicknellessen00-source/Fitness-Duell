/* Android: Schritte aus Health Connect (sammelt Daten von Handy, Uhr und Fitness-Apps) */
import { aggregateRecord, getGrantedPermissions, getSdkStatus, initialize, requestPermission, SdkAvailabilityStatus } from 'react-native-health-connect';

import { Pedometer } from 'expo-sensors';

import type { HealthSource, StepSensor } from './health.types';
import { dateKey } from './util';

let ready = false;
async function init() {
  if (ready) return true;
  const status = await getSdkStatus().catch(() => 0);
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  ready = await initialize().catch(() => false);
  return ready;
}

export const health: HealthSource = {
  label: 'Health Connect',
  available: init,
  async connect() {
    if (!(await init())) return false;
    const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]).catch(() => []);
    return granted.some(p => 'recordType' in p && p.recordType === 'Steps');
  },
  async readDays(days) {
    if (!(await init())) return {};
    const perms = await getGrantedPermissions().catch(() => []);
    if (!perms.some(p => 'recordType' in p && p.recordType === 'Steps')) return {};
    const out: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = i === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const r = await aggregateRecord({ recordType: 'Steps', timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() } }).catch(() => null);
      const n = r?.COUNT_TOTAL || 0;
      if (n > 0) out[dateKey(start)] = n;
    }
    return out;
  },
};

/** Ohne Fitness-App: Schrittsensor des Handys (zählt nur, solange FitDuell geöffnet ist) */
export const sensor: StepSensor = {
  available: () => Pedometer.isAvailableAsync().catch(() => false),
  async connect() { const p = await Pedometer.requestPermissionsAsync().catch(() => null); return !!p?.granted; },
  watch(cb) { const sub = Pedometer.watchStepCount(r => cb(r.steps)); return () => sub.remove(); },
};
