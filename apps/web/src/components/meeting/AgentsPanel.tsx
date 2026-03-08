import { RaiseHandBadge } from './RaiseHandBadge';

interface AgentInfo {
  agentId?: string;
  icon: string;
  name: string;
  role: string;
  state: string;
  queuePosition?: number;
}

interface AgentsPanelProps {
  agents: AgentInfo[];
  agentStates?: Record<string, string>;
  queue?: { agentId: string; position: number }[];
}

function SpeakingWave() {
  return (
    <div className="flex items-center gap-0.5 h-[13px]">
      {[4, 9, 13, 7, 5].map((h, i) => (
        <div
          key={i}
          className="w-0.5 bg-[var(--accent)] rounded-sm animate-wave-bounce"
          style={{
            height: `${h}px`,
            animationDelay: `${[0, 0.1, 0.2, 0.15, 0.05][i]}s`,
          }}
        />
      ))}
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentInfo }) {
  const stateStyles: Record<string, string> = {
    moderating: 'bg-[rgba(61,255,192,0.06)] border-[rgba(61,255,192,0.18)]',
    speaking: 'bg-[var(--accent-dim)] border-[rgba(61,255,192,0.25)]',
    queued: 'bg-[var(--purple-dim)] border-[rgba(139,124,248,0.2)]',
    listening: 'bg-[var(--surface-2)] border-transparent',
  };

  const badgeStyles: Record<string, { cls: string; label: string }> = {
    moderating: { cls: 'bg-[rgba(61,255,192,0.1)] text-[var(--accent)] border-[rgba(61,255,192,0.25)]', label: '✦ Moderating' },
    speaking: { cls: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[rgba(61,255,192,0.3)]', label: '🎤 Speaking' },
    queued: { cls: 'bg-[var(--purple-dim)] text-[var(--purple)] border-[rgba(139,124,248,0.25)]', label: `✋ Queue #${agent.queuePosition || ''}` },
    listening: { cls: 'bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]', label: '○ Listening' },
  };

  const style = stateStyles[agent.state] || stateStyles.listening;
  const badge = badgeStyles[agent.state] || badgeStyles.listening;

  return (
    <div
      className={`p-2.5 rounded-[var(--radius-sm)] mb-1 border transition-all cursor-pointer ${style}`}
    >
      <div className="flex items-center gap-[7px]">
        <div className="text-[17px] w-[26px] text-center flex-shrink-0">
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11.5px] font-semibold text-[var(--text)] truncate">
            {agent.name}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-px">
            {agent.role}
          </div>
        </div>
        {agent.state === 'queued' && agent.queuePosition && (
          <RaiseHandBadge position={agent.queuePosition} />
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {agent.state === 'speaking' && <SpeakingWave />}
        {agent.state !== 'speaking' && <div />}
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-1 border ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}

export function AgentsPanel({ agents, agentStates = {}, queue = [] }: AgentsPanelProps) {
  // Merge states from SSE updates
  const mergedAgents = agents.map((a) => {
    const sseState = a.agentId ? agentStates[a.agentId] : undefined;
    const queueItem = a.agentId ? queue.find((q) => q.agentId === a.agentId) : undefined;
    return {
      ...a,
      state: sseState || a.state,
      queuePosition: queueItem?.position,
    };
  });

  return (
    <div className="w-[210px] flex-shrink-0 border-r border-[var(--border)] p-3.5 px-2.5 overflow-y-auto bg-[var(--surface-1)]">
      <div className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)] mb-2.5 px-1">
        Agents · {mergedAgents.length}
      </div>
      {mergedAgents.map((agent, i) => (
        <AgentCard key={i} agent={agent} />
      ))}
      <button className="w-full py-[7px] bg-transparent border border-dashed border-[var(--border-light)] rounded-[var(--radius-sm)] text-[var(--text-muted)] font-[Sora] text-[11.5px] cursor-pointer flex items-center justify-center gap-[5px] mt-[7px] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]">
        ＋ Add Agent
      </button>
    </div>
  );
}
