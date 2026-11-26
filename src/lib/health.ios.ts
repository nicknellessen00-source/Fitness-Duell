/* iPhone: Schritte aus dem Bewegungsprozessor (Core Motion) – die gleiche Quelle, die auch Apple Health für das iPhone nutzt.
 * Bis zu 7 Tage rückwirkend, ohne Health-Freigabe; iOS fragt einmal nach „Bewegung & Fitness“. */
import { Pedometer } from 'expo-sensors';

import type { HealthSource, StepSensor } from './health.types';
import { dateKey } from './util';

export const health: HealthSource = {
  label: 'iPhone-Schrittzähler',
  available: () => Pedometer.isAvailableAsync().catch(() => false),
  async connect() {
    const p = await Pedometer.requestPermissionsAsync().catch(() => null);
    return !!p?.granted;
  },
  async readDays(days) {
    const out: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < Math.min(days, 7); i++) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = i === 0 ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
      const r = await Pedometer.getStepCountAsync(start, end).catch(() => null);
      if (r && r.steps > 0) out[dateKey(start)] = r.steps;
    }
    return out;
  },
};

/** Kein zusätzlicher Live-Sensor nötig bzw. möglich */
export const sensor: StepSensor = { available: async () => false, connect: async () => false, watch: () => () => {} };
