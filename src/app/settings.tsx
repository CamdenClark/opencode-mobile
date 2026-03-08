import { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ScrollView, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useServerConfig, ServerSettings } from '@/contexts/server-config';
import { sessionList } from '@/api/sdk.gen';
import { createClient } from '@/api/client';

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

async function testConnection(settings: ServerSettings): Promise<void> {
  const headers: Record<string, string> = {};
  if (settings.username || settings.password) {
    const credentials = btoa(`${settings.username || 'opencode'}:${settings.password || ''}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }
  const client = createClient({ baseUrl: settings.url, headers });
  const { error } = await sessionList({ client });
  if (error) throw new Error(String(error));
}

function useColors() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  return Colors[scheme];
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { settings, saveSettings, clearSettings, isLoading } = useServerConfig();

  const [url, setUrl] = useState(settings?.url ?? '');
  const [username, setUsername] = useState(settings?.username ?? '');
  const [password, setPassword] = useState(settings?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      Alert.alert('Server URL required', 'Please enter the URL of your opencode server.');
      return;
    }
    // Reflect normalization in the input
    setUrl(normalizedUrl);
    setSaving(true);
    try {
      const newSettings: ServerSettings = {
        url: normalizedUrl,
        username: username.trim() || undefined,
        password: password || undefined,
      };
      await testConnection(newSettings);
      await saveSettings(newSettings);
      if (isFirstSetup) {
        router.replace('/');
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Connection failed', `Could not reach the server.\n\n${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const isFirstSetup = !settings;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ gestureEnabled: !isFirstSetup }} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          {!isFirstSetup && (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          )}
          <ThemedText style={styles.title}>
            {isFirstSetup ? 'Connect to Server' : 'Server Settings'}
          </ThemedText>
        </View>

        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {isFirstSetup && (
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter the URL of your opencode server to get started.
            </ThemedText>
          )}

          <View style={styles.section}>
            <ThemedText style={[styles.label, { color: colors.textSecondary }]}>SERVER URL</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundElement }]}
              placeholder="http://192.168.1.100:4096"
              placeholderTextColor={colors.border}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={[styles.sectionHeader, { color: colors.textSecondary }]}>
              BASIC AUTH (OPTIONAL)
            </ThemedText>
            <ThemedText style={[styles.sectionNote, { color: colors.textSecondary }]}>
              Leave blank if your server doesn't require authentication.
            </ThemedText>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundElement }]}
              placeholder="Username (default: opencode)"
              placeholderTextColor={colors.border}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={[styles.passwordRow, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.border}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              (saving || isLoading) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving || isLoading}>
            <ThemedText style={styles.saveButtonText}>
              {saving ? 'Connecting...' : isFirstSetup ? 'Connect' : 'Save'}
            </ThemedText>
          </Pressable>

          {__DEV__ && !isFirstSetup && (
            <Pressable
              style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.6 }]}
              onPress={async () => {
                await clearSettings();
                router.replace('/');
              }}>
              <ThemedText style={styles.clearButtonText}>DEV: Clear settings</ThemedText>
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backButton: {
    padding: Spacing.one,
    marginRight: Spacing.one,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  section: {
    marginBottom: Spacing.five,
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: Spacing.three,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
  eyeButton: {
    padding: Spacing.three,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.six,
  },
  saveButtonPressed: {
    backgroundColor: '#0051D5',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 14,
  },
});
