import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { R } from '@/constants/theme';
import { useStore } from '@/context/app-store';
import { SHIRT_DEFAULT, shirtColor } from '@/lib/coins';
import { ANIM_RATIO, frameXml, stillXml } from '@/lib/anim-native';

type Anim = { frames: unknown[]; dur?: number; stillAt?: number };

/** Standbild für Listen */
/** Shirt-Farbe aus dem Shop (oder Standard) */
function useShirt(override?: string) {
  const { user } = useStore();
  return override || (user ? shirtColor(user) : SHIRT_DEFAULT);
}

export function ExerciseThumb({ anim, width = 64, style, shirt }: { anim: unknown; width?: number; style?: StyleProp<ViewStyle>; shirt?: string }) {
  const color = useShirt(shirt);
  const xml = useMemo(() => stillXml(anim as Anim, color), [anim, color]);
  return (
    <View style={[{ width, height: width / ANIM_RATIO, borderRadius: R.small + 2, overflow: 'hidden' }, style]}>
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}

/** Abspielende Figur; läuft über die verstrichene Zeit, ~30 Bilder pro Sekunde */
export function ExercisePlayer({ anim, playing = true, speed = 1, shirt }: { anim: unknown; playing?: boolean; speed?: number; shirt?: string }) {
  const color = useShirt(shirt);
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = 0, acc = 0;
    const tick = (now: number) => {
      if (last) { const dt = Math.min(0.1, (now - last) / 1000); tRef.current += dt * speed; acc += dt; }
      last = now;
      if (acc >= 1 / 30) { acc = 0; setT(tRef.current); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);
  const xml = useMemo(() => frameXml(anim, t, color), [anim, t, color]);
  return (
    <View style={{ width: '100%', aspectRatio: ANIM_RATIO, maxHeight: 300, borderRadius: R.card, overflow: 'hidden', alignSelf: 'center' }} testID="animPlayer">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}
