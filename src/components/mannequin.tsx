/* Trainingsfigur: trägt die Shop-Kleidung und wird mit dem Level kräftiger */
import { useEffect, useMemo, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { R } from '@/constants/theme';
import { useStore, useUser } from '@/context/app-store';
import { frameXml } from '@/lib/anim-native';
import { lookOf } from '@/lib/coins';
import { levelOf, type LevelInfo } from '@/lib/level';

/** Ausschnitt um die Figur (Hochformat) */
const VB = [55, 38, 130, 154];
const RATIO = VB[2] / VB[3];
const RELAX = { a1: [14, 10], a2: [14, 10], l1: [4, 0], l2: [4, 0] };
const BREATHE = { a1: [17, 14], a2: [17, 14], l1: [4, 0], l2: [4, 0], h: 1.5 };
const FLEX = { a1: [100, 200], a2: [100, 200], l1: [7, 0], l2: [7, 0] };

export function useLevel(): LevelInfo {
  const u = useUser(); const { cloud } = useStore();
  return useMemo(() => levelOf(u, cloud.matches || [], cloud.friends, cloud.duels), [u, cloud.matches, cloud.friends, cloud.duels]);
}

export interface Outfit { shirt?: string; shorts?: string; shoes?: string; band?: string }

export function Mannequin({ width = 220, animate = true, outfit, info, style }: { width?: number; animate?: boolean; outfit?: Outfit; info?: LevelInfo; style?: StyleProp<ViewStyle> }) {
  const u = useUser(); const own = useLevel();
  const lv = info || own;
  const look = useMemo(() => outfit || lookOf(u), [outfit, u]);
  const anim = useMemo(() => ({
    view: 'front', fixX: 'center', bulk: lv.bulk, gear: look.band ? { band: look.band } : null,
    ...(lv.pose === 'flex' ? { dur: 6, frames: [RELAX, BREATHE, FLEX, FLEX] } : { dur: 3.2, frames: [RELAX, BREATHE] }),
  }), [lv.bulk, lv.pose, look.band]);

  const [t, setT] = useState(lv.pose === 'flex' ? 3.3 : 0);
  useEffect(() => {
    if (!animate) return;
    let raf = 0, last = 0, acc = 0, time = 0;
    const tick = (now: number) => {
      if (last) { const dt = Math.min(0.1, (now - last) / 1000); time += dt; acc += dt; }
      last = now;
      if (acc >= 1 / 24) { acc = 0; setT(time); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  const xml = useMemo(() => {
    const x = frameXml(anim, t, look).replace('viewBox="0 0 240 200"', `viewBox="${VB.join(' ')}"`);
    return lv.level >= 12 ? x.replace('fill="#EEF0F3"', 'fill="#F7EDC8"') : x; // Champion: goldener Hintergrund
  }, [anim, t, look, lv.level]);
  return (
    <View style={[{ width, height: width / RATIO, borderRadius: R.card, overflow: 'hidden' }, style]} testID="mannequin">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}
