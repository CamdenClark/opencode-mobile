import { StyleSheet, View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useEffect, useState } from 'react';
import { sessionList, type Session } from '@/api';
import { createClient } from '@/api/client';

const client = createClient({
  baseUrl: 'http://aphex.tail85c1ab.ts.net:4096',
});

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await sessionList({ client });
        setSessions(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="default">Loading sessions...</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="default" style={styles.errorText}>
            Error: {error}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Sessions
        </ThemedText>
        <ThemedText type="small" style={styles.count}>
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </ThemedText>
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SessionItem session={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  listContent: {
    gap: Spacing.two,
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
});