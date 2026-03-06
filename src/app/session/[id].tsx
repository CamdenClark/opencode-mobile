import { StyleSheet, View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, Colors, Fonts } from '@/constants/theme';
import { sessionGetOptions, sessionMessagesOptions, sessionPromptAsyncMutation } from '@/api/@tanstack/react-query.gen';
import type { Message, Part, ToolPart, ReasoningPart, TextPart } from '@/api/types.gen';
import { createClient } from '@/api/client';
import type { Client, Config } from '@/api/client/types.gen';
import { useColorScheme } from 'react-native';
import { useState } from 'react';
import { useStreamingMessages } from '@/hooks/use-streaming-messages';

const config: Config = {
  baseUrl: 'http://aphex.tail85c1ab.ts.net:4096',
};

const opencodeClient: Client = createClient(config);

function useColors() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  return Colors[scheme];
}

function ToolCallItem({ part }: { part: ToolPart }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();
  const status = part.state.status;
  const statusIcon = status === 'completed' ? 'checkmark-circle' :
                     status === 'error' ? 'close-circle' :
                     status === 'running' ? 'ellipsis-horizontal-circle' : 'time';
  const statusColor = status === 'completed' ? '#34C759' :
                      status === 'error' ? '#FF3B30' :
                      status === 'running' ? '#FF9500' : colors.textSecondary;
  const title = ('title' in part.state && part.state.title) ? part.state.title : part.tool;

  return (
    <View style={[styles.toolCall, { backgroundColor: colors.backgroundElement }]}>
      <Pressable
        style={styles.toolCallHeader}
        onPress={() => setExpanded(!expanded)}>
        <Ionicons name={statusIcon} size={16} color={statusColor} />
        <ThemedText type="small" style={styles.toolCallName} numberOfLines={1}>
          {title}
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded && (
        <View style={styles.toolCallBody}>
          {part.state.input && Object.keys(part.state.input).length > 0 && (
            <ThemedText type="small" style={[styles.toolCallContent, { fontFamily: Fonts.mono }]}>
              {JSON.stringify(part.state.input, null, 2)}
            </ThemedText>
          )}
          {'output' in part.state && part.state.output && (
            <ThemedText type="small" style={[styles.toolCallContent, { fontFamily: Fonts.mono, marginTop: Spacing.one }]}>
              {part.state.output.length > 500 ? part.state.output.slice(0, 500) + '...' : part.state.output}
            </ThemedText>
          )}
          {'error' in part.state && part.state.error && (
            <ThemedText type="small" style={[styles.toolCallContent, { color: '#FF3B30', marginTop: Spacing.one }]}>
              {part.state.error}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

function ThinkingBlock({ part }: { part: ReasoningPart }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();

  return (
    <View style={[styles.thinkingBlock, { borderLeftColor: colors.textSecondary }]}>
      <Pressable
        style={styles.thinkingHeader}
        onPress={() => setExpanded(!expanded)}>
        <Ionicons name="bulb-outline" size={14} color={colors.textSecondary} />
        <ThemedText type="small" style={{ color: colors.textSecondary }}>
          Thinking
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded && (
        <ThemedText type="small" style={styles.thinkingText}>
          {part.text}
        </ThemedText>
      )}
    </View>
  );
}

interface MessageItemProps {
  message: { info: Message; parts: Part[] };
}

function MessageItem({ message }: MessageItemProps) {
  const colors = useColors();
  const isUser = message.info.role === 'user';

  if (isUser) {
    const displayText = message.parts?.find((p) => p.type === 'text')?.text || '';
    return (
      <View style={styles.userMessageRow}>
        <View style={[styles.userBubble, { backgroundColor: '#007AFF' }]}>
          <ThemedText style={styles.userBubbleText}>
            {displayText}
          </ThemedText>
        </View>
      </View>
    );
  }

  // Assistant message: render parts sequentially, full width
  const parts = message.parts || [];
  const visibleParts = parts.filter((p) =>
    p.type === 'text' || p.type === 'tool' || p.type === 'reasoning'
  );

  if (visibleParts.length === 0) return null;

  return (
    <View style={styles.assistantMessage}>
      {visibleParts.map((part) => {
        if (part.type === 'reasoning') {
          return <ThinkingBlock key={part.id} part={part as ReasoningPart} />;
        }
        if (part.type === 'tool') {
          return <ToolCallItem key={part.id} part={part as ToolPart} />;
        }
        if (part.type === 'text') {
          const text = (part as TextPart).text;
          if (!text) return null;
          return (
            <ThemedText key={part.id} style={styles.assistantText}>
              {text}
            </ThemedText>
          );
        }
        return null;
      })}
    </View>
  );
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams();
  const sessionId = id as string;
  const colors = useColors();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');

  const { data: session, isLoading: sessionLoading } = useQuery({
    ...sessionGetOptions({
      client: opencodeClient,
      path: { sessionID: sessionId }
    }),
  });

  const { messages, isLoading: messagesLoading, sessionStatus } = useStreamingMessages(
    opencodeClient,
    sessionId
  );

  const promptMutation = useMutation({
    ...sessionPromptAsyncMutation({ client: opencodeClient }),
    onSuccess: () => {
      setInputText('');
    },
  });

  const messagesQueryKey = sessionMessagesOptions({
    client: opencodeClient,
    path: { sessionID: sessionId },
  }).queryKey;

  const handleSubmit = () => {
    const text = inputText || '';
    if (text.trim() && !promptMutation.isPending) {
      const now = Date.now();
      const tempId = `temp-${now}`;
      queryClient.setQueryData(messagesQueryKey, (old: any[] | undefined) => [
        ...(old || []),
        {
          info: {
            id: tempId,
            sessionID: sessionId,
            role: 'user',
            time: { created: now },
          },
          parts: [{ id: `${tempId}-part`, type: 'text', text: text.trim() }],
        },
      ]);
      promptMutation.mutate({
        client: opencodeClient,
        path: { sessionID: sessionId },
        body: {
          parts: [{ type: 'text', text: text.trim() }],
        },
      } as any);
    }
  };

  const canSubmit = (inputText || '').trim().length > 0 && !promptMutation.isPending;

  if (sessionLoading || messagesLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              Loading...
            </ThemedText>
          </View>
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>Loading session...</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 20}
          style={{ flex: 1 }}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              {session?.title || 'Session'}
            </ThemedText>
          </View>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {messages?.map((msg) => (
              <MessageItem
                key={msg.info.id}
                message={msg}
              />
            ))}
          </ScrollView>
          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text },
                ]}
                placeholder="Type a message..."
                placeholderTextColor={colors.border}
                value={inputText || ''}
                onChangeText={setInputText}
                multiline
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                  !canSubmit && styles.sendButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit}>
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={canSubmit ? '#007AFF' : '#999999'} 
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingBottom: Spacing.two,
  },
  title: {
    textAlign: 'left',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  // User bubble
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
  },
  userBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  userBubbleText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
  },
  // Assistant
  assistantMessage: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  assistantText: {
    fontSize: 16,
    lineHeight: 22,
  },
  // Tool calls
  toolCall: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  toolCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  toolCallName: {
    flex: 1,
    fontWeight: '600',
  },
  toolCallBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  toolCallContent: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.8,
  },
  // Thinking
  thinkingBlock: {
    borderLeftWidth: 2,
    paddingLeft: Spacing.three,
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  thinkingText: {
    marginTop: Spacing.one,
    lineHeight: 20,
    opacity: 0.7,
  },
  // Input
  inputContainer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 36,
    paddingVertical: Spacing.two,
    marginVertical: Spacing.one,
  },
  sendButton: {
    marginLeft: Spacing.two,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  sendButtonPressed: {
    opacity: 0.6,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  loadingText: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});