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

export function SetupScreen() {
  const { currentConversationId, navigateToMeeting } = useAppStore();
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [title, setTitle] = useState('MindX');
  const [sub, setSub] = useState('Mô tả chủ đề — AI sẽ gợi ý agents phù hợp');
  const [createdMeetings, setCreatedMeetings] = useState<Set<string>>(new Set());
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentConversationId) {
      api.getConversation(currentConversationId).then((conv) => {
        setTitle(conv.title || 'MindX');
        setSub(conv.sub || '');
        setMessages((conv.messages as ConvMessage[]) || []);
      }).catch(() => {
        // New conversation — show greeting
        setMessages([{
          type: 'bot',
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          content: 'Xin chào! Tôi là <strong>MindX</strong> — trợ lý điều phối của Mindpool.<br><br>Hãy mô tả chủ đề bạn muốn thảo luận — tôi sẽ gợi ý những expert agent phù hợp nhất và tạo <strong>Mindpool</strong> cho bạn. 🎯',
        }]);
      });
    } else {
      setMessages([{
        type: 'bot',
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        content: 'Xin chào! Tôi là <strong>MindX</strong> — trợ lý điều phối của Mindpool.<br><br>Hãy mô tả chủ đề bạn muốn thảo luận — tôi sẽ gợi ý những expert agent phù hợp nhất và tạo <strong>Mindpool</strong> cho bạn. 🎯',
      }]);
    }
  }, [currentConversationId]);

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setMessages((prev) => [...prev, { type: 'user', time: now, content }]);

    try {
      if (currentConversationId) {
        const reply = await api.sendConversationMessage(currentConversationId, content) as { message?: ConvMessage };
        if (reply?.message) {
          setMessages((prev) => [...prev, reply.message!]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          time: now,
          content: 'Tôi hiểu rồi! Bạn muốn điều chỉnh agent lineup hoặc sẵn sàng bắt đầu meeting?',
        },
      ]);
    }
  };

  const handleStartMeeting = async (meetingId: string) => {
    setCreatedMeetings((prev) => new Set(prev).add(meetingId));
    // In real app: POST /api/pool/create
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
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} />
    </div>
  );
}
