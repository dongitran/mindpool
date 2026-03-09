import { useEffect, useRef } from 'react';
import { useMeetingStore } from '../stores/meetingStore';
import { api } from '../lib/api';

export function useSSE(poolId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  // Track the latest message timestamp so reconnects only replay new messages
  const lastTimestampRef = useRef<string | undefined>(undefined);
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
              // Replayed stored message — update our timestamp watermark
              if (data.message?.timestamp) {
                lastTimestampRef.current = data.message.timestamp;
              }
              break;
            case 'mindx_announce':
              lastTimestampRef.current = now;
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
              lastTimestampRef.current = now;
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
        es.close();
        // Reconnect after 3s, passing lastTimestamp so server skips already-seen messages
        setTimeout(() => {
          if (esRef.current === es) {
            connect(lastTimestampRef.current);
          }
        }, 3000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [poolId, addMessage, updateAgentState, updateQueue, setPoolComplete]);
}
