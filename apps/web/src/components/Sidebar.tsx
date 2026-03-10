import { useAppStore, Screen } from '../stores/appStore';

interface SidebarMeeting {
  _id: string;
  title: string;
  status: string;
  agents: { icon: string }[];
  duration?: number;
  updatedAt?: string;
}

interface SidebarConversation {
  _id: string;
  title: string;
  sub: string;
  meetings?: SidebarMeeting[];
}

interface SidebarProps {
  meetings: SidebarMeeting[];
  conversations: SidebarConversation[];
}

function formatMeta(m: SidebarMeeting) {
  const icons = m.agents?.map((a) => a.icon).join('') || '';
  const statusLabel = m.status === 'active' ? 'Live' : 'Done';
  return `${icons} · ${statusLabel}`;
}

export function Sidebar({ meetings, conversations }: SidebarProps) {
  const {
    currentScreen,
    currentMeetingId,
    currentConversationId,
    setScreen,
    navigateToMeeting,
    navigateToSetup,
  } = useAppStore();

  return (
    <div className="w-[var(--sidebar-w)] flex-shrink-0 bg-surface-1 border-r border-border flex flex-col h-screen overflow-hidden">
      {/* Top */}
      <div className="px-3.5 pt-[18px] pb-3.5 border-b border-border flex-shrink-0">
        <div
          className="flex items-center gap-2.5 mb-3.5 cursor-pointer"
          onClick={() => setScreen('welcome')}
        >
          <div className="w-[30px] h-[30px] bg-gradient-to-br from-accent to-purple rounded-lg flex items-center justify-center text-[15px]">
            🧠
          </div>
          <span className="font-['DM_Serif_Display',serif] text-[19px] bg-gradient-to-br from-accent to-purple bg-clip-text text-transparent">
            Mindpool
          </span>
        </div>
        <button
          onClick={() => navigateToSetup()}
          className="w-full py-2.5 px-3.5 bg-accent-dim border border-[rgba(61,255,192,0.22)] rounded-sm text-accent font-[Sora] text-[13px] font-semibold cursor-pointer flex items-center gap-2 transition-all hover:bg-[rgba(61,255,192,0.18)] hover:border-[rgba(61,255,192,0.38)]"
        >
          <span>✦</span> New Pool
        </button>
      </div>

      {/* Body — split into 2 equal sections */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Meetings — 50% */}
        <div className="flex-1 overflow-y-auto px-2 pt-1 scrollbar-thin">
          <div className="px-2 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-text-dim">
            Meetings
          </div>

          {meetings.map((m) => (
            <div
              key={m._id}
              onClick={() => navigateToMeeting(m._id)}
              className={`flex items-center gap-2.5 py-2.5 px-2.5 rounded-sm cursor-pointer transition-colors mb-0.5 ${currentScreen === 'meeting' && currentMeetingId === m._id
                  ? 'bg-surface-3'
                  : 'hover:bg-surface-2'
                }`}
            >
              <div
                className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${m.status === 'active'
                    ? 'bg-accent animate-pulse'
                    : 'bg-amber'
                  }`}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-text truncate">
                  {m.title}
                </div>
                <div className="text-[10.5px] text-text-muted mt-px">
                  {formatMeta(m)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border)] mx-3 flex-shrink-0" />

        {/* Conversations — 50% */}
        <div className="flex-1 overflow-y-auto px-2 pt-1 pb-2 scrollbar-thin">
          <div className="px-2 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-text-dim">
            Conversations
          </div>

          {conversations.map((c) => (
            <div key={c._id}>
              <div
                onClick={() => navigateToSetup(c._id)}
                className={`py-2.5 px-2.5 rounded-sm cursor-pointer transition-colors mb-0.5 ${currentScreen === 'setup' && currentConversationId === c._id
                    ? 'bg-surface-3'
                    : 'hover:bg-surface-2'
                  }`}
              >
                <div className="text-[12.5px] text-text truncate mb-1">
                  {c.title}
                </div>
                <div className="text-[10.5px] text-text-muted">{c.sub}</div>

                {/* Meeting chips inside conversation */}
                {c.meetings && c.meetings.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    {c.meetings.map((m) => (
                      <div
                        key={m._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToMeeting(m._id);
                        }}
                        className="py-[5px] px-2.5 bg-surface-3 border border-border-light rounded-md cursor-pointer transition-all flex items-center gap-1.5 hover:border-accent hover:bg-accent-dim"
                      >
                        <div
                          className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${m.status === 'active' ? 'bg-accent' : 'bg-amber'
                            }`}
                        />
                        <span className="text-[11px] text-text-muted flex-1 truncate">
                          {m.title}
                        </span>
                        <span className="text-[10px] text-text-dim">→</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-2 py-2 pb-3 border-t border-border flex-shrink-0">
        {(['history', 'settings'] as Screen[]).map((s) => (
          <div
            key={s}
            onClick={() => setScreen(s)}
            className={`flex items-center gap-2 py-[7px] px-2.5 rounded-sm cursor-pointer text-[12.5px] text-text-muted transition-all hover:bg-surface-2 hover:text-text ${currentScreen === s ? 'bg-surface-3 text-text' : ''
              }`}
          >
            <span className="text-[13px]">{s === 'history' ? '📋' : '⚙️'}</span>
            {s === 'history' ? 'All Pools' : 'Settings'}
          </div>
        ))}
      </div>
    </div>
  );
}
