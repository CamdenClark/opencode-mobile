import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionMessagesOptions, sessionStatusOptions, permissionListOptions, permissionListQueryKey } from '@/api/@tanstack/react-query.gen';
import type { Client } from '@/api/client/types.gen';
import type { PermissionRequest } from '@/api/types.gen';

export function useStreamingMessages(
  client: Client,
  sessionId: string
) {
  const queryClient = useQueryClient();
  const messagesQueryKey = sessionMessagesOptions({
    client,
    path: { sessionID: sessionId },
  }).queryKey;

  const statusQuery = useQuery({
    ...sessionStatusOptions({ client }),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      const status = data[sessionId];
      if (!status || status.type === 'idle') {
        // Transitioning to idle — do a final messages fetch
        queryClient.invalidateQueries({ queryKey: messagesQueryKey });
        return false;
      }
      return 1000;
    },
  });

  const isIdle = !statusQuery.data?.[sessionId] || statusQuery.data[sessionId].type === 'idle';

  const messagesQuery = useQuery({
    ...sessionMessagesOptions({
      client,
      path: { sessionID: sessionId },
    }),
    refetchInterval: isIdle ? false : 1000,
  });

  const permissionsQuery = useQuery({
    ...permissionListOptions({ client }),
    refetchInterval: isIdle ? false : 1000,
    select: (data: PermissionRequest[]) =>
      data?.filter((p) => p.sessionID === sessionId) ?? [],
  });

  return {
    messages: messagesQuery.data,
    isLoading: messagesQuery.isLoading,
    sessionStatus: statusQuery.data?.[sessionId] ?? { type: 'idle' as const },
    statusQueryKey: sessionStatusOptions({ client }).queryKey,
    pendingPermissions: permissionsQuery.data ?? [],
    permissionsQueryKey: permissionListQueryKey({ client }),
  };
}
