import { useCallback, useEffect } from 'react';
import { useMeetingStore } from '../stores/meetingStore';
import { useAppStore } from '../stores/appStore';
import { useSSE } from './useSSE';
import { api } from '../lib/api';

export function useMeeting(poolId: string | null) {
  const store = useMeetingStore();
  const setError = useAppStore((s) => s.setError);

  // Connect SSE
  useSSE(poolId);

  // Load pool data
  useEffect(() => {
    if (!poolId) return;
    store.setLoading(true);
    api
      .getPool(poolId)
      .then((pool) => {
        store.setCurrentPool(poolId, pool);
      })
      .catch(() => {
        setError('Không thể tải thông tin meeting');
      })
      .finally(() => {
        store.setLoading(false);
      });
  }, [poolId, store, setError]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!poolId) return;
      store.addMessage({
        type: 'user',
        content,
        timestamp: new Date().toISOString(),
      });
      try {
        await api.sendPoolMessage(poolId, content);
      } catch {
        setError('Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    },
    [poolId, store, setError],
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
