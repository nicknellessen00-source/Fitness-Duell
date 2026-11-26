/* Web: keine automatische Schrittquelle – Schritte werden von Hand eingetragen */
import type { HealthSource, StepSensor } from './health.types';

export const health: HealthSource = {
  label: 'Schrittzähler',
  available: async () => false,
  connect: async () => false,
  readDays: async () => ({}),
};

/** Kein zusätzlicher Live-Sensor nötig bzw. möglich */
export const sensor: StepSensor = { available: async () => false, connect: async () => false, watch: () => () => {} };
