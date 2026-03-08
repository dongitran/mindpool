import type { ChatMessage, ChatOptions } from '@mindpool/shared';

export interface LLMProvider {
  id: string;
  chat(messages: ChatMessage[], model: string, options?: ChatOptions): Promise<ReadableStream | string>;
}
