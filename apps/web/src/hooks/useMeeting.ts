import { useCallback, useEffect } from 'react';
import { useMeetingStore } from '../stores/meetingStore';
import { useSSE } from './useSSE';
import { api } from '../lib/api';

export function useMeeting(poolId: string | null) {
  const store = useMeetingStore();

  // Connect SSE
  useSSE(poolId);

  // Load pool data
  useEffect(() => {
    if (!poolId) return;
    api.getPool(poolId).then((pool) => {
      store.setCurrentPool(poolId, pool);
    });
  }, [poolId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!poolId) return;
      store.addMessage({
        type: 'user',
        content,
        timestamp: new Date().toISOString(),
      });
      await api.sendPoolMessage(poolId, content);
    },
    [poolId, store],
  );

  return {
    pool: store.pool,
    messages: store.messages,
    agentStates: store.agentStates,
    queue: store.queue,
    isLoading: store.isLoading,
    sendMessage,
  };
}
