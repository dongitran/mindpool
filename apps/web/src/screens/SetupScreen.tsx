import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { Tag } from '../components/ui/Tag';
import { api } from '../lib/api';

interface ConvMessage {
  type: 'bot' | 'user' | 'bot-agents' | 'bot-created';
  time: string;
  content?: string;
  intro?: string;
  agents?: { icon: string; name: string; desc: string; checked: boolean }[];
  btnId?: string;
  meetingId?: string;
  meetingTitle?: string;
  agentBadges?: string[];
}

/** Animated "MindX is typing..." indicator */
function TypingIndicator() {
  return (
    <div className="px-[22px] py-2 flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        🤖
      </div>
      <div
        className="px-3.5 py-2.5 rounded-[var(--radius)] flex items-center gap-1"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--text-muted)', animation: 'typingDot 1.2s ease-in-out infinite', animationDelay: '0s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--text-muted)', animation: 'typingDot 1.2s ease-in-out infinite', animationDelay: '0.2s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--text-muted)', animation: 'typingDot 1.2s ease-in-out infinite', animationDelay: '0.4s' }}
        />
        <span className="text-[11px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
          MindX đang suy nghĩ...
        </span>
      </div>
    </div>
  );
}

const makeTime = () =>
  new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const GREETING: ConvMessage = {
  type: 'bot',
  time: makeTime(),
  content:
    'Xin chào! Tôi là <strong>MindX</strong> — trợ lý điều phối của Mindpool.<br><br>Hãy mô tả chủ đề bạn muốn thảo luận — tôi sẽ gợi ý những expert agent phù hợp nhất và tạo <strong>Mindpool</strong> cho bạn. 🎯',
};

export function SetupScreen() {
  const { currentConversationId, setCurrentConversation, navigateToMeeting } = useAppStore();
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
          setMessages(conv.messages as ConvMessage[]);
        }
      })
      .catch(() => {
        // Keep local messages if fetch fails
      });
  }, [currentConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (content: string) => {
    const userMsg: ConvMessage = { type: 'user', time: makeTime(), content };
    setMessages((prev) => [...prev, userMsg]);
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

      // ── Step 2: send message — backend returns { message: botMessage } ────
      const result = await api.sendConversationMessage(convId, content) as {
        message?: ConvMessage;
      };

      if (result.message) {
        setMessages((prev) => [...prev, result.message as ConvMessage]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
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

  const handleToggleAgent = (_btnId: string, index: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.type === 'bot-agents' && msg.agents) {
          const newAgents = [...msg.agents];
          newAgents[index] = { ...newAgents[index], checked: !newAgents[index].checked };
          return { ...msg, agents: newAgents };
        }
        return msg;
      }),
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-[22px] py-3.5 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-[var(--text-muted)] mt-px">{sub}</div>
        </div>
        <Tag variant="green">✦ Online</Tag>
      </div>

      {/* Messages */}
      <div ref={msgsRef} className="flex-1 overflow-y-auto py-[22px] scrollbar-thin">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            onStartMeeting={handleStartMeeting}
            onGoToMeeting={(id) => navigateToMeeting(id)}
            onToggleAgent={handleToggleAgent}
            meetingCreated={msg.meetingId ? createdMeetings.has(msg.meetingId) : false}
          />
        ))}
        {isTyping && <TypingIndicator />}
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isTyping} />
    </div>
  );
}
