import { useQuery } from '@tanstack/react-query';
import { providerListOptions, configGetOptions } from '@/api/@tanstack/react-query.gen';
import { useServerConfig } from '@/contexts/server-config';

export function ProviderPrefetch() {
  const { client } = useServerConfig();

  useQuery({
    ...providerListOptions({ client: client! }),
    staleTime: Infinity,
    enabled: !!client,
  });
  useQuery({
    ...configGetOptions({ client: client! }),
    staleTime: Infinity,
    enabled: !!client,
  });
  return null;
}
