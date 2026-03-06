import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionMessagesOptions } from '@/api/@tanstack/react-query.gen';
import { useSessionEvents, type SessionEvent } from './use-session-events';
import type { SessionStatus, Message, Part, TextPart } from '@/api/types.gen';
import type { Client } from '@/api/client/types.gen';

type MessageWithParts = { info: Message; parts: Part[] };

export function useStreamingMessages(
  client: Client,
  sessionId: string
) {
  const queryClient = useQueryClient();
  const queryOpts = sessionMessagesOptions({
    client,
    path: { sessionID: sessionId },
  });

  const { data: cachedMessages, isLoading } = useQuery(queryOpts);

  const [deltas, setDeltas] = useState<Record<string, string>>({});
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    type: 'idle',
  });

  const onEvent = useCallback(
    (event: SessionEvent) => {
      switch (event.type) {
        case 'message.updated': {
          const msg: Message = event.properties.info;
          queryClient.setQueryData<MessageWithParts[]>(
            queryOpts.queryKey,
            (old) => {
              if (!old) return [{ info: msg, parts: [] }];
              const idx = old.findIndex((m) => m.info.id === msg.id);
              if (idx >= 0) {
                const updated = [...old];
                updated[idx] = { ...updated[idx], info: msg };
                return updated;
              }
              return [...old, { info: msg, parts: [] }];
            }
          );
          break;
        }

        case 'message.part.updated': {
          const part: Part = event.properties.part;
          queryClient.setQueryData<MessageWithParts[]>(
            queryOpts.queryKey,
            (old) => {
              if (!old) return old;
              return old.map((m) => {
                if (m.info.id !== part.messageID) return m;
                const partIdx = m.parts.findIndex((p) => p.id === part.id);
                const newParts =
                  partIdx >= 0
                    ? m.parts.map((p, i) => (i === partIdx ? part : p))
                    : [...m.parts, part];
                return { ...m, parts: newParts };
              });
            }
          );
          // Clear accumulated deltas for this part since we have the full state
          setDeltas((prev) => {
            const key = part.id;
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
          });
          break;
        }

        case 'message.part.delta': {
          const { partID, delta } = event.properties as {
            partID: string;
            delta: string;
          };
          setDeltas((prev) => ({
            ...prev,
            [partID]: (prev[partID] || '') + delta,
          }));
          break;
        }

        case 'session.status': {
          const status: SessionStatus = event.properties.status;
          setSessionStatus(status);
          if (status.type === 'idle') {
            queryClient.invalidateQueries({ queryKey: queryOpts.queryKey });
            setDeltas({});
          }
          break;
        }

        case 'session.error': {
          setSessionStatus({ type: 'idle' });
          queryClient.invalidateQueries({ queryKey: queryOpts.queryKey });
          setDeltas({});
          break;
        }
      }
    },
    [queryClient, queryOpts.queryKey]
  );

  useSessionEvents(sessionId, onEvent);

  const messages = useMemo(() => {
    if (!cachedMessages) return undefined;
    if (Object.keys(deltas).length === 0) return cachedMessages;

    return cachedMessages.map((msg) => {
      const updatedParts = msg.parts.map((part) => {
        const extra = deltas[part.id];
        if (!extra || part.type !== 'text') return part;
        return { ...part, text: (part as TextPart).text + extra };
      });

      // Check for orphan deltas — deltas for parts not yet in cache
      const existingPartIds = new Set(msg.parts.map((p) => p.id));
      const orphanEntries = Object.entries(deltas).filter(
        ([id]) => !existingPartIds.has(id)
      );
      // We can't create full parts from orphan deltas alone (no type info),
      // so we skip them — they'll be resolved when message.part.updated arrives

      if (updatedParts === msg.parts) return msg;
      return { ...msg, parts: updatedParts };
    });
  }, [cachedMessages, deltas]);

  return { messages, isLoading, sessionStatus };
}
