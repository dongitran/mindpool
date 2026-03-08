import type { CallType, ChatMessage, ChatOptions, RouterConfig } from '@mindpool/shared';
import type { LLMProvider } from './types';

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

    return provider.chat(messages, routeConfig.model, options);
  }

  updateConfig(newConfig: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RouterConfig {
    return { ...this.config };
  }
}
