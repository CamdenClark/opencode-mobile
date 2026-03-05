import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { sessionListOptions } from '@/api/@tanstack/react-query.gen';
import type { Session } from '@/api/types.gen';
import { createClient } from '@/api/client';
import type { Client, Config } from '@/api/client/types.gen';

const config: Config = {
  baseUrl: 'http://aphex.tail85c1ab.ts.net:4096',
};

const opencodeClient: Client = createClient(config);

interface SessionItemProps {
  session: Session;
}

function SessionItem({ session }: SessionItemProps) {
  const date = new Date(session.time.created).toLocaleDateString();
  const time = new Date(session.time.created).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ThemedView style={styles.sessionCard}>
      <ThemedText type="subtitle" style={styles.sessionTitle}>
        {session.title}
      </ThemedText>
      <View style={styles.sessionMeta}>
        <ThemedText type="small" style={styles.slug}>
          {session.slug}
        </ThemedText>
        <ThemedText type="small" style={styles.sessionTime}>
          {date} at {time}
        </ThemedText>
      </View>
      <ThemedText type="small" style={styles.sessionDetails}>
        {session.directory}
      </ThemedText>
    </ThemedView>
  );
}

export default function SessionsScreen() {
  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery({
    ...sessionListOptions({ client: opencodeClient }),
  });

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
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Sessions
        </ThemedText>
        <ThemedText type="small" style={styles.count}>
          {sessionList?.length ?? 0} session{(sessionList?.length ?? 0) !== 1 ? 's' : ''}
        </ThemedText>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {sessionList?.map((session) => (
            <SessionItem key={session.id} session={session} />
          ))}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    textAlign: 'left',
    marginBottom: Spacing.one,
  },
  count: {
    marginBottom: Spacing.three,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  sessionCard: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: Spacing.one,
  },
  sessionTitle: {
    marginBottom: Spacing.one,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slug: {
    fontFamily: 'monospace',
  },
  sessionTime: {
    opacity: 0.7,
  },
  sessionDetails: {
    opacity: 0.6,
    marginTop: Spacing.one,
  },
  errorText: {
    color: '#ff6b6b',
  },
  loadingText: {
    fontSize: 16,
  },
});