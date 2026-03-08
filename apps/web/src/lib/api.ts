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
    request('/conversations', { method: 'POST' }),
  getConversations: () =>
    request('/conversations'),
  getConversation: (id: string) =>
    request(`/conversations/${id}`),
  sendConversationMessage: (id: string, content: string) =>
    request(`/conversations/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Pools
  createPool: (topic: string, agentIds: string[], conversationId: string) =>
    request('/pool/create', {
      method: 'POST',
      body: JSON.stringify({ topic, agentIds, conversationId }),
    }),
  getPool: (id: string) =>
    request(`/pool/${id}`),
  getPools: () =>
    request('/pools'),
  sendPoolMessage: (id: string, content: string) =>
    request(`/pool/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Settings
  getSettings: () =>
    request('/settings'),
  updateSettings: (settings: Record<string, unknown>) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // SSE
  streamPool: (poolId: string) =>
    new EventSource(`${API_BASE}/stream/${poolId}`),
};
