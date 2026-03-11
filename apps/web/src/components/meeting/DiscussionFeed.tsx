import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStreamingQueue } from '../../hooks/useStreamingQueue';
import { ThinkingBlock } from './ThinkingBlock';

interface FeedMessage {
  id?: string;
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
    <div className="flex items-center gap-1 px-[13px] py-2.5 bg-surface-2 border border-border rounded-[14px] rounded-tl w-fit">
      {[0, 0.2, 0.4].map((delay, i) => (
        <div
          key={i}
          className="w-[5px] h-[5px] bg-text-muted rounded-full animate-typing-bounce"
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

  // Scroll to bottom when a new message arrives or streaming content updates
  const lastMsg = messages[messages.length - 1];
  const scrollTrigger = `${messages.length}-${lastMsg?.content?.length ?? 0}`;
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [scrollTrigger]);

  const displayedMessages = useStreamingQueue(messages, 20);

  return (
    <div
      ref={feedRef}
      className="flex-1 overflow-y-auto px-[22px] py-[18px] scrollbar-thin"
    >
      {displayedMessages.map((msg, i) => {
        const msgKey = msg.id || `${msg.timestamp}-${msg.type}-${i}`;
        if (msg.type === 'user') {
          return (
            <div key={msgKey} className="mb-[18px] flex justify-end animate-msg-in">
              <div className="max-w-[460px]">
                <div className="px-4 py-[11px] bg-accent-dim border border-[rgba(61,255,192,0.2)] rounded-[14px] rounded-tl-[14px] rounded-tr text-[13.5px] leading-relaxed text-text">
                  {msg.content}
                </div>
                <div className="text-right text-[10px] text-text-dim mt-1">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          );
        }

        if (msg.type === 'typing') {
          const hasStreamContent = msg.content && msg.content.length > 0;
          return (
            <div key={msgKey} className="mb-[18px] animate-msg-in">
              <div className="flex items-center gap-[7px] mb-1.5">
                <span className="text-[17px]">{msg.icon}</span>
                <div>
                  <div className="text-[12.5px] font-semibold text-text">
                    {msg.agentName}
                  </div>
                  <div className="text-[10.5px] text-accent">
                    đang phát biểu...
                  </div>
                </div>
                <div className="text-[10px] text-text-dim ml-auto">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
              {hasStreamContent ? (
                <div className="px-4 py-[11px] bg-surface-2 border border-border rounded-[14px] rounded-tl text-[13.5px] leading-relaxed text-text prose prose-invert max-w-none prose-p:my-2 prose-pre:my-3 prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-code:text-[#3DFFC0] prose-code:bg-[rgba(61,255,192,0.1)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-ul:my-2 prose-li:my-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                  <span className="inline-block w-[2px] h-[14px] bg-accent animate-pulse ml-0.5 align-middle" />
                </div>
              ) : (
                <TypingIndicator />
              )}
            </div>
          );
        }

        // agent or mindx
        const isMindX = msg.type === 'mindx';
        return (
          <div key={msgKey} className="mb-[18px] animate-msg-in">
            <div className="flex items-center gap-[7px] mb-1.5">
              <span className="text-[17px]">{msg.icon || '🧠'}</span>
              <div>
                <div className="text-[12.5px] font-semibold text-text">
                  {msg.agentName || 'MindX'}
                </div>
                <div className="text-[10.5px] text-text-muted">
                  {msg.role || 'Orchestrator'}
                </div>
              </div>
              <div className="text-[10px] text-text-dim ml-auto">
                {formatTime(msg.timestamp)}
              </div>
            </div>
            {msg.thinkSec != null && msg.thinkSec > 0 && (
              <ThinkingBlock
                thinkSec={msg.thinkSec}
                content={msg.thinking || `Analyzed context and formulated response about ${msg.role || 'this topic'}`}
                defaultOpen={showThinkingDefault}
              />
            )}
            <div
              className={`px-4 py-[11px] rounded-[14px] rounded-tl text-[13.5px] leading-relaxed text-text prose prose-invert max-w-none prose-p:my-2 prose-pre:my-3 prose-pre:bg-surface prose-pre:border prose-pre:border-border prose-code:text-[#3DFFC0] prose-code:bg-[rgba(61,255,192,0.1)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-ul:my-2 prose-li:my-0.5 ${isMindX
                ? 'bg-[rgba(61,255,192,0.05)] border border-[rgba(61,255,192,0.2)] border-l-2 border-l-accent'
                : 'bg-surface-2 border border-border'
                }`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        );
      })}
    </div>
  );
}
