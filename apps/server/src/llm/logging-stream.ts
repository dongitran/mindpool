import { LLMLog } from '../models/LLMLog';
import { logger } from '../lib/logger';

interface LogContext {
  callType: string;
  provider: string;
  llmModel: string;
  messages: Array<{ role: string; content: string }>;
  options?: { maxTokens?: number; temperature?: number; stream?: boolean };
  startTime: number;
}

/**
 * Rough token estimate based on character count.
 * ~4 chars per token is a common approximation for English/Vietnamese.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Save an LLM call log to MongoDB (fire-and-forget).
 */
export function saveLLMLog(
  ctx: LogContext,
  response: string,
  thinking: string | null,
  error: string | null
): void {
  const durationMs = Date.now() - ctx.startTime;
  const totalText = response + (thinking || '');
  const inputText = ctx.messages.map((m) => m.content).join(' ');

  LLMLog.create({
    callType: ctx.callType,
    provider: ctx.provider,
    llmModel: ctx.llmModel,
    messages: ctx.messages,
    response,
    thinking,
    options: ctx.options || {},
    durationMs,
    tokenEstimate: estimateTokens(inputText + totalText),
    error,
    status: error ? 'error' : 'success',
  }).catch((err) => {
    logger.error('[LLMLog] Failed to save log', { error: err instanceof Error ? err.message : String(err) });
  });
}

/**
 * Wraps a ReadableStream to accumulate content and thinking chunks,
 * then logs to MongoDB when the stream completes.
 *
 * The wrapper is transparent — downstream consumers see the exact same bytes.
 */
export function createLoggingStream(
  original: ReadableStream,
  ctx: LogContext
): ReadableStream {
  let accumulatedContent = '';
  let accumulatedThinking = '';
  let lineBuffer = '';

  const reader = (original as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          // Process remaining buffer
          if (lineBuffer.trim()) {
            processLine(lineBuffer.trim());
          }
          // Log the completed stream
          saveLLMLog(ctx, accumulatedContent, accumulatedThinking || null, null);
          controller.close();
          return;
        }

        // Pass bytes through unchanged
        controller.enqueue(value);

        // Also parse for logging
        const text = decoder.decode(value, { stream: true });
        lineBuffer += text;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          processLine(trimmed);
        }
      } catch (err) {
        saveLLMLog(ctx, accumulatedContent, accumulatedThinking || null, err instanceof Error ? err.message : String(err));
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel();
      saveLLMLog(ctx, accumulatedContent, accumulatedThinking || null, 'stream_cancelled');
    },
  });

  function processLine(trimmed: string) {
    if (!trimmed.startsWith('data:')) return;
    const jsonStr = trimmed.startsWith('data: ') ? trimmed.slice(6) : trimmed.slice(5);
    if (jsonStr.trim() === '[DONE]') return;

    try {
      const parsed = JSON.parse(jsonStr);
      const delta = parsed.choices?.[0]?.delta;
      if (!delta) return;

      if (delta.reasoning_content) {
        accumulatedThinking += delta.reasoning_content;
      } else if (delta.content) {
        accumulatedContent += delta.content;
      }
    } catch {
      // Skip malformed JSON
    }
  }
}
