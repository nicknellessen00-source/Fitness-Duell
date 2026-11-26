import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { C, S } from '@/constants/theme';

/** Startbildschirm bei jedem Öffnen: Logo, Name und Leitsatz – blendet nach gut einer Sekunde aus */
export function StartSplash() {
  const [done, setDone] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));
  const [rise] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(reduce => {
      if (!alive) return;
      Animated.timing(rise, { toValue: 1, duration: reduce ? 0 : 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      Animated.sequence([
        Animated.delay(1300),
        Animated.timing(fade, { toValue: 0, duration: reduce ? 0 : 350, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => { if (alive) setDone(true); });
    });
    return () => { alive = false; };
  }, [fade, rise]);

  if (done) return null;
  const textStyle = { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] };
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', opacity: fade, zIndex: 1000 }]}
      pointerEvents="none" testID="startSplash" accessibilityLabel="FitDuell – Zeig deinen Freunden, was in dir steckt">
      <Svg width={120} height={120} viewBox="0 0 28 28">
        <Rect x="0" y="0" width="28" height="28" rx="7" fill={C.accent} />
        <Rect x="7" y="11" width="5" height="11" rx="1.5" fill={C.onAccent} />
        <Rect x="16" y="6" width="5" height="16" rx="1.5" fill={C.onAccent} />
      </Svg>
      <Animated.View style={[{ alignItems: 'center', gap: S[2], marginTop: S[6], paddingHorizontal: S[6] }, textStyle]}>
        <Text style={{ fontSize: 34, fontWeight: '700', color: C.text, letterSpacing: 0.3 }}>FitDuell</Text>
        <Text style={{ fontSize: 17, color: C.text2, textAlign: 'center' }}>Zeig deinen Freunden, was in dir steckt</Text>
      </Animated.View>
      <View style={{ position: 'absolute', bottom: 48, width: 40, height: 4, borderRadius: 2, backgroundColor: C.accentInk, opacity: 0.6 }} />
    </Animated.View>
  );
}
