import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { AuthProvider, useAuth } from '@/context/auth.context';
import { initDB } from '@/db/migrations';
import { hasUser } from '@/db/repositories/user.repo';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Runs DB init and performs auth-based redirects. Must be inside AuthProvider. */
function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isLoggedIn, isFirstRun, setFirstRun } = useAuth();
  const router = useRouter();
  
  // Initialise DB and determine first-run state once on mount.
  useEffect(() => {
    (async () => {
      await initDB();
      const userExists = await hasUser();
      setFirstRun(!userExists);
    })();
  }, [setFirstRun]);

  // Redirect whenever auth state changes.
  useEffect(() => {
    if (isFirstRun === null) return; // Still loading — wait.
    if (isFirstRun) {
      router.replace('/(auth)/setup');
    } else if (!isLoggedIn) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isFirstRun, router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="new-transaction"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

