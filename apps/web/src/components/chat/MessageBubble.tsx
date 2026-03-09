import DOMPurify from 'dompurify';
import { AgentSuggestion } from './AgentSuggestion';

interface MessageProps {
  message: {
    type: 'bot' | 'user' | 'bot-agents' | 'bot-created';
    time: string;
    content?: string;
    intro?: string;
    agents?: { icon: string; name: string; desc: string; checked: boolean }[];
    btnId?: string;
    meetingId?: string;
    meetingTitle?: string;
    agentBadges?: string[];
  };
  onStartMeeting?: (meetingId: string) => void;
  onGoToMeeting?: (meetingId: string) => void;
  onToggleAgent?: (btnId: string, index: number) => void;
  meetingCreated?: boolean;
}

export function MessageBubble({
  message,
  onStartMeeting,
  onGoToMeeting,
  onToggleAgent,
  meetingCreated,
}: MessageProps) {
  if (message.type === 'user') {
    return (
      <div className="flex justify-end px-[22px] py-1 animate-msg-in">
        <div className="max-w-[520px]">
          <div className="px-4 py-[11px] rounded-[14px] rounded-tr bg-[var(--accent-dim)] border border-[rgba(61,255,192,0.2)] text-[var(--text)] text-[13.5px] leading-relaxed">
            {message.content}
          </div>
          <div className="text-[10px] text-[var(--text-dim)] mt-1 px-1 text-right">
            {message.time}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold bg-[var(--surface-3)] border border-[var(--border-light)] text-[var(--text-muted)] ml-3 mt-0.5">
          DT
        </div>
      </div>
    );
  }

  if (message.type === 'bot') {
    return (
      <div className="flex gap-3 px-[22px] py-1 animate-msg-in">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-[var(--accent)] to-[var(--purple)]">
          🧠
        </div>
        <div className="max-w-[520px]">
          <div
            className="px-4 py-[11px] rounded-[14px] rounded-tl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-[13.5px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content || '') }}
          />
          <div className="text-[10px] text-[var(--text-dim)] mt-1 px-1">
            {message.time}
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'bot-agents') {
    return (
      <div className="flex gap-3 px-[22px] py-1 animate-msg-in">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-[var(--accent)] to-[var(--purple)]">
          🧠
        </div>
        <div className="max-w-[520px]">
          <div className="px-4 py-[11px] rounded-[14px] rounded-tl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-[13.5px] leading-relaxed">
            <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.intro || '') }} />
            <AgentSuggestion
              agents={message.agents || []}
              meetingId={message.meetingId || ''}
              meetingCreated={meetingCreated}
              onToggle={(i) => onToggleAgent?.(message.btnId || '', i)}
              onStart={() => onStartMeeting?.(message.meetingId || '')}
              onGoto={() => onGoToMeeting?.(message.meetingId || '')}
            />
          </div>
          <div className="text-[10px] text-[var(--text-dim)] mt-1 px-1">
            {message.time}
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'bot-created') {
    return (
      <div className="flex gap-3 px-[22px] py-1 animate-msg-in">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] mt-0.5 bg-gradient-to-br from-[var(--accent)] to-[var(--purple)]">
          🧠
        </div>
        <div className="max-w-[520px]">
          <div className="mt-[11px] p-[13px_15px] bg-[var(--surface-3)] border border-[rgba(61,255,192,0.25)] rounded-[var(--radius)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[3px] h-full bg-[var(--accent)]" />
            <div className="flex items-center gap-2 mb-[7px]">
              <span className="text-[9.5px] font-bold px-2 py-0.5 bg-[var(--accent-dim)] border border-[rgba(61,255,192,0.3)] text-[var(--accent)] rounded-full uppercase tracking-wider">
                ✓ Created
              </span>
            </div>
            <div className="text-[13.5px] font-semibold text-[var(--text)] mb-[7px]">
              🧠 {message.meetingTitle}
            </div>
            <div className="flex gap-[5px] flex-wrap mb-2.5">
              {message.agentBadges?.map((badge, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 bg-[var(--surface-2)] border border-[var(--border-light)] rounded-full text-[10.5px] text-[var(--text-muted)] flex items-center gap-1"
                >
                  {badge}
                </span>
              ))}
            </div>
            <button
              onClick={() => onGoToMeeting?.(message.meetingId || '')}
              className="px-4 py-[7px] bg-[var(--accent-dim)] border border-[rgba(61,255,192,0.3)] rounded-[var(--radius-xs)] text-[var(--accent)] font-[Sora] text-[12.5px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-all hover:bg-[rgba(61,255,192,0.18)]"
            >
              → Vào Meeting Room
            </button>
          </div>
          <div className="text-[10px] text-[var(--text-dim)] mt-1 px-1">
            {message.time}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
