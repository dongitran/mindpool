import { useAppStore } from '../stores/appStore';

const FEATURES = [
  { icon: '🙋', title: 'Raise Hand Queue', desc: 'Agents tự đăng ký phát biểu, không ai nói cùng lúc' },
  { icon: '🗺', title: 'Mindmap View', desc: 'Visualize cuộc thảo luận thành sơ đồ tư duy trực quan' },
  { icon: '⚡', title: 'Smart Setup', desc: 'AI gợi ý agent phù hợp nhất cho từng chủ đề của bạn' },
  { icon: '📋', title: 'Auto Recap', desc: 'Tổng hợp kết luận và action items sau mỗi meeting' },
];

const TOPIC_PILLS = [
  { icon: '📱', label: 'Nên build mobile app không?' },
  { icon: '💼', label: 'Pricing strategy cho SaaS' },
  { icon: '🏗', label: 'Review system architecture' },
  { icon: '👥', label: 'Chiến lược tuyển dụng' },
];

export function WelcomeScreen() {
  const { navigateToSetup } = useAppStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 relative overflow-y-auto">
      {/* Glow background */}
      <div className="absolute w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(61,255,192,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="text-[52px] mb-5 drop-shadow-[0_0_24px_rgba(61,255,192,0.3)]">
        🧠
      </div>

      <h1 className="font-['DM_Serif_Display',serif] text-4xl text-center mb-2.5 tracking-tight">
        Welcome to{' '}
        <span className="bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] bg-clip-text text-transparent">
          Mindpool
        </span>
      </h1>

      <p className="text-[15px] text-[var(--text-muted)] text-center max-w-[420px] leading-[1.7] mb-9">
        Tạo một phòng họp với những chuyên gia AI tốt nhất — mỗi agent một góc nhìn,
        cùng giúp bạn đưa ra quyết định tốt hơn.
      </p>

      <button
        onClick={() => navigateToSetup()}
        className="py-[13px] px-7 bg-gradient-to-br from-[var(--accent)] to-[#2de8a8] border-none rounded-[var(--radius-sm)] text-[var(--bg)] font-[Sora] text-sm font-bold cursor-pointer flex items-center gap-2 transition-all tracking-wide hover:translate-y-[-2px] hover:shadow-[0_10px_30px_rgba(61,255,192,0.3)]"
      >
        ✦ Tạo Mindpool đầu tiên
      </button>

      {/* Feature cards */}
      <div className="flex gap-4 mt-12 flex-wrap justify-center">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="p-4 px-5 bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] w-[180px] text-center transition-all hover:border-[var(--border-light)] hover:translate-y-[-2px]"
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-xs font-semibold text-[var(--text)] mb-1">{f.title}</div>
            <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Topic pills */}
      <div className="mt-12 w-full max-w-[520px]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-3 text-left">
          Gợi ý chủ đề để bắt đầu
        </div>
        <div className="flex gap-2.5 flex-wrap">
          {TOPIC_PILLS.map((pill) => (
            <div
              key={pill.label}
              onClick={() => navigateToSetup()}
              className="py-[7px] px-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-full text-xs text-[var(--text-muted)] cursor-pointer transition-all flex items-center gap-1.5 hover:border-[var(--border-light)] hover:text-[var(--text)]"
            >
              {pill.icon} {pill.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
