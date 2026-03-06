import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { QueryProvider } from '@/providers/query-provider';
import { ThemedView } from '@/components/themed-view';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <QueryProvider>
          <ThemedView style={{ flex: 1 }}>
            <Stack 
              screenOptions={{ 
                headerShown: false,
                animation: 'fade',
                animationDurationInMs: 200,
                contentStyle: { backgroundColor: 'transparent' },
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="sessions" />
              <Stack.Screen name="session/[id]" />
            </Stack>
          </ThemedView>
        </QueryProvider>
      </ThemeProvider>
    </>
  );
}
