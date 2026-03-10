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
    <div className="flex-1 flex flex-col items-center justify-center p-10 relative overflow-y-auto w-full h-full">
      <div
        className="absolute w-[600px] h-[600px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(61,255,192,0.05) 0%, transparent 70%)' }}
      />

      <div className="text-[52px] mb-5 drop-shadow-[0_0_24px_rgba(61,255,192,0.3)]">🧠</div>

      <h1 className="font-serif text-[36px] text-center mb-2.5 tracking-[-0.5px]">
        Welcome to <span className="bg-gradient-to-br from-accent to-purple text-transparent bg-clip-text">Mindpool</span>
      </h1>

      <p className="text-[15px] text-text-muted text-center max-w-[420px] leading-[1.7] mb-9">
        Tạo một phòng họp với những chuyên gia AI tốt nhất — mỗi agent một góc nhìn,
        cùng giúp bạn đưa ra quyết định tốt hơn.
      </p>

      <button
        onClick={() => navigateToSetup()}
        className="px-7 py-[13px] bg-gradient-to-br from-accent to-[#2de8a8] border-none rounded-sm text-bg font-sora text-[14px] font-bold cursor-pointer flex items-center gap-2 transition-all duration-200 tracking-[0.2px] hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(61,255,192,0.3)]"
      >
        ✦ Tạo Mindpool đầu tiên
      </button>

      <div className="flex gap-4 mt-12 flex-wrap justify-center">
        {FEATURES.map((f) => (
          <div key={f.title} className="p-4 px-5 bg-surface-1 border border-border rounded-DEFAULT w-[180px] text-center transition-all duration-200 cursor-default hover:border-border-light hover:-translate-y-[2px]">
            <div className="text-[24px] mb-2">{f.icon}</div>
            <div className="text-[12px] font-semibold text-text mb-1">{f.title}</div>
            <div className="text-[11px] text-text-muted leading-[1.5]">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-12 w-full max-w-[520px]">
        <div className="text-[11px] font-semibold uppercase tracking-[1px] text-text-dim mb-3 text-left">Gợi ý chủ đề để bắt đầu</div>
        <div className="flex flex-wrap gap-2.5">
          {TOPIC_PILLS.map((pill) => (
            <div
              key={pill.label}
              onClick={() => navigateToSetup()}
              className="px-3.5 py-2 bg-surface-2 border border-border-light rounded-sm text-[12px] text-text-muted cursor-pointer transition-all duration-200 flex items-center gap-2 hover:border-accent hover:text-accent hover:-translate-y-[1px]"
            >
              {pill.icon} {pill.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
