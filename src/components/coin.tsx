import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { C, S } from '@/constants/theme';
import { useStore } from '@/context/app-store';
import { balance } from '@/lib/coins';
import { nf } from '@/lib/util';

import { Num, T } from './ui';

/** FitCoin: Münze in Lime mit den zwei Logo-Balken */
export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="11" fill={C.accent} stroke={C.accentInk} strokeWidth="1.5" />
      <Path d="M8.3 15.5v-3.6M14.8 15.5V8.5" stroke={C.onAccent} strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}

/** Kontostand und Verlauf: online vom Server, sonst vom Gerät */
export function useCoins() {
  const { user, cloud } = useStore();
  const online = !!user?.cloud && cloud.coins != null;
  return {
    online,
    balance: online ? cloud.coins!.balance : user ? balance(user) : 0,
    ledger: online ? cloud.coins!.ledger : [...(user?.coins || [])].sort((a, b) => b.at - a.at).slice(0, 40),
    serverMissing: !!user?.cloud && cloud.coinsErr === 'missing',
  };
}

/** Kontostand als kleine Pille – führt zum FitCoins-Bildschirm */
export function CoinBadge() {
  const { user } = useStore();
  const { balance: bal } = useCoins();
  if (!user) return null;
  return (
    <Pressable onPress={() => router.push('/coins')} accessibilityLabel={`${bal} FitCoins`} testID="coinBadge" hitSlop={6}
      style={{ flexDirection: 'row', alignItems: 'center', gap: S[1] + 2, height: 32, paddingHorizontal: S[3], borderRadius: 16, backgroundColor: C.card }}>
      <CoinIcon />
      <Num size={14}>{nf(bal)}</Num>
    </Pressable>
  );
}

/** Kurze Einblendung „+10 FitCoins“ */
export function CoinToast() {
  const { coinFlash } = useStore();
  const [shown, setShown] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  if (coinFlash && coinFlash.id !== shown) { setShown(coinFlash.id); setVisible(true); }
  useEffect(() => { if (!visible) return; const t = setTimeout(() => setVisible(false), 3200); return () => clearTimeout(t); }, [visible, shown]);
  if (!visible || !coinFlash) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', bottom: 104, left: 0, right: 0, alignItems: 'center' }} testID="coinToast">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S[2], paddingVertical: S[2], paddingHorizontal: S[4], borderRadius: 22, backgroundColor: C.text, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
        <CoinIcon size={20} />
        <T v="small" strong color="#fff">+{nf(coinFlash.amount)} FitCoins</T>
        {!!coinFlash.text && <T v="small" color="rgba(255,255,255,0.7)" numberOfLines={1} style={{ maxWidth: 160 }}>{coinFlash.text}</T>}
      </View>
    </View>
  );
}
