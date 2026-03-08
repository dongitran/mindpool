import type { ChatMessage, ChatOptions } from '@mindpool/shared';
import type { LLMProvider } from '../types';

const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

export class MinimaxProvider implements LLMProvider {
  readonly id = 'minimax';
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

    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[MiniMax] API error ${response.status}: ${errorText}`);
    }

    if (options?.stream) {
      if (!response.body) {
        throw new Error('[MiniMax] No response body for stream');
      }
      return response.body as unknown as ReadableStream;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? '';
  }
}
