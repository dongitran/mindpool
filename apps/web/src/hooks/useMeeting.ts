import { useCallback, useEffect } from 'react';
import { useMeetingStore } from '../stores/meetingStore';
import { useAppStore } from '../stores/appStore';
import { useSSE } from './useSSE';
import { api } from '../lib/api';

export function useMeeting(poolId: string | null) {
  // Select stable method references (don't change on state updates)
  const setCurrentPool = useMeetingStore((s) => s.setCurrentPool);
  const addMessage = useMeetingStore((s) => s.addMessage);
  const setLoading = useMeetingStore((s) => s.setLoading);
  // Select reactive state values
  const pool = useMeetingStore((s) => s.pool);
  const messages = useMeetingStore((s) => s.messages);
  const agentStates = useMeetingStore((s) => s.agentStates);
  const queue = useMeetingStore((s) => s.queue);
  const isLoading = useMeetingStore((s) => s.isLoading);

  const setError = useAppStore((s) => s.setError);

  // Connect SSE
  useSSE(poolId);

  // Load pool data
  useEffect(() => {
    if (!poolId) return;
    setLoading(true);
    api
      .getPool(poolId)
      .then((p) => {
        setCurrentPool(poolId, p);
      })
      .catch(() => {
        setError('Không thể tải thông tin meeting');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [poolId, setCurrentPool, setLoading, setError]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!poolId) return;
      addMessage({
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
    [poolId, addMessage, setError],
  );

  return {
    pool,
    messages,
    agentStates,
    queue,
    isLoading,
    sendMessage,
  };
}
