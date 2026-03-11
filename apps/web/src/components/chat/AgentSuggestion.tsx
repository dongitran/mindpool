interface Agent {
  id?: string;
  agentId?: string;
  icon: string;
  name: string;
  desc: string;
  checked: boolean;
}

interface AgentSuggestionProps {
  agents: Agent[];
  meetingId: string;
  meetingCreated?: boolean;
  onToggle: (agentId: string) => void;
  onStart: () => void;
  onGoto: () => void;
}

export function AgentSuggestion({
  agents,
  meetingCreated,
  onToggle,
  onStart,
  onGoto,
}: AgentSuggestionProps) {
  return (
    <div className="mt-4 flex flex-col gap-2">
      {agents
        .filter((a) => a.name !== 'MindX')
        .map((agent, i) => (
          <div
            key={i}
            onClick={() => onToggle(agent.agentId || agent.id || agent.name)}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:border-[rgba(61,255,192,0.4)] ${
              agent.checked
                ? 'bg-accent/10 border-accent/30'
                : 'bg-surface-3 border-white/5'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-sm flex-shrink-0 transition-all ${
                agent.checked
                  ? 'bg-accent border-accent text-bg'
                  : 'border-white/10'
              }`}
            >
              {agent.checked ? '✓' : ''}
            </div>
            <div className="text-2xl">{agent.icon}</div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-text mb-0.5">
                {agent.name}
              </div>
              <div className="text-[13px] text-text-muted leading-tight">
                {agent.desc}
              </div>
            </div>
          </div>
        ))}

      {meetingCreated ? (
        <button
          onClick={onGoto}
          className="mt-4 w-full py-4 px-6 bg-surface-3 text-accent border border-accent/30 rounded-xl font-[Sora] text-base font-bold cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-surface-4"
        >
          → Vào Meeting
        </button>
      ) : (
        <button
          onClick={onStart}
          className="mt-4 w-full py-4 px-6 bg-gradient-to-br from-accent to-[#2de8a8] border-none rounded-xl text-bg font-[Sora] text-base font-bold cursor-pointer flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(61,255,192,0.3)] active:translate-y-[1px]"
        >
          🚀 Bắt đầu Meeting
        </button>
      )}
    </div>
  );
}
