import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Card, Label, Loading, Screen, T } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { GameProvider } from '@/providers/GameProvider';
import { colors, spacing } from '@/theme';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    primary: colors.violet,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        {isSupabaseConfigured ? (
          <AuthProvider>
            <GameProvider>
              <RootNavigator />
            </GameProvider>
          </AuthProvider>
        ) : (
          <SetupNeeded />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading />
      </View>
    );
  }

  const detail = {
    headerShown: true,
    headerTransparent: false,
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.text,
    headerShadowVisible: false,
    title: '',
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="daily" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="reveal/[id]" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="scenario/[id]" options={detail} />
        <Stack.Screen name="compare/[id]" options={{ ...detail, title: 'Life vs. Life' }} />
        <Stack.Screen name="share/[id]" options={{ ...detail, title: 'Share' }} />
        <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function SetupNeeded() {
  return (
    <Screen>
      <Label>PARALLEL · setup</Label>
      <T variant="h1">Connect Supabase</T>
      <T color={colors.textMuted}>
        The app can't find your Supabase keys. Create a file named .env in the project root with:
      </T>
      <Card style={{ gap: spacing.xs }}>
        <T variant="small" style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co</T>
        <T variant="small" style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key</T>
      </Card>
      <T color={colors.textMuted}>
        Then stop the dev server and run "npx expo start --clear". See README.md for the full Supabase setup guide.
      </T>
    </Screen>
  );
}
