import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@/api/client';
import type { Client } from '@/api/client/types.gen';

const STORAGE_KEY = 'server_settings_v2';

export interface ServerSettings {
  url: string;
  username?: string;
  password?: string;
}

interface ServerConfigContextValue {
  settings: ServerSettings | null;
  client: Client | null;
  isLoading: boolean;
  saveSettings: (settings: ServerSettings) => Promise<void>;
  clearSettings: () => Promise<void>;
}

const ServerConfigContext = createContext<ServerConfigContextValue | null>(null);

function buildClient(settings: ServerSettings): Client {
  const headers: Record<string, string> = {};
  if (settings.username || settings.password) {
    const credentials = btoa(`${settings.username || 'opencode'}:${settings.password || ''}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }
  return createClient({
    baseUrl: settings.url,
    headers,
  });
}

export function ServerConfigProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ServerSettings | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        const parsed: ServerSettings = JSON.parse(raw);
        setSettings(parsed);
        setClient(buildClient(parsed));
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const saveSettings = useCallback(async (newSettings: ServerSettings) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
    setClient(buildClient(newSettings));
  }, []);

  const clearSettings = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setSettings(null);
    setClient(null);
  }, []);

  return (
    <ServerConfigContext.Provider value={{ settings, client, isLoading, saveSettings, clearSettings }}>
      {children}
    </ServerConfigContext.Provider>
  );
}

export function useServerConfig() {
  const ctx = useContext(ServerConfigContext);
  if (!ctx) throw new Error('useServerConfig must be used within ServerConfigProvider');
  return ctx;
}
