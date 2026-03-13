import type { CallType, ChatMessage, ChatOptions, RouterConfig } from '@mindpool/shared';
import type { LLMProvider } from './types';
import { saveLLMLog, createLoggingStream } from './logging-stream';

export class LLMRouter {
  private providers = new Map<string, LLMProvider>();
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
  }

  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  async agentChat(
    callType: CallType,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ReadableStream | string> {
    const routeConfig = this.config[callType];
    if (!routeConfig) {
      throw new Error(`[LLMRouter] No config for callType: ${callType}`);
    }

    const provider = this.providers.get(routeConfig.provider);
    if (!provider) {
      throw new Error(
        `[LLMRouter] Provider not registered: ${routeConfig.provider}`
      );
    }

    const logCtx = {
      callType,
      provider: routeConfig.provider,
      llmModel: routeConfig.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      options: options ? { maxTokens: options.maxTokens, temperature: options.temperature, stream: options.stream } : {},
      startTime: Date.now(),
    };

    try {
      const result = await provider.chat(messages, routeConfig.model, options);

      if (typeof result === 'string') {
        // Non-streaming: log immediately (fire-and-forget)
        saveLLMLog(logCtx, result, null, null);
        return result;
      }

      // Streaming: wrap with logging pass-through
      return createLoggingStream(result, logCtx);
    } catch (error) {
      // Log failed calls too
      saveLLMLog(logCtx, '', null, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  updateConfig(newConfig: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RouterConfig {
    return structuredClone(this.config);
  }
}

