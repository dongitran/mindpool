import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentSuggestion } from './AgentSuggestion';

// Defensive replacement for old database entries that might contain raw HTML
const sanitizeMarkdown = (text?: string) => {
  if (!text) return '';
  return text
    .replace(/<strong>/g, '**')
    .replace(/<\/strong>/g, '**')
    .replace(/<br\s*\/?>/g, '\n');
};

// Format time for display — handles ISO strings (new) and legacy 'HH:mm' (old DB data)
const formatTime = (time: string) => {
  const date = new Date(time);
  if (!isNaN(date.getTime()) && time.length > 5) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return time; // Legacy "HH:mm" format — return as-is
};

interface MessageProps {
  message: {
    type: 'bot' | 'user' | 'bot-agents' | 'bot-created';
    time: string;
    content?: string;
    intro?: string;
    agents?: { id?: string; agentId?: string; icon: string; name: string; desc: string; checked: boolean }[];
    btnId?: string;
    meetingId?: string;
    meetingTitle?: string;
    agentBadges?: string[];
  };
  onStartMeeting?: (btnId: string) => void;
  onGoToMeeting?: (meetingId: string) => void;
  onToggleAgent?: (btnId: string, agentId: string) => void;
  meetingCreated?: boolean;
  isLoading?: boolean;
}

export function MessageBubble({
  message,
  onStartMeeting,
  onGoToMeeting,
  onToggleAgent,
  meetingCreated,
  isLoading,
}: MessageProps) {
  if (message.type === 'user') {
    return (
      <div className="flex justify-end gap-3 px-[22px] py-1 mb-1 animate-msg-in">
        <div className="max-w-[520px]">
          <div className="px-[15px] py-[11px] rounded-[14px] rounded-tr-[4px] bg-accent-dim border border-[rgba(61,255,192,0.2)] text-text text-[13.5px] leading-[1.65]">
            {message.content}
          </div>
          <div className="text-[10px] text-text-dim mt-1 px-1 text-right">
            {formatTime(message.time)}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold bg-surface-3 border border-border-light text-text-muted mt-0.5">
          DT
        </div>
      </div>
    );
  }

  if (message.type === 'bot') {
    return (
      <div className="flex gap-3 px-[22px] py-1 mb-1 animate-msg-in">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-accent to-purple">
          🧠
        </div>
        <div className="max-w-[520px]">
          <div className="px-[15px] py-[11px] rounded-[14px] rounded-tl-[4px] bg-surface-2 border border-border text-text text-[13.5px] leading-[1.65] prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-surface-3 prose-pre:border prose-pre:border-border-light prose-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sanitizeMarkdown(message.content)}
            </ReactMarkdown>
          </div>
          <div className="text-[10px] text-text-dim mt-1 px-1">
            {formatTime(message.time)}
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'bot-agents') {
    return (
      <div className="flex gap-3 px-[22px] py-1 mb-1 animate-msg-in">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-accent to-purple">
          🧠
        </div>
        <div className="max-w-[520px]">
          {(message.intro || message.content) && (
            <div className="px-[15px] py-[11px] rounded-[14px] rounded-tl-[4px] bg-surface-2 border border-border text-text text-[13.5px] leading-[1.65] prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-surface-3 prose-pre:border prose-pre:border-border-light prose-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sanitizeMarkdown(message.intro || message.content)}
              </ReactMarkdown>
            </div>
          )}
          <AgentSuggestion
            agents={message.agents || []}
            meetingCreated={meetingCreated}
            isLoading={isLoading}
            onToggle={(agentId) => onToggleAgent?.(message.btnId || '', agentId)}
            onStart={() => onStartMeeting?.(message.btnId || '')}
            onGoto={() => onGoToMeeting?.(message.meetingId || '')}
          />
          <div className="text-[10px] text-text-dim mt-1 px-1">
            {formatTime(message.time)}
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'bot-created') {
    return (
      <div className="flex gap-3 px-[22px] py-1 animate-msg-in">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-accent to-purple">
          🧠
        </div>
        <div className="max-w-[520px]">
          <div className="mt-[11px] py-[13px] px-[15px] bg-surface-3 border border-[rgba(61,255,192,0.25)] rounded-[12px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-accent" />
            <div className="flex items-center gap-2 mb-[7px]">
              <span className="text-[9.5px] font-bold px-2 py-0.5 bg-accent-dim border border-[rgba(61,255,192,0.3)] text-accent rounded-full uppercase tracking-wider">
                ✓ Created
              </span>
            </div>
            <div className="text-[13.5px] font-semibold text-text mb-[7px]">
              🧠 {message.meetingTitle}
            </div>
            <div className="flex gap-[5px] flex-wrap mb-2.5">
              {message.agentBadges?.map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-0.5 bg-surface-2 border border-border-light rounded-full text-[10.5px] text-text-muted flex items-center gap-1"
                >
                  {badge}
                </span>
              ))}
            </div>
            <button
              onClick={() => onGoToMeeting?.(message.meetingId || '')}
              className="px-4 py-[7px] bg-accent-dim border border-[rgba(61,255,192,0.3)] rounded-xs text-accent font-[Sora] text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all hover:bg-[rgba(61,255,192,0.18)]"
            >
              → Vào Meeting Room
            </button>
          </div>
          <div className="text-[10px] text-text-dim mt-1 px-1">
            {formatTime(message.time)}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
