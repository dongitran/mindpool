import type { Pool, Conversation, ConversationAgentSuggestion } from '@mindpool/shared';

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
  getConversations: (cursor?: string) =>
    request<{ items: Conversation[]; nextCursor: string | null }>(
      `/conversations${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`
    ),
  getConversation: (id: string) =>
    request<Conversation>(`/conversations/${id}`),
  sendConversationMessage: (id: string, content: string) =>
    request<Conversation>(`/conversations/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  sendConversationMessageStream: async (
    id: string,
    content: string,
    onChunk: (chunk: string) => void,
    onThinkingChunk?: (chunk: string) => void,
    onThinkingDone?: () => void,
    onAgents?: (agents: ConversationAgentSuggestion[]) => void,
  ): Promise<Conversation> => {
    const res = await fetch(`${API_BASE}/conversations/${id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalConversation: Conversation | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.type === 'chunk') {
            onChunk(data.content);
          } else if (data.type === 'thinking_chunk') {
            onThinkingChunk?.(data.content);
          } else if (data.type === 'thinking_done') {
            onThinkingDone?.();
          } else if (data.type === 'agents_suggested') {
            onAgents?.(data.agents);
          } else if (data.type === 'done') {
            finalConversation = data.conversation as Conversation;
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }

    if (!finalConversation) throw new Error('Stream ended without final conversation');
    return finalConversation;
  },

  // Pools
  createPool: (topic: string, agentIds: string[], conversationId: string) =>
    request<Pool>('/pool/create', {
      method: 'POST',
      body: JSON.stringify({ topic, agentIds, conversationId }),
    }),
  getPool: (id: string) =>
    request<Pool>(`/pool/${id}`),
  getPools: (cursor?: string) =>
    request<{ items: Pool[]; nextCursor: string | null }>(
      `/pools${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`
    ),
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
  // Link meeting to conversation (persist meetingId on bot-agents message)
  linkMeetingToConversation: (conversationId: string, btnId: string, meetingId: string, meetingTitle: string) =>
    request<{ ok: boolean }>(`/conversations/${conversationId}/link-meeting`, {
      method: 'PATCH',
      body: JSON.stringify({ btnId, meetingId, meetingTitle }),
    }),
};
