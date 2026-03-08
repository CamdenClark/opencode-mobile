import { StyleSheet, View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, Colors } from '@/constants/theme';
import { sessionListOptions, sessionCreateMutation } from '@/api/@tanstack/react-query.gen';
import type { Session } from '@/api/types.gen';
import { router, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useServerConfig } from '@/contexts/server-config';

function useColors() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  return Colors[scheme];
}

function useBorderColor() {
  const colors = useColors();
  return colors.border;
}

interface SessionItemProps {
  session: Session;
  borderColor: string;
}

function SessionItem({ session, borderColor }: SessionItemProps) {
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.sessionCard,
        { borderBottomColor: borderColor },
        pressed && styles.sessionCardPressed,
      ]}
      onPress={() => router.push(`/session/${session.id}`)}
    >
      <ThemedText type="default" style={styles.sessionTitle} numberOfLines={1}>
        {session.title}
      </ThemedText>
      <View style={styles.sessionMeta}>
        <ThemedText type="small" style={styles.sessionTime}>
          {getRelativeTime(session.time.created)}
        </ThemedText>
        {session.directory !== '/' && session.directory && (
          <ThemedText type="small" style={styles.directory}>
            {session.directory}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export default function SessionsScreen() {
  const borderColor = useBorderColor();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { client, isLoading: configLoading } = useServerConfig();

  const {
    data: sessions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    ...sessionListOptions({ client: client! }),
    enabled: !!client,
  });

  const createSessionMutation = useMutation({
    ...sessionCreateMutation({ client: client! }),
    onSuccess: () => {
      const options = sessionListOptions({ client: client! });
      queryClient.invalidateQueries({
        queryKey: options.queryKey,
      });
    },
  });

  const handleNewSession = () => {
    createSessionMutation.mutate({ client: client! } as any, {
      onSuccess: (data) => {
        router.push(`/session/${data.id}`);
      },
    });
  };

  const onRefresh = async () => {
    await refetch();
  };

  if (configLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator style={{ marginTop: 40 }} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!client) {
    return <Redirect href="/settings" />;
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.loadingText}>Loading sessions...</Text>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Text style={styles.errorText}>
            Error: {error instanceof Error ? error.message : 'Failed to fetch sessions'}
          </Text>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const sessionList = sessions as Session[] | undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            Sessions
          </ThemedText>
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.6 }]}
            onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={borderColor}
            />
          }>
          {sessionList?.map((session) => (
            <SessionItem key={session.id} session={session} borderColor={borderColor} />
          ))}
        </ScrollView>
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            createSessionMutation.isPending && styles.fabDisabled,
            pressed && styles.fabPressed,
          ]}
          onPress={handleNewSession}
          disabled={createSessionMutation.isPending}>
          <Text style={styles.fabText}>
            {createSessionMutation.isPending ? '...' : '+'}
          </Text>
        </Pressable>
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    textAlign: 'left',
    flex: 1,
  },
  settingsButton: {
    padding: Spacing.one,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.six,
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabPressed: {
    backgroundColor: '#0051D5',
  },
  fabDisabled: {
    backgroundColor: '#999999',
  },
  fabText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    gap: 0,
  },
  sessionCard: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionCardPressed: {
    opacity: 0.7,
  },
  sessionTitle: {
    marginBottom: Spacing.one,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTime: {
    opacity: 0.6,
  },
  directory: {
    opacity: 0.5,
  },
  errorText: {
    color: '#ff6b6b',
  },
  loadingText: {
    fontSize: 16,
  },
});
