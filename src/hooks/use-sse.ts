export interface SSEEvent {
  event?: string;
  data: string;
}

export async function* streamSSE(
  url: string,
  signal: AbortSignal
): AsyncGenerator<SSEEvent> {
  const response = await fetch(url, {
    headers: { Accept: 'text/event-stream' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`SSE connection failed: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      let currentEvent: string | undefined;
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          currentData += (currentData ? '\n' : '') + line.slice(5).trim();
        } else if (line === '') {
          if (currentData) {
            yield { event: currentEvent, data: currentData };
          }
          currentEvent = undefined;
          currentData = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
