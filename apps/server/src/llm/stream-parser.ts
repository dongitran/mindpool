/**
 * Chunk type yielded by the SSE stream parser.
 * - 'thinking': reasoning_content from the LLM (should be hidden/collapsible in UI)
 * - 'content': actual response content
 */
export interface StreamChunk {
  type: 'thinking' | 'content';
  text: string;
}

/**
 * Parses an OpenAI-compatible SSE stream from LLM providers (Kimi, Minimax).
 * Yields typed chunks distinguishing thinking from content.
 */
export async function* parseSSEStream(
  stream: ReadableStream,
): AsyncGenerator<StreamChunk, void, unknown> {
  const reader = (stream as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        // Handle both "data: {...}" (standard SSE) and "data:{...}" (Kimi format)
        if (!trimmed.startsWith('data:')) continue;

        const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed.slice(5);
        if (jsonStr.trim() === '[DONE]') return;

        try {
          const parsed = JSON.parse(jsonStr);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
            if (delta.reasoning_content) {
              yield { type: 'thinking', text: delta.reasoning_content };
            }
          } else if (delta.content !== undefined && delta.content !== null) {
            if (delta.content) {
              yield { type: 'content', text: delta.content };
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
