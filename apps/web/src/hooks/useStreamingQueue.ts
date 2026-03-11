import { useState, useEffect } from 'react';

/**
 * useStreamingQueue hook
 * 
 * Intercepts an array of messages and progressively reveals the `content` 
 * of bot/agent messages character by character.
 * 
 * It automatically sequences messages: it finds the first message that 
 * hasn't fully streamed and streams it before moving to the next.
 */
export function useStreamingQueue<T extends { id?: string; type: string; content?: string }>(
  messages: T[],
  speedMs: number = 20
): T[] {
  const [streamProgress, setStreamProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    // Find the first message that hasn't finished streaming
    const msgToStream = messages.find(m => {
      // User messages or system messages without content don't get streamed
      const isBotMessage = ['bot', 'bot-agents', 'agent_message', 'mindx_announce'].includes(m.type);
      if (!isBotMessage || !m.content) return false;
      
      // Fallback ID if missing
      const msgId = m.id || JSON.stringify(m);
      const progress = streamProgress[msgId] ?? 0;
      
      return progress < m.content.length;
    });

    if (!msgToStream || !msgToStream.content) return;

    const msgId = msgToStream.id || JSON.stringify(msgToStream);

    const timer = setInterval(() => {
      setStreamProgress(prev => {
        const current = prev[msgId] ?? 0;
        // Advance by chunks of 2-3 chars for a natural typewriter feel
        const advance = Math.floor(Math.random() * 2) + 2; 
        const next = Math.min(current + advance, msgToStream.content!.length);
        
        if (current === next) {
          clearInterval(timer);
          return prev;
        }
        
        return { ...prev, [msgId]: next };
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [messages, streamProgress, speedMs]);

  return messages.map(m => {
    const isBotMessage = ['bot', 'bot-agents', 'agent_message', 'mindx_announce'].includes(m.type);
    
    // Pass through if not a bot or has no content
    if (!isBotMessage || !m.content) return m;

    const msgId = m.id || JSON.stringify(m);
    const progress = streamProgress[msgId] ?? 0;
    
    return { ...m, content: m.content.substring(0, progress) };
  });
}

