import { create } from 'zustand';
import type { Pool } from '@mindpool/shared';

interface MeetingMessage {
  type: 'agent' | 'user' | 'mindx' | 'typing';
  agentId?: string;
  agentName?: string;
  icon?: string;
  role?: string;
  content: string;
  thinking?: string;
  thinkSec?: number;
  timestamp: string;
}

interface MeetingState {
  currentPoolId: string | null;
  pool: Pool | null;
  messages: MeetingMessage[];
  agentStates: Record<string, string>;
  queue: { agentId: string; position: number }[];
  isLoading: boolean;

  setCurrentPool: (poolId: string, pool: Pool) => void;
  addMessage: (message: MeetingMessage) => void;
  updateAgentState: (agentId: string, state: string) => void;
  updateQueue: (queue: { agentId: string; position: number }[]) => void;
  setPoolComplete: (wrapUp: string) => void;
  reset: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  currentPoolId: null,
  pool: null,
  messages: [],
  agentStates: {},
  queue: [],
  isLoading: false,

  setCurrentPool: (poolId, pool) =>
    set({
      currentPoolId: poolId,
      pool,
      messages: [],
      isLoading: false,
    }),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),
  updateAgentState: (agentId, state) =>
    set((s) => ({ agentStates: { ...s.agentStates, [agentId]: state } })),
  updateQueue: (queue) => set({ queue }),
  setPoolComplete: (wrapUp) =>
    set((s) => ({
      pool: s.pool ? { ...s.pool, status: 'completed' } : null,
      messages: [
        ...s.messages,
        { type: 'mindx', content: wrapUp, timestamp: new Date().toISOString() },
      ],
    })),
  reset: () =>
    set({
      currentPoolId: null,
      pool: null,
      messages: [],
      agentStates: {},
      queue: [],
      isLoading: false,
    }),
}));
