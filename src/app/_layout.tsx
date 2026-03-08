import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { QueryProvider } from '@/providers/query-provider';
import { ThemedView } from '@/components/themed-view';
import { ProviderPrefetch } from '@/components/provider-prefetch';
import { ServerConfigProvider } from '@/contexts/server-config';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ServerConfigProvider>
          <QueryProvider>
            <ProviderPrefetch />
            <ThemedView style={{ flex: 1 }}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  animationDurationInMs: 200,
                  contentStyle: { backgroundColor: 'transparent' },
                }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="session/[id]" />
                <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </ThemedView>
          </QueryProvider>
        </ServerConfigProvider>
      </ThemeProvider>
    </>
  );
}
