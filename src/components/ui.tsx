import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import type { SFSymbol } from 'sf-symbols-typescript';
import {
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';

import { C, HIT, ICON, MaxContentWidth, MONO, R, S } from '@/constants/theme';
import { select } from '@/lib/haptics';
import { SF_FOR } from '@/lib/icons';
import { initials } from '@/lib/util';

/* ---------- Text ---------- */
type TxtProps = TextProps & { v?: 'title' | 'h3' | 'body' | 'small' | 'meta'; tone?: 'primary' | 'secondary' | 'muted'; color?: string; strong?: boolean; center?: boolean };
export function T({ v = 'body', tone = 'primary', color, strong, center, style, ...rest }: TxtProps) {
  const col = color ?? (tone === 'secondary' ? C.text2 : tone === 'muted' ? C.muted : C.text);
  return <Text accessibilityRole={v === 'title' ? 'header' : undefined} maxFontSizeMultiplier={v === 'title' ? 1.2 : 1.6}
    style={[st[v], { color: col }, strong && { fontWeight: '600' }, center && { textAlign: 'center' }, style]} {...rest} />;
}
/** Zahlen im Anzeigetafel-Stil: Monospace, feste Ziffernbreite */
export function Num({ children, size = 15, color = C.text, style, testID }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle>; testID?: string }) {
  return <Text testID={testID} maxFontSizeMultiplier={1.3} style={[{ fontFamily: MONO, fontSize: size, lineHeight: Math.round(size * 1.2), color, fontVariant: ['tabular-nums'] }, style]}>{children}</Text>;
}
/** Icon: auf dem iPhone das passende SF Symbol, sonst Lucide in gleicher Größe */
export function Icon({ icon: I, sf, filled, color = C.muted, size = ICON.size }: { icon: LucideIcon; sf?: SFSymbol; filled?: boolean; color?: string; size?: number }) {
  const fallback = <I size={size} color={color} strokeWidth={ICON.stroke} fill={filled ? color : 'transparent'} />;
  let name = sf ?? SF_FOR.get(I);
  if (Platform.OS !== 'ios' || !name) return fallback;
  if (filled && !name.endsWith('.fill')) name = (name + '.fill') as SFSymbol;
  return <SymbolView name={name} size={size} tintColor={color} weight="medium" fallback={fallback} />;
}

/* ---------- Layout ---------- */
export function Screen({ children, title, right, bottomInset = false }: { children: ReactNode; title?: string; right?: ReactNode; bottomInset?: boolean }) {
  const ins = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingTop: ins.top + S[4], paddingBottom: (bottomInset ? ins.bottom : 0) + S[10] }}>
      <View style={{ width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: S[4], paddingHorizontal: S[4] }}>
        {title !== undefined && (
          <Row between style={{ minHeight: HIT }}>
            <T v="title" style={{ flex: 1 }} numberOfLines={1}>{title}</T>
            {right}
          </Row>
        )}
        {children}
      </View>
    </ScrollView>
  );
}
export const Row = ({ children, style, between, wrap, gap = S[2] }: { children: ReactNode; style?: StyleProp<ViewStyle>; between?: boolean; wrap?: boolean; gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, between && { justifyContent: 'space-between' }, wrap && { flexWrap: 'wrap' }, style]}>{children}</View>
);
export function Card({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return <View style={[st.card, style]} testID={testID}>{children}</View>;
}
export const Divider = () => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.lineStrong }} />;

