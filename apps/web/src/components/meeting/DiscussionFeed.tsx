import { useEffect, useRef } from 'react';
import { ThinkingBlock } from './ThinkingBlock';

interface FeedMessage {
  type: 'agent' | 'user' | 'mindx' | 'typing';
  agentId?: string;
  agentName?: string;
  icon?: string;
  role?: string;
  content: string;
  thinking?: string;
  thinkSec?: number;
  timestamp: string;
}

interface DiscussionFeedProps {
  messages: FeedMessage[];
  showThinkingDefault?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-[13px] py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-[14px] rounded-tl w-fit">
      {[0, 0.2, 0.4].map((delay, i) => (
        <div
          key={i}
          className="w-[5px] h-[5px] bg-[var(--text-muted)] rounded-full animate-typing-bounce"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return ts;
  }
}

export function DiscussionFeed({ messages, showThinkingDefault = false }: DiscussionFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={feedRef}
      className="flex-1 overflow-y-auto px-[22px] py-[18px] scrollbar-thin"
    >
      {messages.map((msg, i) => {
        if (msg.type === 'user') {
          return (
            <div key={i} className="mb-[18px] flex justify-end animate-msg-in">
              <div className="max-w-[460px]">
                <div className="px-4 py-[11px] bg-[var(--accent-dim)] border border-[rgba(61,255,192,0.2)] rounded-[14px] rounded-tl-[14px] rounded-tr text-[13.5px] leading-relaxed text-[var(--text)]">
                  {msg.content}
                </div>
                <div className="text-right text-[10px] text-[var(--text-dim)] mt-1">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          );
        }

        if (msg.type === 'typing') {
          return (
            <div key={i} className="mb-[18px] animate-msg-in">
              <div className="flex items-center gap-[7px] mb-1.5">
                <span className="text-[17px]">{msg.icon}</span>
                <div>
                  <div className="text-[12.5px] font-semibold text-[var(--text)]">
                    {msg.agentName}
                  </div>
                  <div className="text-[10.5px] text-[var(--accent)]">
                    đang phát biểu...
                  </div>
                </div>
                <div className="text-[10px] text-[var(--text-dim)] ml-auto">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
              <TypingIndicator />
            </div>
          );
        }

        // agent or mindx
        const isMindX = msg.type === 'mindx';
        return (
          <div key={i} className="mb-[18px] animate-msg-in">
            <div className="flex items-center gap-[7px] mb-1.5">
              <span className="text-[17px]">{msg.icon || '🧠'}</span>
              <div>
                <div className="text-[12.5px] font-semibold text-[var(--text)]">
                  {msg.agentName || 'MindX'}
                </div>
                <div className="text-[10.5px] text-[var(--text-muted)]">
                  {msg.role || 'Orchestrator'}
                </div>
              </div>
              <div className="text-[10px] text-[var(--text-dim)] ml-auto">
                {formatTime(msg.timestamp)}
              </div>
            </div>
            {msg.thinking && msg.thinkSec && (
              <ThinkingBlock
                thinkSec={msg.thinkSec}
                content={msg.thinking}
                defaultOpen={showThinkingDefault}
              />
            )}
            <div
              className={`px-4 py-[11px] rounded-[14px] rounded-tl text-[13.5px] leading-relaxed text-[var(--text)] ${
                isMindX
                  ? 'bg-[rgba(61,255,192,0.05)] border border-[rgba(61,255,192,0.2)] border-l-2 border-l-[var(--accent)]'
                  : 'bg-[var(--surface-2)] border border-[var(--border)]'
              }`}
              dangerouslySetInnerHTML={{ __html: msg.content }}
            />
          </div>
        );
      })}
    </div>
  );
}
