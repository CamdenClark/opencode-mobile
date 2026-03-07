import { useState, useMemo } from 'react';
import { View, Pressable, Modal, ScrollView, StyleSheet, useColorScheme } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { configGetOptions } from '@/api/@tanstack/react-query.gen';
import { createClient } from '@/api/client';
import type { Config, Client } from '@/api/client/types.gen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

const apiConfig: Config = {
  baseUrl: 'http://aphex.tail85c1ab.ts.net:4096',
};

const opencodeClient: Client = createClient(apiConfig);

interface AgentSelectorProps {
  value: string | null;
  onChange: (agent: string) => void;
}

function useColors() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'unspecified' ? 'light' : colorScheme;
  return Colors[scheme];
}

const AGENT_INFO: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; description: string }> = {
  build: {
    icon: 'hammer-outline',
    label: 'Build',
    description: 'Write code, fix bugs, and implement features',
  },
  plan: {
    icon: 'map-outline',
    label: 'Plan',
    description: 'Analyze codebases and create implementation plans',
  },
  general: {
    icon: 'chatbubble-outline',
    label: 'General',
    description: 'Answer questions without modifying code',
  },
};

function getAgentInfo(id: string) {
  return AGENT_INFO[id] || {
    icon: 'extension-puzzle-outline' as const,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    description: '',
  };
}

export function AgentSelector({ value, onChange }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const colors = useColors();

  const { data: config } = useQuery({
    ...configGetOptions({ client: opencodeClient }),
    staleTime: Infinity,
  });

  const agents = useMemo(() => {
    const agentMap = config?.agent || {};
    const ids = new Set<string>(['build', 'plan', 'general']);
    for (const key of Object.keys(agentMap)) {
      const agent = agentMap[key];
      if (agent && !agent.disable && agent.mode !== 'subagent') {
        ids.add(key);
      }
    }
    return Array.from(ids);
  }, [config]);

  const defaultAgent = config?.default_agent || 'build';
  const currentAgent = value || defaultAgent;
  const { icon, label } = getAgentInfo(currentAgent);

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}>
        <Ionicons name={icon} size={16} color={colors.textSecondary} />
        <ThemedText style={[styles.triggerText, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </ThemedText>
        <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Select Agent</ThemedText>
            <Pressable onPress={() => setOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll}>
            {agents.map((agentId) => {
              const info = getAgentInfo(agentId);
              const isSelected = currentAgent === agentId;
              return (
                <Pressable
                  key={agentId}
                  style={[
                    styles.agentRow,
                    { borderColor: colors.border },
                    isSelected && { backgroundColor: colors.backgroundElement },
                  ]}
                  onPress={() => {
                    onChange(agentId);
                    setOpen(false);
                  }}>
                  <Ionicons name={info.icon} size={22} color={isSelected ? '#007AFF' : colors.text} />
                  <View style={styles.agentInfo}>
                    <ThemedText style={[styles.agentName, isSelected && { color: '#007AFF' }]}>
                      {info.label}
                    </ThemedText>
                    {info.description ? (
                      <ThemedText style={[styles.agentDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {info.description}
                      </ThemedText>
                    ) : null}
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color="#007AFF" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: Spacing.one,
  },
  agentInfo: {
    flex: 1,
    gap: 2,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  agentDesc: {
    fontSize: 13,
  },
});
