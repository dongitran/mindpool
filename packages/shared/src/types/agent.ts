export interface Agent {
  _id: string;
  name: string;
  icon: string;
  specialty: string;
  systemPrompt: string;
  personality: {
    directness: number;    // 0-1
    creativity: number;    // 0-1
    skepticism: number;    // 0-1
  };
  signatureQuestion: string;
  isCustom: boolean;
}

export type AgentState = 'speaking' | 'queued' | 'listening' | 'moderating';

export interface AgentRef {
  agentId: string;
  icon: string;
  name: string;
  role: string;
  state: AgentState;
  queuePosition?: number;
}
