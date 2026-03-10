import { useEffect, useRef } from 'react';
import { useMeetingStore } from '../stores/meetingStore';
import { api } from '../lib/api';

export function useSSE(poolId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const { addMessage, updateAgentState, updateQueue, setPoolComplete } =
    useMeetingStore();

  useEffect(() => {
    if (!poolId) return;

    function connect(after?: string) {
      const es = api.streamPool(poolId!, after);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const now = new Date().toISOString();

          switch (data.type) {
            case 'message':
              // EventSource naturally handles Last-Event-ID, no manual tracking needed
              break;
            case 'mindx_announce':
              addMessage({
                type: 'mindx',
                icon: '🧠',
                agentName: 'MindX',
                role: 'Orchestrator',
                content: data.content,
                timestamp: now,
              });
              break;
            case 'agent_typing':
              updateAgentState(data.agentId, 'speaking');
              addMessage({
                type: 'typing',
                agentId: data.agentId,
                agentName: data.agentName,
                icon: data.icon,
                role: data.role,
                content: '',
                timestamp: now,
              });
              break;
            case 'agent_thinking':
              // Update last typing message with thinking content
              break;
            case 'agent_message':
              addMessage({
                type: 'agent',
                agentId: data.agentId,
                agentName: data.agentName,
                content: data.content,
                timestamp: now,
              });
              break;
            case 'agent_done':
              updateAgentState(data.agentId, 'listening');
              break;
            case 'queue_update':
              updateQueue(data.queue);
              break;
            case 'agent_state':
              updateAgentState(data.agentId, data.state);
              break;
            case 'pool_complete':
              setPoolComplete(data.wrapUp);
              break;
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      es.onerror = () => {
        // Native EventSource automatically tries to reconnect.
        // We only close it completely if component unmounts.
        console.warn('SSE connection error / dropped, browser will reconnect automatically.');
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [poolId, addMessage, updateAgentState, updateQueue, setPoolComplete]);
}
