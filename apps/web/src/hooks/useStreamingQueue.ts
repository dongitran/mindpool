import { useState, useEffect, useRef } from 'react';

/**
 * useStreamingQueue hook
 * 
 * Intercepts an array of messages and progressively reveals the `content` 
 * of bot/agent messages character by character.
 */
export function useStreamingQueue<T extends { id?: string; type: string; content?: string; skipStream?: boolean }>(
  messages: T[],
  speedMs: number = 20
): T[] {
  const [streamProgress, setStreamProgress] = useState<Record<string, number>>({});
  const progressRef = useRef<Record<string, number>>({});

  // Stable ID: prefer m.id, fallback includes array index to prevent collisions
  const getMsgId = (m: T, idx: number) =>
    m.id || `${m.type}-${idx}-${m.content?.slice(0, 20) || ''}`;

  useEffect(() => {
    // Sync ref with state on mount or when messages change (to catch history skips)
    messages.forEach((m, idx) => {
      const msgId = getMsgId(m, idx);
      if (m.skipStream && m.content) {
        progressRef.current[msgId] = m.content.length;
      }
    });
  }, [messages]);

  useEffect(() => {
    // Find messages that need streaming, preserving original index for stable IDs
    const needsStream: { msg: T; msgId: string }[] = [];
    messages.forEach((m, idx) => {
      const isBotMessage = ['bot', 'bot-agents', 'agent_message', 'mindx_announce', 'agent', 'mindx'].includes(m.type);
      if (!isBotMessage || !m.content || m.skipStream) return;
      const msgId = getMsgId(m, idx);
      const progress = progressRef.current[msgId] ?? 0;
      if (progress < m.content.length) {
        needsStream.push({ msg: m, msgId });
      }
    });

    if (needsStream.length === 0) return;

    const timer = setInterval(() => {
      let changed = false;
      const nextProgress = { ...progressRef.current };

      needsStream.forEach(({ msg, msgId }) => {
        const current = nextProgress[msgId] ?? 0;

        if (current < msg.content!.length) {
          const advance = Math.floor(Math.random() * 2) + 2;
          nextProgress[msgId] = Math.min(current + advance, msg.content!.length);
          changed = true;
        }
      });

      if (changed) {
        progressRef.current = nextProgress;
        setStreamProgress(nextProgress);
      } else {
        clearInterval(timer);
      }
    }, speedMs);

    return () => clearInterval(timer);
  }, [messages, speedMs]);

  return messages.map((m, idx) => {
    const isBotMessage = ['bot', 'bot-agents', 'agent_message', 'mindx_announce', 'agent', 'mindx'].includes(m.type);
    if (!isBotMessage || !m.content || m.skipStream) return m;

    const msgId = getMsgId(m, idx);
    const progress = streamProgress[msgId] ?? 0;

    // If progress is at the end, return full message to avoid unnecessary substring ops
    if (progress >= m.content.length) return m;

    return { ...m, content: m.content.substring(0, progress) };
  });
}

