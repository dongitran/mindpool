import { create } from 'zustand';
import type { Pool } from '@mindpool/shared';

interface MeetingMessage {
  id?: string;
  type: 'agent' | 'user' | 'mindx' | 'typing';
  agentId?: string;
  agentName?: string;
  icon?: string;
  role?: string;
  content: string;
  thinking?: string;
  thinkSec?: number;
  timestamp: string;
  skipStream?: boolean;
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
  updateTypingMessage: (agentId: string, thinking: string, thinkSec: number) => void;
  updateAgentState: (agentId: string, state: string) => void;
  updateQueue: (queue: { agentId: string; position: number }[]) => void;
  setPoolComplete: (wrapUp: string) => void;
  setLoading: (isLoading: boolean) => void;
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
    set((s) => {
      const msgWithId = { ...message, id: message.id || crypto.randomUUID() };
      // When an actual agent message arrives, inherit thinking data from typing indicator, then remove it
      if (msgWithId.type === 'agent' && msgWithId.agentId) {
        const typingMsg = s.messages.find(
          (m) => m.type === 'typing' && m.agentId === msgWithId.agentId
        );
        if (typingMsg) {
          msgWithId.thinking = msgWithId.thinking || typingMsg.thinking;
          msgWithId.thinkSec = msgWithId.thinkSec ?? typingMsg.thinkSec;
          msgWithId.icon = msgWithId.icon || typingMsg.icon;
          msgWithId.role = msgWithId.role || typingMsg.role;
        }
        const filtered = s.messages.filter(
          (m) => !(m.type === 'typing' && m.agentId === msgWithId.agentId)
        );
        return { messages: [...filtered, msgWithId] };
      }
      return { messages: [...s.messages, msgWithId] };
    }),
  updateTypingMessage: (agentId, thinking, thinkSec) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.type === 'typing' && m.agentId === agentId
          ? { ...m, thinking, thinkSec }
          : m
      ),
    })),
  updateAgentState: (agentId, state) =>
    set((s) => ({ agentStates: { ...s.agentStates, [agentId]: state } })),
  updateQueue: (queue) => set({ queue }),
  setLoading: (isLoading) => set({ isLoading }),
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
