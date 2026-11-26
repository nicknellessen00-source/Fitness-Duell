import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

/* Markierte Bereiche für die Einführung: Die Tour misst sie aus und stellt sie im abgedunkelten Bildschirm frei. */
type Measurable = { measureInWindow(cb: (x: number, y: number, w: number, h: number) => void): void };
const refs = new Map<string, Measurable>();

export function Spot({ id, children, style }: { id: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View collapsable={false} style={style} ref={v => { if (v) refs.set(id, v as unknown as Measurable); else refs.delete(id); }}>
      {children}
    </View>
  );
}

export interface SpotRect { x: number; y: number; w: number; h: number }

/** Position im Fenster; null, wenn der Bereich (noch) nicht sichtbar ist */
export function measureSpot(id: string): Promise<SpotRect | null> {
  const v = refs.get(id);
  if (!v) return Promise.resolve(null);
  return new Promise(res => v.measureInWindow((x, y, w, h) => res(w > 0 && h > 0 ? { x, y, w, h } : null)));
}
