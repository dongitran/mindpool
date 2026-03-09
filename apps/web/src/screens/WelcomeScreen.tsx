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
    <div className="welcome-wrap">
      <div className="welcome-glow" />

      <div className="welcome-logo">🧠</div>

      <h1 className="welcome-title">
        Welcome to <span>Mindpool</span>
      </h1>

      <p className="welcome-sub">
        Tạo một phòng họp với những chuyên gia AI tốt nhất — mỗi agent một góc nhìn,
        cùng giúp bạn đưa ra quyết định tốt hơn.
      </p>

      <button onClick={() => navigateToSetup()} className="welcome-cta">
        ✦ Tạo Mindpool đầu tiên
      </button>

      <div className="welcome-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="feat-card">
            <div className="feat-icon">{f.icon}</div>
            <div className="feat-title">{f.title}</div>
            <div className="feat-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="welcome-recent">
        <div className="welcome-recent-title">Gợi ý chủ đề để bắt đầu</div>
        <div className="recent-row">
          {TOPIC_PILLS.map((pill) => (
            <div
              key={pill.label}
              onClick={() => navigateToSetup()}
              className="recent-pill"
            >
              {pill.icon} {pill.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