/* ---------- Bedienelemente ---------- */
type BtnProps = Omit<PressableProps, 'style' | 'children'> & { title: string; kind?: 'primary' | 'secondary' | 'quiet' | 'danger'; small?: boolean; icon?: LucideIcon; style?: StyleProp<ViewStyle>; grow?: boolean };
export function Btn({ title, kind = 'secondary', small, icon, style, grow, disabled, ...rest }: BtnProps) {
  const fg = kind === 'primary' ? C.onAccent : kind === 'danger' ? C.bad : kind === 'quiet' ? C.text2 : C.text;
  return (
    <Pressable accessibilityRole="button" disabled={disabled} hitSlop={small ? (HIT - 36) / 2 : undefined} {...rest}
      style={({ pressed }) => [st.btn, small && st.btnSm,
        kind === 'primary' && { backgroundColor: C.accent, borderColor: C.accent },
        kind === 'quiet' && { backgroundColor: 'transparent', borderColor: 'transparent' },
        grow && { flex: 1 }, disabled && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.98 }], opacity: 0.85 }, style]}>
      {icon && <Icon icon={icon} color={fg} size={small ? 16 : ICON.size} />}
      <Text style={[st.btnTxt, small && { fontSize: 15 }, { color: fg }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{title}</Text>
    </Pressable>
  );
}
export function Field({ label, style, ...rest }: TextInputProps & { label: string; style?: StyleProp<TextStyle> }) {
  return (
    <View style={{ gap: S[1] + 2, flex: 1, minWidth: 0 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput placeholderTextColor={C.muted} style={[st.input, style]} {...rest} />
    </View>
  );
}
export function Seg<K extends string | number>({ items, value, onChange }: { items: [K, string][]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={st.seg}>
      {items.map(([k, l]) => (
        <Pressable key={String(k)} onPress={() => { if (value !== k) select(); onChange(k); }} accessibilityRole="tab" accessibilityState={{ selected: value === k }}
          style={[st.segBtn, value === k && st.segOn]}>
          <Text style={{ color: value === k ? C.text : C.text2, fontWeight: value === k ? '600' : '500', fontSize: 13 }} numberOfLines={1} maxFontSizeMultiplier={1.3}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}
/** Fortschritt als Laufbahn: dicke Spur, Markierungen bei 25/50/75 % */
export function Track({ value, max, color = C.accentInk, height = 8, ticks = false }: { value: number; max: number; color?: string; height?: number; ticks?: boolean }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <View style={{ height, backgroundColor: C.raised, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: height / 2 }} />
      {ticks && [25, 50, 75].map(p => <View key={p} style={{ position: 'absolute', left: `${p}%`, top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: C.bg }} />)}
    </View>
  );
}
export function Ring({ value, max, size = 88, color = C.text }: { value: number; max: number; size?: number; color?: string }) {
  const sw = 6, r = (size - sw) / 2, circ = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.raised} strokeWidth={sw} fill="none" />
      {pct > 0 && <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
    </Svg>
  );
}
/** Profilbild mit Initialen; optional mit Rahmen aus dem FitCoins-Shop */
export function Avatar({ name, color, size = 36, frame }: { name: string; color: string; size?: number; frame?: string }) {
  const inner = (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.onAccent, fontWeight: '600', fontSize: Math.round(size * 0.36) }}>{initials(name)}</Text>
    </View>
  );
  if (!frame) return inner;
  return <View style={{ padding: 2, borderRadius: size / 2 + 4, borderWidth: 2, borderColor: frame }}>{inner}</View>;
}
/** Startnummer: Platzierung in einer kleinen Box */
export function Bib({ n, lead }: { n: number; lead?: boolean }) {
  return (
    <View style={{ width: 32, height: 28, borderRadius: R.small, borderWidth: 1, borderColor: lead ? C.accent : C.lineStrong, backgroundColor: lead ? C.accent : C.raised, alignItems: 'center', justifyContent: 'center' }}>
      <Num size={14} color={lead ? C.onAccent : C.text}>{n}</Num>
    </View>
  );
}
/** Wertezeile: Bezeichnung links, Zahl rechts */
export function ValueRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Row between style={{ minHeight: 32 }}>
      <T v="small" tone="secondary">{label}</T>
      <Num color={accent ? C.accentInk : C.text}>{value}</Num>
    </Row>
  );
}
/** Logo: zwei Balken gegeneinander, flach in Lime, dazu der Schriftzug */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Row gap={S[2]}>
      <Svg width={size} height={size} viewBox="0 0 28 28">
        <Rect x="0" y="0" width="28" height="28" rx="7" fill={C.accent} />
        <Rect x="7" y="11" width="5" height="11" rx="1.5" fill={C.onAccent} />
        <Rect x="16" y="6" width="5" height="16" rx="1.5" fill={C.onAccent} />
      </Svg>
      <Text style={{ color: C.text, fontSize: size * 0.72, fontWeight: '600' }}>FitDuell</Text>
    </Row>
  );
}

const st = StyleSheet.create({
  title: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  small: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  meta: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: S[4], gap: S[3] },
  btn: { minHeight: 50, paddingHorizontal: S[5], borderRadius: R.control + 2, borderWidth: 1, borderColor: 'transparent', backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: S[2] },
  btnSm: { minHeight: 36, paddingHorizontal: S[4], borderRadius: 18 },
  btnTxt: { fontSize: 17, fontWeight: '600', letterSpacing: -0.41 },
  label: { color: C.text2, fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  input: { height: HIT, borderRadius: R.control - 2, borderWidth: 0, backgroundColor: C.raised, color: C.text, paddingHorizontal: S[3], fontSize: 17 },
  seg: { flexDirection: 'row', backgroundColor: C.fill, borderRadius: 9, padding: 2 },
  segOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 32, paddingHorizontal: S[1], borderRadius: 7, borderWidth: 0 },
});
