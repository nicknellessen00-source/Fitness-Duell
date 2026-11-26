import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { C, S } from '@/constants/theme';

import { Logo, Screen } from './ui';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen bottomInset>
        <View style={{ paddingTop: S[4], paddingBottom: S[2] }}><Logo /></View>
        {children}
      </Screen>
    </KeyboardAvoidingView>
  );
}
