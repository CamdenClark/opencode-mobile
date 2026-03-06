import { useEffect, useRef } from 'react';
import { streamSSE, type SSEEvent } from './use-sse';

const BASE_URL = 'http://aphex.tail85c1ab.ts.net:4096';
const RECONNECT_DELAY = 3000;

export interface SessionEvent {
  type: string;
  properties: any;
}

export function useSessionEvents(
  sessionId: string,
  onEvent: (event: SessionEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout>;

    async function connect() {
      try {
        for await (const sse of streamSSE(
          `${BASE_URL}/event`,
          controller.signal
        )) {
          try {
            const parsed = JSON.parse(sse.data);
            const event: SessionEvent = {
              type: parsed.type,
              properties: parsed.properties,
            };
            const sid =
              event.properties?.sessionID ||
              event.properties?.info?.sessionID ||
              event.properties?.part?.sessionID;
            if (sid && sid !== sessionId) continue;
            onEventRef.current(event);
          } catch {
            // skip malformed events
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
      // auto-reconnect
      if (!controller.signal.aborted) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
      }
    }

    connect();

    return () => {
      controller.abort();
      clearTimeout(reconnectTimer);
    };
  }, [sessionId]);
}
