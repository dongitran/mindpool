import type { ConversationAgentSuggestion } from './conversation';

export type SSEEvent =
  | { type: 'mindx_announce'; content: string }
  | { type: 'agent_typing'; agentId: string; agentName: string; icon: string; role: string }
  | { type: 'agent_thinking'; agentId: string; agentName: string; content: string; thinkSec: number }
  | { type: 'agent_message'; agentId: string; agentName: string; content: string }
  | { type: 'agent_chunk'; agentId: string; agentName: string; icon: string; chunk: string }
  | { type: 'agent_done'; agentId: string }
  | { type: 'queue_update'; queue: { agentId: string; position: number }[] }
  | { type: 'agent_state'; agentId: string; state: 'speaking' | 'queued' | 'listening' | 'moderating' }
  | { type: 'pool_complete'; wrapUp: string; status: 'completed' }
  | { type: 'agents_suggested'; agents: ConversationAgentSuggestion[] }
  | { type: 'error'; message: string };
