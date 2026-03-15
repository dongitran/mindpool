import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../stores/appStore';
import type { ConversationMessage } from '@mindpool/shared';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { Tag } from '../components/ui/Tag';
import { api } from '../lib/api';
import { useStreamingQueue } from '../hooks/useStreamingQueue';

interface ConvMessage extends ConversationMessage {
  id: string;
  skipStream?: boolean;
  thinking?: string;
  isThinkingDone?: boolean;
}

type RawConversationMessage = ConversationMessage & { _id?: string; id?: string };

/** Animated "MindX is typing..." indicator */
function SetupTypingIndicator() {
  return (
    <div className="flex gap-3 px-[22px] py-1 mb-1 animate-msg-in">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-accent to-purple">
        🧠
      </div>
      <div className="max-w-[520px]">
        <TypingIndicator />
      </div>
    </div>
  );
}

/** Collapsible thinking/reasoning block */
function ThinkingBlock({ thinking, isDone }: { thinking: string; isDone?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!thinking) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer px-2.5 py-1 rounded-full bg-surface-2 border border-border transition-all select-none font-mono hover:text-text hover:border-border-light"
      >
        <span className={`text-[8px] transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>▶</span>
        {isDone ? '💭 Thought process' : '💭 Đang suy nghĩ...'}
      </button>
      {isOpen && (
        <div className="mt-1.5 px-3 py-2.5 bg-surface-2 border border-border rounded-sm border-l-2 border-l-purple text-[11.5px] leading-[1.7] text-text-muted font-mono animate-fade-in whitespace-pre-wrap max-h-[300px] overflow-y-auto scrollbar-thin">
          {thinking}
        </div>
      )}
    </div>
  );
}


const makeTime = () => new Date().toISOString();

const GREETING: ConvMessage = {
  id: 'initial-greeting',
  type: 'bot',
  time: makeTime(),
  content:
    'Xin chào! Tôi là **MindX** — trợ lý điều phối của Mindpool.\n\nHãy mô tả chủ đề bạn muốn thảo luận — tôi sẽ gợi ý những expert agent phù hợp nhất và tạo **Mindpool** cho bạn. 🎯',
  skipStream: true,
};

export function SetupScreen() {
  const { currentConversationId, setCurrentConversation, navigateToMeeting, initialSetupTopic, setInitialSetupTopic } =
    useAppStore();
  const [messages, setMessages] = useState<ConvMessage[]>([GREETING]);
  const [title] = useState('MindX');
  const [sub] = useState('Mô tả chủ đề — AI sẽ gợi ý agents phù hợp');
  const [creatingPool, setCreatingPool] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  // Skip fetching conversation when we've just locally created it in handleSend
  const skipNextFetch = useRef(false);
  const queryClient = useQueryClient();

  // Load existing conversation on mount (if navigated back to an existing conversation)
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([GREETING]);
      return;
    }
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    api
      .getConversation(currentConversationId)
      .then((conv) => {
        if (conv.messages?.length) {
          const historyMsgs = conv.messages.map((m: RawConversationMessage, i: number) => ({
            ...m,
            id: i === 0 ? 'initial-greeting' : (m._id || m.id || crypto.randomUUID()),
            isThinkingDone: !!m.thinking,
            skipStream: true
          }));
          setMessages(historyMsgs as ConvMessage[]);
        }
      })
      .catch(() => {
        // Keep local messages if fetch fails
      });
  }, [currentConversationId]);

  // Auto-scroll to bottom when new messages arrive (but not during streaming)
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages.length, isTyping]);

  const displayedMessages = useStreamingQueue(messages, 20);

  const handleSend = useCallback(async (content: string) => {
    const userMsg: ConvMessage = { id: crypto.randomUUID(), type: 'user', time: makeTime(), content };
    // Map current messages to skipStream: true immediately to avoid any re-animation while waiting for API
    setMessages((prev) => [
      ...prev.map(m => ({ ...m, skipStream: true })),
      userMsg
    ]);
    setIsTyping(true);

    try {
      // ── Step 1: ensure a conversation exists ──────────────────────────
      let convId = currentConversationId;
      if (!convId) {
        const newConv = await api.createConversation();
        convId = newConv._id as string;
        // Skip the useEffect fetch triggered by setCurrentConversation — we
        // are managing messages locally to avoid overwriting the user's message.
        skipNextFetch.current = true;
        setCurrentConversation(convId);
      }

      // ── Step 2: send message via streaming SSE ────
      const lastUserMsgId = userMsg.id;
      const streamingBotId = crypto.randomUUID();

      // Add a placeholder bot message that will be updated as chunks arrive
      setMessages((prev) => [
        ...prev,
        { id: streamingBotId, type: 'bot', time: makeTime(), content: '', skipStream: true },
      ]);
      setIsTyping(false); // Hide typing indicator — we're now streaming content

      const updatedConv = await api.sendConversationMessageStream(
        convId,
        content,
        (chunk: string) => {
          // Append each content chunk to the streaming bot message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingBotId ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        (thinkingChunk: string) => {
          // Append each thinking chunk
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingBotId
                ? { ...m, thinking: (m.thinking || '') + thinkingChunk }
                : m
            )
          );
        },
        () => {
          // Mark thinking as done
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingBotId ? { ...m, isThinkingDone: true } : m
            )
          );
        },
        (agents) => {
          // Agents arrive one at a time from SSE — append each directly
          agents.forEach((agent) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingBotId
                  ? {
                      ...m,
                      type: 'bot-agents',
                      agents: [...(m.agents || []), agent],
                    }
                  : m
              )
            );
          });
        }
      );

      // Invalidate conversations list cache → Sidebar refetches and shows new title
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      if (updatedConv.messages?.length) {
        // Collect btnIds that were locally transitioned to bot-created
        // (linkMeeting may not have persisted yet, so server still has bot-agents)
        setMessages((currentMsgs) => {
          const localCreatedBtnIds = new Set(
            currentMsgs
              .filter((m) => m.type === 'bot-created' && m.btnId)
              .map((m) => m.btnId!)
          );
          const localCreatedMap = new Map(
            currentMsgs
              .filter((m) => m.type === 'bot-created' && m.btnId)
              .map((m) => [m.btnId!, m])
          );

          return updatedConv.messages.map((m: RawConversationMessage, i: number) => {
            let stableId = m._id || m.id;

            if (i === 0) {
              stableId = 'initial-greeting';
            } else if (m.type === 'user' && m.content === content && i >= updatedConv.messages.length - 2) {
              stableId = lastUserMsgId;
            } else if (!stableId) {
              stableId = crypto.randomUUID();
            }

            if (m.type === 'bot-agents' && m.intro) {
              // Ensure intro flows to UI if content is empty
            }

            // Preserve local bot-created transition that server hasn't persisted yet
            const localVersion = m.btnId ? localCreatedMap.get(m.btnId) : undefined;
            if (localVersion && localCreatedBtnIds.has(m.btnId!)) {
              return {
                ...localVersion,
                id: stableId,
                skipStream: true,
              } as ConvMessage;
            }

            return {
              ...m,
              id: stableId,
              isThinkingDone: !!m.thinking, // If it has thinking in history, it's done
              skipStream: true, // All messages are already shown, no animation needed
            };
          }) as ConvMessage[];
        });
      }
    } catch (err) {
      console.error('handleSend failed:', err instanceof Error ? err.message : err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'bot',
          time: makeTime(),
          content: '⚠️ Xin lỗi, tôi gặp lỗi khi xử lý. Bạn thử lại nhé!',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [currentConversationId, setCurrentConversation, setMessages, setIsTyping, queryClient]);

  const handleStartMeeting = async (btnId: string) => {
    if (creatingPool) return; // Prevent double-click

    // 1. Find the bot-agents message by btnId
    const agentMsg = messages.find(
      (m) => m.type === 'bot-agents' && m.btnId === btnId
    );
    if (!agentMsg?.agents) return;

    // 2. Get checked agent IDs
    const checkedAgentIds = agentMsg.agents
      .filter((a) => a.checked)
      .map((a) => a.agentId || a.id || '')
      .filter(Boolean);

    if (checkedAgentIds.length === 0) {
      // Show error if no agents selected
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'bot' as const,
          time: makeTime(),
          content: '⚠️ Hãy chọn ít nhất 1 agent để bắt đầu meeting!',
        },
      ]);
      return;
    }

    // 3. Determine topic: find the user message immediately before this suggestion
    const msgIndex = messages.indexOf(agentMsg);
    let topic = '';
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].type === 'user' && messages[i].content) {
        topic = messages[i].content!;
        break;
      }
    }
    if (!topic) topic = 'Discussion';

    // 4. Create pool
    setCreatingPool(btnId);
    try {
      const pool = await api.createPool(topic, checkedAgentIds, currentConversationId || '');

      // 5. Update the message locally: bot-agents → bot-created
      setMessages((prev) =>
        prev.map((m) =>
          m.btnId === btnId
            ? {
                ...m,
                type: 'bot-created' as const,
                meetingId: pool._id,
                meetingTitle: pool.title,
                agentBadges: pool.agents?.map((a) => `${a.icon} ${a.name}`) || [],
              }
            : m
        )
      );

      // 6. Persist to server (fire-and-forget — don't block navigation)
      if (currentConversationId) {
        api.linkMeetingToConversation(currentConversationId, btnId, pool._id, pool.title)
          .catch((err) => console.error('Failed to link meeting:', err));
      }

      // 7. Invalidate caches and navigate
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['pools'] });
      setTimeout(() => navigateToMeeting(pool._id), 600);
    } catch (err) {
      console.error('Failed to create pool:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'bot' as const,
          time: makeTime(),
          content: '⚠️ Không thể tạo meeting. Vui lòng thử lại!',
        },
      ]);
    } finally {
      setCreatingPool(null);
    }
  };

  const handleToggleAgent = (btnId: string, agentId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.type === 'bot-agents' && msg.agents && msg.btnId === btnId) {
          return {
            ...msg,
            agents: msg.agents.map((a) => {
              const id = a.agentId || a.id || a.name;
              if (id === agentId) {
                return { ...a, checked: !a.checked };
              }
              return a;
            }),
          };
        }
        return msg;
      }),
    );
  };

  useEffect(() => {
    if (initialSetupTopic && messages.length === 1) {
      handleSend(initialSetupTopic);
      setInitialSetupTopic(null);
    }
  }, [initialSetupTopic, messages.length, handleSend, setInitialSetupTopic]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-[22px] py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-text-muted mt-px">{sub}</div>
        </div>
        <Tag variant="green">✦ Online</Tag>
      </div>

      {/* Messages */}
      <div ref={msgsRef} className="flex-1 overflow-y-auto py-[22px] scrollbar-thin">
        {displayedMessages.map((msg, i) => {
          const msgKey = msg.id || `${msg.time}-${msg.type}-${i}`;
          return (
            <div key={msgKey}>
              {msg.thinking && (
                <div className="px-[22px] mb-1">
                  <ThinkingBlock thinking={msg.thinking} isDone={msg.isThinkingDone} />
                </div>
              )}
              {(msg.type === 'bot' || msg.type === 'bot-agents') && !msg.content && !msg.intro && (!msg.agents || msg.agents.length === 0) ? (
                <div className="flex gap-3 px-[22px] py-1 mb-1 animate-msg-in">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-accent to-purple">
                    🧠
                  </div>
                  <div className="max-w-[520px]">
                    <TypingIndicator />
                  </div>
                </div>
              ) : (
                <MessageBubble
                message={msg}
                onStartMeeting={handleStartMeeting}
                onGoToMeeting={(id) => navigateToMeeting(id)}
                onToggleAgent={handleToggleAgent}
                meetingCreated={msg.type === 'bot-created'}
                isLoading={creatingPool === msg.btnId}
              />
              )}
            </div>
          );
        })}
        {isTyping && <SetupTypingIndicator />}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
