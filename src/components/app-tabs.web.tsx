import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';

import { TABS } from './tabs-config';

type Tab = (typeof TABS)[number];

function TabButton({ tab, isFocused, ...props }: Omit<TabTriggerSlotProps, 'ref'> & { tab: Tab }) {
  return (
    <Pressable {...props} style={s.btn} accessibilityRole="tab" accessibilityState={{ selected: !!isFocused }} testID={'tab-' + tab.name}>
      <tab.icon size={24} strokeWidth={1.75} color={isFocused ? C.accentInk : C.muted} />
      <Text style={[s.lbl, { color: isFocused ? C.accentInk : C.muted }]} numberOfLines={1}>{tab.label}</Text>
    </Pressable>
  );
}

/** Web: eigene Leiste, fest am unteren Rand (wie in der PWA) */
export default function AppTabs() {
  const ins = useSafeAreaInsets();
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList asChild>
        <View style={StyleSheet.flatten([s.bar, { paddingBottom: Math.max(ins.bottom, 8) }])}>
          {TABS.map(t => (
            <TabTrigger key={t.name} name={t.name} href={t.href} asChild>
              <TabButton tab={t} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: 'rgba(249,249,249,0.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.lineStrong, paddingTop: 6 },
  btn: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, minHeight: 44 },
  lbl: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
});
