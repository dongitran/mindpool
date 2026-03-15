import { useEffect, useRef } from 'react';
import { useMeetingStore } from '../stores/meetingStore';
import { api } from '../lib/api';

export function useSSE(poolId: string | null) {
  const esRef = useRef<EventSource | null>(null);
  const lastTimestampRef = useRef<string | undefined>(undefined);
  const { addMessage, appendChunk, appendThinkingChunk, updateTypingMessage, updateAgentState, updateQueue, setPoolComplete } =
    useMeetingStore((s) => s);

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
            case 'message': {
              const msg = data.message;
              // Replayed stored message — update our timestamp watermark
              if (msg?.timestamp) {
                lastTimestampRef.current = msg.timestamp;
              }
              // It's a User or an Agent message from history
              if (msg) {
                if (msg.agentId === 'user') {
                  addMessage({
                    type: 'user',
                    content: msg.content,
                    timestamp: msg.timestamp,
                    skipStream: true,
                  });
                } else if (msg.agentId === 'mindx') {
                  addMessage({
                    type: 'mindx',
                    icon: '🧠',
                    agentName: 'MindX',
                    role: 'Orchestrator',
                    content: msg.content,
                    timestamp: msg.timestamp,
                    skipStream: true,
                  });
                } else {
                  addMessage({
                    type: 'agent',
                    agentId: msg.agentId,
                    agentName: msg.agentName,
                    icon: msg.icon,
                    role: msg.role,
                    content: msg.content,
                    thinking: msg.thinking,
                    thinkSec: msg.thinkSec,
                    timestamp: msg.timestamp,
                    skipStream: true,
                  });
                }
              }
              break;
            }
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
              // Append thinking chunk to typing message (streamed during LLM reasoning phase)
              appendThinkingChunk(data.agentId, data.content, data.thinkSec);
              break;
            case 'agent_chunk':
              appendChunk(data.agentId, data.agentName, data.icon, data.chunk);
              break;
            case 'agent_message':
              addMessage({
                type: 'agent',
                agentId: data.agentId,
                agentName: data.agentName,
                icon: data.icon,
                content: data.content,
                thinking: data.thinking,
                thinkSec: data.thinkSec,
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
  }, [poolId, addMessage, appendChunk, appendThinkingChunk, updateTypingMessage, updateAgentState, updateQueue, setPoolComplete]);
}
