import { GeistMono_500Medium, useFonts } from '@expo-google-fonts/geist-mono';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { C } from '@/constants/theme';
import { StoreProvider, useStore } from '@/context/app-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: C.bg, card: C.deep, primary: C.accent, text: C.text, border: C.line } };

function RootStack() {
  const { ready: storeReady, user } = useStore();
  const [fontsLoaded, fontError] = useFonts({ GeistMono_500Medium });
  const ready = storeReady && (fontsLoaded || !!fontError);
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  const loggedIn = !!user;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={loggedIn} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="exercise/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="sport/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sport-live" />
        <Stack.Screen name="scan" options={{ presentation: 'modal' }} />
        <Stack.Screen name="label" options={{ presentation: 'modal' }} />
        <Stack.Screen name="food-search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="duel-new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="health-setup" options={{ presentation: 'modal' }} />
        <Stack.Screen name="coins" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cheer" options={{ presentation: 'modal' }} />
        <Stack.Screen name="duel/[id]" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Screen name="datenschutz" options={{ presentation: 'modal' }} />
      <Stack.Protected guard={!loggedIn} redirectTo="/">
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StoreProvider>
          <StatusBar style="dark" />
          <RootStack />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
