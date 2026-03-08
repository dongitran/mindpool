import { useAppStore } from '../stores/appStore';
import { useMeeting } from '../hooks/useMeeting';
import { useSettingsStore } from '../stores/settingsStore';
import { AgentsPanel } from '../components/meeting/AgentsPanel';
import { DiscussionFeed } from '../components/meeting/DiscussionFeed';
import { useState } from 'react';

type ViewMode = 'chat' | 'mindmap';

export function MeetingScreen() {
  const { currentMeetingId, setScreen } = useAppStore();
  const { pool, messages, agentStates, queue, sendMessage } = useMeeting(currentMeetingId);
  const { showThinkingDefault } = useSettingsStore();
  const [view, setView] = useState<ViewMode>('chat');

  const isLive = pool?.status === 'active';
  const isCompleted = pool?.status === 'completed';

  const handleSend = () => {
    const input = document.getElementById('meeting-input') as HTMLTextAreaElement;
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    sendMessage(val);
    input.value = '';
    input.style.height = 'auto';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Topbar */}
      <div className="px-[18px] py-3 border-b border-[var(--border)] flex items-center gap-3.5 flex-shrink-0 bg-[var(--surface-1)]">
        <button
          onClick={() => setScreen('setup')}
          className="py-[5px] px-[11px] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-xs)] text-[var(--text-muted)] font-[Sora] text-[11.5px] cursor-pointer flex items-center gap-[5px] transition-all hover:text-[var(--text)] hover:border-[var(--border-light)]"
        >
          ← Back
        </button>
        <div className="flex-1">
          <div className="text-[14.5px] font-semibold text-[var(--text)]">
            {pool?.title || '—'}
          </div>
          <div className="flex items-center gap-[5px] mt-0.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isLive
                  ? 'bg-[var(--accent)] animate-pulse'
                  : 'bg-[var(--amber)]'
              }`}
            />
            <span className="text-[11px] text-[var(--text-muted)]">
              {pool?.statusText || '—'}
            </span>
          </div>
        </div>
        <div className="flex gap-[3px] p-[3px] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)]">
          <button
            onClick={() => setView('chat')}
            className={`py-[5px] px-[11px] rounded-md text-[11.5px] font-medium cursor-pointer transition-all flex items-center gap-1 border-none bg-transparent font-[Sora] ${
              view === 'chat'
                ? 'bg-[var(--surface-3)] text-[var(--text)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setView('mindmap')}
            className={`py-[5px] px-[11px] rounded-md text-[11.5px] font-medium cursor-pointer transition-all flex items-center gap-1 border-none bg-transparent font-[Sora] ${
              view === 'mindmap'
                ? 'bg-[var(--surface-3)] text-[var(--text)]'
                : 'text-[var(--text-muted)] opacity-50'
            }`}
            title="Coming Phase 2"
          >
            🗺 Mindmap
          </button>
        </div>
      </div>

      {/* Body */}
      {view === 'chat' ? (
        <div className="flex-1 flex overflow-hidden">
          <AgentsPanel
            agents={pool?.agents || []}
            agentStates={agentStates}
            queue={queue}
          />
          <DiscussionFeed
            messages={messages}
            showThinkingDefault={showThinkingDefault}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg)] text-[var(--text-muted)] text-sm">
          🗺 Mindmap View — Coming in Phase 2
        </div>
      )}

      {/* Input */}
      <div className="px-[18px] py-3 pb-[15px] border-t border-[var(--border)] flex-shrink-0">
        <div className="text-[10.5px] text-[var(--text-muted)] mb-[7px] flex items-center gap-1.5">
          <span className="px-1.5 py-px bg-[var(--surface-2)] border border-[var(--border)] rounded font-mono text-[10px]">
            @agent
          </span>
          để hỏi riêng một agent · Agents tự raise hand khi có ý kiến
        </div>
        <div className="flex items-end gap-2.5 px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border-light)] rounded-[var(--radius)] transition-colors focus-within:border-[rgba(61,255,192,0.4)]">
          <textarea
            id="meeting-input"
            className="flex-1 bg-transparent border-none outline-none text-[var(--text)] font-[Sora] text-[13.5px] resize-none leading-relaxed max-h-[120px] overflow-y-auto placeholder:text-[var(--text-muted)]"
            placeholder={
              isCompleted
                ? '✓ Meeting đã kết thúc — chỉ xem lịch sử'
                : 'Nhắn tin với tất cả agents, hoặc @agent để hỏi riêng...'
            }
            rows={1}
            disabled={isCompleted}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = t.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={isCompleted}
            className="w-[30px] h-[30px] bg-[var(--accent)] border-none rounded-[7px] text-[var(--bg)] cursor-pointer flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 text-sm disabled:opacity-35 disabled:pointer-events-none"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
