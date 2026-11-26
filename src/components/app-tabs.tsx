import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { C } from '@/constants/theme';

import { TABS } from './tabs-config';

export default function AppTabs() {
  return (
    // iOS: Systemleiste (Liquid Glass) unverändert lassen, nur die Tint-Farbe setzen
    <NativeTabs tintColor={C.accentInk} {...(Platform.OS === 'android' ? { backgroundColor: C.card, indicatorColor: C.raised, iconColor: C.muted } : {})}
      labelStyle={{ default: { color: C.muted }, selected: { color: C.accentInk } }}>
      {TABS.map(t => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
