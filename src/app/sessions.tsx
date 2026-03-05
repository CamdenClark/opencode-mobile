import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, Colors } from '@/constants/theme';
import { sessionListOptions } from '@/api/@tanstack/react-query.gen';
import type { Session } from '@/api/types.gen';
import { createClient } from '@/api/client';
import type { Client, Config } from '@/api/client/types.gen';

const config: Config = {
  baseUrl: 'http://aphex.tail85c1ab.ts.net:4096',
};

const opencodeClient: Client = createClient(config);

function getBorderColor() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  return Colors[scheme].border;
}

interface SessionItemProps {
  session: Session;
  borderColor: string;
}

function SessionItem({ session, borderColor }: SessionItemProps) {
  const date = new Date(session.time.created).toLocaleDateString();
  const time = new Date(session.time.created).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ThemedView style={[styles.sessionCard, { borderBottomColor: borderColor }]}>
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
  const borderColor = getBorderColor();

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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="headline" style={styles.title}>
            Sessions
          </ThemedText>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {sessionList?.map((session) => (
            <SessionItem key={session.id} session={session} borderColor={borderColor} />
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
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  title: {
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    gap: 0,
  },
  sessionCard: {
    padding: Spacing.four,
    gap: Spacing.one,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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