import type { ChatMessage, ChatOptions } from '@mindpool/shared';
import type { LLMProvider } from '../types';
import { withRetry } from '../retry';

const KIMI_API_URL = 'https://api.kimi.com/coding/v1/chat/completions';

export class KimiProvider implements LLMProvider {
  readonly id = 'kimi';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(
    messages: ChatMessage[],
    model: string,
    options?: ChatOptions
  ): Promise<ReadableStream | string> {
    const body = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      stream: options?.stream ?? false,
    };

    return withRetry(async () => {
      const response = await fetch(KIMI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'claude-code/1.0.0',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`[Kimi] API error ${response.status}: ${errorText}`);
      }

      if (options?.stream) {
        if (!response.body) {
          throw new Error('[Kimi] No response body for stream');
        }
        return response.body as unknown as ReadableStream;
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      return data.choices?.[0]?.message?.content ?? '';
    });
  }
}
