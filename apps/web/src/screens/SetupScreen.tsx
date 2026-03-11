import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { Tag } from '../components/ui/Tag';
import { api } from '../lib/api';
import { useStreamingQueue } from '../hooks/useStreamingQueue';

interface ConvMessage {
  id?: string;
  type: 'bot' | 'user' | 'bot-agents' | 'bot-created';
  time: string;
  content?: string;
  intro?: string;
  agents?: { id?: string; agentId?: string; icon: string; name: string; desc: string; checked: boolean }[];
  btnId?: string;
  meetingId?: string;
  meetingTitle?: string;
  agentBadges?: string[];
  skipStream?: boolean;
}

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


const makeTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

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
  const [createdMeetings, setCreatedMeetings] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const msgsRef = useRef<HTMLDivElement>(null);
  // Skip fetching conversation when we've just locally created it in handleSend
  const skipNextFetch = useRef(false);

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
          const historyMsgs = conv.messages.map((m: any, i: number) => ({
            ...m,
            id: i === 0 ? 'initial-greeting' : (m._id || m.id || crypto.randomUUID()),
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

  const handleSend = async (content: string) => {
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

      // ── Step 2: send message — backend returns the updated Conversation ────
      // Keep track of our local user message ID to prevent flicker
      const lastUserMsgId = userMsg.id;
      const updatedConv = await api.sendConversationMessage(convId, content);
      console.log('DEBUG: API Response updatedConv:', updatedConv);

      if (updatedConv.messages?.length) {
        console.log('DEBUG: setMessages will run with length:', updatedConv.messages.length);
        // Replace entire local message array with whatever the backend knows, 
        // to stay perfectly in sync. Ensure all have string IDs and skipStream for old messages.
        setMessages(
          updatedConv.messages.map((m: any, i: number) => {
            let stableId = m._id || m.id;

            // 1. Force Greeting stability
            if (i === 0) {
              stableId = 'initial-greeting';
            } 
            // 2. Try to match the user message we just sent locally
            else if (m.type === 'user' && m.content === content && i >= updatedConv.messages.length - 2) {
              stableId = lastUserMsgId;
            }
            // 3. Fallback to server ID or new UUID
            else if (!stableId) {
              stableId = crypto.randomUUID();
            }

            return {
              ...m,
              id: stableId,
              skipStream: i < updatedConv.messages.length - 1,
            };
          }) as ConvMessage[]
        );
      } else {
        console.log('DEBUG: No .messages array found on updatedConv', Object.keys(updatedConv));
      }
    } catch (err) {
      console.error('DEBUG: catch error in handleSend', err);
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
  };

  const handleStartMeeting = async (meetingId: string) => {
    setCreatedMeetings((prev) => new Set(prev).add(meetingId));
    setTimeout(() => navigateToMeeting(meetingId), 600);
  };

  const handleToggleAgent = (_btnId: string, agentId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.type === 'bot-agents' && msg.agents) {
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
  }, [initialSetupTopic, messages.length]);

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
            <MessageBubble
              key={msgKey}
              message={msg}
              onStartMeeting={handleStartMeeting}
              onGoToMeeting={(id) => navigateToMeeting(id)}
              onToggleAgent={handleToggleAgent}
              meetingCreated={msg.meetingId ? createdMeetings.has(msg.meetingId) : false}
            />
          );
        })}
        {isTyping && <SetupTypingIndicator />}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
