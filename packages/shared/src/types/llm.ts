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

