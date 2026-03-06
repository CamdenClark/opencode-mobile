import { StyleSheet, View, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, Colors } from '@/constants/theme';
import { sessionGetOptions, sessionMessagesOptions, sessionPromptAsyncMutation, sessionStatusOptions } from '@/api/@tanstack/react-query.gen';
import type { Message, Session, SessionStatus } from '@/api/types.gen';
import { createClient } from '@/api/client';
import type { Client, Config } from '@/api/client/types.gen';
import { useColorScheme } from 'react-native';
import { useState } from 'react';

const config: Config = {
  baseUrl: 'http://aphex.tail85c1ab.ts.net:4096',
};

const opencodeClient: Client = createClient(config);

function useBorderColor() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  return Colors[scheme].border;
}

function useInputColors() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  return {
    background: Colors[scheme].background,
    text: Colors[scheme].text,
    border: Colors[scheme].border,
  };
}

interface MessageItemProps {
  message: { info: Message; parts: any[] };
  borderColor: string;
}

function MessageItem({ message, borderColor }: MessageItemProps) {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const displayText = message.parts?.find((p: any) => p.type === 'text')?.text || '';

  return (
    <View style={[styles.messageItem, { borderBottomColor: borderColor }]}>
      <View style={styles.messageHeader}>
        <ThemedText type="small" style={styles.messageRole}>
          {message.info.role === 'user' ? 'You' : 'Assistant'}
        </ThemedText>
        <ThemedText type="small" style={styles.messageTime}>
          {formatTime(message.info.time.created)}
        </ThemedText>
      </View>
      <ThemedText style={styles.messageText}>
        {displayText}
      </ThemedText>
    </View>
  );
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams();
  const sessionId = id as string;
  const borderColor = useBorderColor();
  const inputColors = useInputColors();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');

  const { data: session, isLoading: sessionLoading } = useQuery({
    ...sessionGetOptions({ 
      client: opencodeClient, 
      path: { sessionID: sessionId } 
    }),
  });

  const { data: sessionStatuses } = useQuery({
    ...sessionStatusOptions({ client: opencodeClient }),
    refetchInterval: 1000,
  });

  const sessionStatus: SessionStatus | undefined = sessionStatuses?.[sessionId];
  const isSessionBusy = sessionStatus != null && sessionStatus.type !== 'idle';

  const { data: messages, isLoading: messagesLoading } = useQuery({
    ...sessionMessagesOptions({
      client: opencodeClient,
      path: { sessionID: sessionId },
    }),
    refetchInterval: isSessionBusy ? 1000 : false,
  });

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
                borderColor={borderColor} 
              />
            ))}
          </ScrollView>
          <View style={styles.inputContainer}>
            <View style={[
              styles.inputWrapper,
              {
                backgroundColor: inputColors.background,
                borderColor: inputColors.border,
              },
            ]}>
              <TextInput
                style={[
                  styles.input,
                  { color: inputColors.text },
                ]}
                placeholder="Type a message..."
                placeholderTextColor={inputColors.border}
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
    gap: 0,
  },
  messageItem: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  messageRole: {
    fontWeight: '600',
  },
  messageTime: {
    opacity: 0.6,
  },
  messageText: {
    lineHeight: 20,
  },
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