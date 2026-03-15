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
  streamingChunks: Record<string, string>;
  isLoading: boolean;

  setCurrentPool: (poolId: string, pool: Pool) => void;
  addMessage: (message: MeetingMessage) => void;
  appendChunk: (agentId: string, agentName: string, icon: string, chunk: string) => void;
  updateTypingMessage: (agentId: string, thinking: string, thinkSec: number) => void;
  appendThinkingChunk: (agentId: string, chunk: string, thinkSec: number) => void;
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
  streamingChunks: {},
  isLoading: false,

  setCurrentPool: (poolId, pool) =>
    set((s) => ({
      currentPoolId: poolId,
      pool,
      // Only wipe messages when switching to a DIFFERENT pool.
      // On initial load (currentPoolId=null) or same pool: preserve SSE-replayed messages.
      ...(s.currentPoolId && s.currentPoolId !== poolId
        ? { messages: [], streamingChunks: {}, agentStates: {}, queue: [] }
        : {}),
      isLoading: false,
    })),
  addMessage: (message) =>
    set((s) => {
      const msgWithId = { ...message, id: message.id || crypto.randomUUID() };
      // Dedup: skip if a message with the same id already exists
      if (msgWithId.id && s.messages.some((m) => m.id === msgWithId.id)) return s;
      // Dedup typing: only allow one typing indicator per agent
      if (msgWithId.type === 'typing' && msgWithId.agentId &&
          s.messages.some((m) => m.type === 'typing' && m.agentId === msgWithId.agentId)) return s;
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
        msgWithId.skipStream = true; // Already streamed in real-time, no fake animation needed
        const filtered = s.messages.filter(
          (m) => !(m.type === 'typing' && m.agentId === msgWithId.agentId)
        );
        // Clean up streaming chunks for this agent
        const { [msgWithId.agentId]: _discarded, ...restChunks } = s.streamingChunks;
        void _discarded;
        return { messages: [...filtered, msgWithId], streamingChunks: restChunks };
      }
      return { messages: [...s.messages, msgWithId] };
    }),
  appendChunk: (agentId, agentName, icon, chunk) =>
    set((s) => {
      const prev = s.streamingChunks[agentId] || '';
      const updated = prev + chunk;
      return {
        streamingChunks: { ...s.streamingChunks, [agentId]: updated },
        messages: s.messages.map((m) =>
          m.type === 'typing' && m.agentId === agentId
            ? { ...m, content: updated, agentName: agentName || m.agentName, icon: icon || m.icon }
            : m
        ),
      };
    }),
  updateTypingMessage: (agentId, thinking, thinkSec) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.type === 'typing' && m.agentId === agentId
          ? { ...m, thinking, thinkSec }
          : m
      ),
    })),
  appendThinkingChunk: (agentId, chunk, thinkSec) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.type === 'typing' && m.agentId === agentId
          ? { ...m, thinking: (m.thinking || '') + chunk, thinkSec }
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
      streamingChunks: {},
      isLoading: false,
    }),
}));
