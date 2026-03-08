import type { AgentRef } from './agent';

export type PoolStatus = 'setup' | 'active' | 'completed';

export interface Pool {
  _id: string;
  title: string;
  topic: string;
  status: PoolStatus;
  agents: AgentRef[];
  messages: string[];  // MessageId[]
  queue: string[];     // AgentId[]
  conversationId: string;
  statusText: string;
  duration: number;
  sendAgents: { icon: string; name: string; role: string }[];
  mapCenter: string;
  mapCenterSub: string;
  mapNodes: MapNode[];
  createdAt: string;
  updatedAt: string;
}

export interface MapNode {
  label: string;
  sub: string;
  val: string;
  color: string;
}
