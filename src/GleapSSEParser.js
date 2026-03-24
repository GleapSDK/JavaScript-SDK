/**
 * Shared SSE (Server-Sent Events) stream parser.
 *
 * Reads a fetch Response body as an SSE stream and dispatches
 * parsed events to callbacks. Used by both the JavaScript SDK
 * and the Gleap Frontend dashboard.
 *
 * @example
 * import { parseSSEStream, dispatchSSEEvent } from 'gleap/sse'; // or from './GleapSSEParser'
 *
 * const response = await fetch(url, { method: 'POST', ... });
 * await parseSSEStream(response, {
 *   onMeta: (data) => { ... },
 *   onToken: (data) => { ... },
 *   onDone: (data) => { ... },
 *   onError: (data) => { ... },
 * });
 */

/**
 * Dispatch a single parsed SSE event to the appropriate callback.
 *
 * @param {string} event - Event type: 'meta', 'token', 'tool_start', 'tool_end', 'done', 'error'
 * @param {object} data - Parsed JSON data
 * @param {object} callbacks - { onMeta, onToken, onToolStart?, onToolEnd?, onDone, onError }
 */
export const dispatchSSEEvent = (event, data, callbacks) => {
  switch (event) {
    case 'meta': callbacks.onMeta?.(data); break;
    case 'token': callbacks.onToken?.(data); break;
    case 'tool_start': callbacks.onToolStart?.(data); break;
    case 'tool_end': callbacks.onToolEnd?.(data); break;
    case 'done': callbacks.onDone?.(data); break;
    case 'error': callbacks.onError?.(data); break;
    case 'handoff': callbacks.onHandoff?.(data); break;
  }
};

/**
 * Parse an SSE stream from a fetch Response and dispatch events to callbacks.
 *
 * @param {Response} response - A fetch Response with a readable body (text/event-stream).
 * @param {object} callbacks - { onMeta, onToken, onToolStart?, onToolEnd?, onDone, onError }
 * @returns {Promise<void>}
 */
export const parseSSEStream = async (response, callbacks) => {
  if (!response.body) {
    callbacks.onError?.({ message: 'No response body.' });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let currentData = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.replace(/\r$/, '');

        if (trimmed.startsWith('event: ')) {
          currentEvent = trimmed.slice(7).trim();
        } else if (trimmed.startsWith('data: ')) {
          currentData += (currentData ? '\n' : '') + trimmed.slice(6);
        } else if (trimmed === '') {
          if (currentEvent && currentData) {
            try {
              const parsed = JSON.parse(currentData);
              dispatchSSEEvent(currentEvent, parsed, callbacks);
            } catch { /* skip malformed event */ }
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }

    // Flush any remaining buffered event
    if (currentEvent && currentData) {
      try {
        const parsed = JSON.parse(currentData);
        dispatchSSEEvent(currentEvent, parsed, callbacks);
      } catch { /* skip */ }
    }
  } catch (err) {
    if (err?.name !== 'AbortError') {
      callbacks.onError?.({ message: 'Stream interrupted.' });
    }
  }
};
