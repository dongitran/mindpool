import type { Pool, Conversation } from '@mindpool/shared';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export const api = {
  // Conversations
  createConversation: () =>
    request<Conversation>('/conversations', { method: 'POST' }),
  getConversations: () =>
    request<Conversation[]>('/conversations'),
  getConversation: (id: string) =>
    request<Conversation>(`/conversations/${id}`),
  sendConversationMessage: (id: string, content: string) =>
    request<Conversation>(`/conversations/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Pools
  createPool: (topic: string, agentIds: string[], conversationId: string) =>
    request<Pool>('/pool/create', {
      method: 'POST',
      body: JSON.stringify({ topic, agentIds, conversationId }),
    }),
  getPool: (id: string) =>
    request<Pool>(`/pool/${id}`),
  getPools: () =>
    request<Pool[]>('/pools'),
  sendPoolMessage: (id: string, content: string) =>
    request<{ _id: string; content: string; agentId: string; timestamp: string }>(`/pool/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Settings
  getSettings: () =>
    request<Record<string, unknown>>('/settings'),
  updateSettings: (settings: Record<string, unknown>) =>
    request<Record<string, unknown>>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // SSE — pass ?after=<ISO> to skip messages already seen (avoids duplicates on reconnect)
  streamPool: (poolId: string, after?: string) => {
    const url = after
      ? `${API_BASE}/stream/${poolId}?after=${encodeURIComponent(after)}`
      : `${API_BASE}/stream/${poolId}`;
    return new EventSource(url);
  },
};
