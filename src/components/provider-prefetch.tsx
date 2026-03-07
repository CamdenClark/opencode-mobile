import { useQuery } from '@tanstack/react-query';
import { providerListOptions, configGetOptions } from '@/api/@tanstack/react-query.gen';
import { createClient } from '@/api/client';
import type { Config, Client } from '@/api/client/types.gen';

const config: Config = {
  baseUrl: 'http://aphex.tail85c1ab.ts.net:4096',
};

const opencodeClient: Client = createClient(config);

export function ProviderPrefetch() {
  useQuery({
    ...providerListOptions({ client: opencodeClient }),
    staleTime: Infinity,
  });
  useQuery({
    ...configGetOptions({ client: opencodeClient }),
    staleTime: Infinity,
  });
  return null;
}
