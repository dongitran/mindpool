export type CallType = 'full_response' | 'relevance_check' | 'recap_synthesis';

export interface RouterConfig {
  full_response: { provider: string; model: string };
  relevance_check: { provider: string; model: string };
  recap_synthesis: { provider: string; model: string };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  full_response: { provider: 'kimi', model: 'kimi-k2' },
  relevance_check: { provider: 'minimax', model: 'MiniMax-M2.5' },
  recap_synthesis: { provider: 'minimax', model: 'MiniMax-Text-01' },
};
