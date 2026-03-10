interface Agent {
  icon: string;
  name: string;
  desc: string;
  checked: boolean;
}

interface AgentSuggestionProps {
  agents: Agent[];
  meetingId: string;
  meetingCreated?: boolean;
  onToggle: (index: number) => void;
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
    <div className="mt-[11px] flex flex-col gap-[5px]">
      {agents.map((agent, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 p-2 px-[11px] rounded-sm border transition-all ${
            agent.checked
              ? 'bg-accent-dim border-[rgba(61,255,192,0.3)]'
              : 'bg-surface-3 border-border-light'
          }`}
        >
          <div
            onClick={() => onToggle(i)}
            className={`w-[17px] h-[17px] rounded-[5px] border-[1.5px] flex items-center justify-center text-[9px] flex-shrink-0 cursor-pointer transition-all ${
              agent.checked
                ? 'bg-accent border-accent text-bg'
                : 'border-border-light'
            }`}
          >
            {agent.checked ? '✓' : ''}
          </div>
          <div className="text-[15px]">{agent.icon}</div>
          <div className="flex-1">
            <div className="text-[12.5px] font-semibold text-text">
              {agent.name}
            </div>
            <div className="text-[10.5px] text-text-muted mt-px">
              {agent.desc}
            </div>
          </div>
        </div>
      ))}

      {meetingCreated ? (
        <button
          onClick={onGoto}
          className="mt-[13px] w-full py-[11px] px-[18px] bg-surface-3 text-accent border border-[rgba(61,255,192,0.3)] rounded-sm font-[Sora] text-[13.5px] font-bold cursor-pointer flex items-center justify-center gap-2"
        >
          → Vào Meeting
        </button>
      ) : (
        <button
          onClick={onStart}
          className="mt-[13px] w-full py-[11px] px-[18px] bg-gradient-to-br from-accent to-[#2de8a8] border-none rounded-sm text-bg font-[Sora] text-[13.5px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(61,255,192,0.3)]"
        >
          🚀 Bắt đầu Meeting
        </button>
      )}
    </div>
  );
}
