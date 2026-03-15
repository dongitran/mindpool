import { useSettingsStore } from '../stores/settingsStore';
import { Toggle } from '../components/ui/Toggle';
import { Slider } from '../components/ui/Slider';
import { Button } from '../components/ui/Button';

const MODELS = [
  { id: 'kimi-k2', name: 'Kimi K2', desc: 'Cân bằng tốc độ & chất lượng · Recommended', tag: 'Active' },
  { id: 'kimi-k2.5', name: 'Kimi K2.5', desc: 'Multimodal, suy luận sâu nhất', tag: 'Pro' },
  { id: 'minimax-m2.5', name: 'MiniMax M2.5', desc: 'Nhanh nhất, tiết kiệm token', tag: null },
];

const ACCENT_COLORS = ['#3dffc0', '#8b7cf8', '#ffc46b', '#ff6b9d', '#6bb5ff'];

export function SettingsScreen() {
  const settings = useSettingsStore();

  const selectAccent = (color: string) => {
    settings.updateSetting('accentColor', color);
    const r = document.documentElement;
    r.style.setProperty('--accent', color);
    const hex = color.replace('#', '');
    const rv = parseInt(hex.slice(0, 2), 16);
    const gv = parseInt(hex.slice(2, 4), 16);
    const bv = parseInt(hex.slice(4, 6), 16);
    r.style.setProperty('--accent-dim', `rgba(${rv},${gv},${bv},0.12)`);
    r.style.setProperty('--accent-glow', `rgba(${rv},${gv},${bv},0.25)`);
  };

  return (
    <div className="flex-1 overflow-y-auto px-[42px] py-8 scrollbar-thin">
      <div className="mb-[30px]">
        <h1 className="font-['DM_Serif_Display',serif] text-[26px] text-text mb-1">
          Settings
        </h1>
        <p className="text-[13px] text-text-muted">
          Tuỳ chỉnh Mindpool theo cách của bạn
        </p>
      </div>

      {/* Profile */}
      <Section title="👤 Profile">
        <div className="bg-surface-1 border border-border rounded overflow-hidden">
          <div className="flex items-center gap-3.5 p-4 px-[18px]">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-sm font-bold text-bg flex-shrink-0">
              DT
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-text">Đông Trần</div>
              <div className="text-[11.5px] text-text-muted mt-0.5">
                dong@mindpool.ai
              </div>
            </div>
            <Button variant="outline" size="sm">Edit Profile</Button>
          </div>
        </div>
      </Section>

      {/* AI Model */}
      <Section title="🤖 AI Model">
        <div className="bg-surface-1 border border-border rounded overflow-hidden">
          <div className="p-3.5 px-[18px]">
            <div className="text-[13px] font-semibold text-text mb-1">Default Model</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed mb-2.5">
              Model dùng cho tất cả agents trong meeting
            </div>
            <div className="flex flex-col gap-1.5">
              {MODELS.map((m) => (
                <div
                  key={m.id}
                  onClick={() => settings.updateSetting('defaultModel', m.id)}
                  className={`flex items-center gap-3 p-2.5 px-[13px] rounded-sm cursor-pointer transition-all border ${
                    settings.defaultModel === m.id
                      ? 'border-[rgba(61,255,192,0.35)] bg-accent-dim'
                      : 'border-border bg-surface-2 hover:border-border-light'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full border-2 flex-shrink-0 transition-all ${
                      settings.defaultModel === m.id
                        ? 'bg-accent border-accent'
                        : 'border-border-light'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold text-text">{m.name}</div>
                    <div className="text-[11px] text-text-muted mt-px">{m.desc}</div>
                  </div>
                  {settings.defaultModel === m.id && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[rgba(61,255,192,0.1)] text-accent border border-[rgba(61,255,192,0.25)]">
                      Active
                    </span>
                  )}
                  {m.tag === 'Pro' && settings.defaultModel !== m.id && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-purple-dim text-purple border border-[rgba(139,124,248,0.25)]">
                      Pro
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="h-px bg-[var(--border)] mx-[18px]" />
          <div className="p-3.5 px-[18px]">
            <div className="text-[13px] font-semibold text-text mb-1">Thinking Budget</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed mb-2.5">
              Số giây tối đa cho mỗi agent để "suy nghĩ" trước khi phát biểu
            </div>
            <Slider
              min={3}
              max={30}
              value={settings.thinkingBudget}
              onChange={(v) => settings.updateSetting('thinkingBudget', v)}
              labelMin="3s"
              labelMax="30s"
              formatValue={(v) => `${v}s`}
            />
          </div>
        </div>
      </Section>

      {/* Meeting Behaviour */}
      <Section title="🎯 Meeting Behaviour">
        <div className="bg-surface-1 border border-border rounded overflow-hidden">
          <ToggleRow label="Auto-start discussion" desc="Agents tự bắt đầu thảo luận ngay khi meeting được tạo" checked={settings.autoStartDiscussion} onChange={(v) => settings.updateSetting('autoStartDiscussion', v)} />
          <Divider />
          <ToggleRow label="Show thinking by default" desc="Expand thinking block tự động thay vì ẩn đi" checked={settings.showThinkingDefault} onChange={(v) => settings.updateSetting('showThinkingDefault', v)} />
          <Divider />
          <ToggleRow label="MindX Orchestrator" desc="MindX tự động điều phối mọi pool" checked={settings.mindxEnabled} onChange={(v) => settings.updateSetting('mindxEnabled', v)} />
          <Divider />
          <ToggleRow label="Auto Recap" desc="Tự tổng hợp kết luận và action items khi meeting kết thúc" checked={settings.autoRecap} onChange={(v) => settings.updateSetting('autoRecap', v)} />
          <Divider />
          <div className="p-3.5 px-[18px]">
            <div className="text-[13px] font-semibold text-text mb-1">Max agents per pool</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed mb-2.5">
              Giới hạn số lượng agent trong một meeting
            </div>
            <Slider
              min={2}
              max={10}
              value={settings.maxAgentsPerPool}
              onChange={(v) => settings.updateSetting('maxAgentsPerPool', v)}
              labelMin="2"
              labelMax="10"
              formatValue={(v) => `${v} agents`}
            />
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="🎨 Appearance">
        <div className="bg-surface-1 border border-border rounded overflow-hidden">
          <ToggleRow label="Compact sidebar" desc="Thu gọn sidebar, chỉ hiện icon" checked={settings.compactSidebar} onChange={(v) => settings.updateSetting('compactSidebar', v)} />
          <Divider />
          <div className="p-3.5 px-[18px]">
            <div className="text-[13px] font-semibold text-text mb-1">Accent color</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed mb-2.5">
              Màu chủ đạo của toàn bộ giao diện
            </div>
            <div className="flex gap-2 mt-0.5">
              {ACCENT_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => selectAccent(color)}
                  className={`w-6 h-6 rounded-full cursor-pointer transition-all hover:scale-110 border-2 ${
                    settings.accentColor === color
                      ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]'
                      : 'border-transparent'
                  }`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* API & Integrations */}
      <Section title="🔑 API & Integrations">
        <div className="bg-surface-1 border border-border rounded overflow-hidden">
          <div className="p-3.5 px-[18px]">
            <div className="text-[13px] font-semibold text-text mb-1">Kimi API Key</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed mb-2.5">
              API key cho Kimi (Moonshot AI)
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="password"
                className="flex-1 px-3 py-2 bg-surface-2 border border-border-light rounded-sm text-text font-mono text-xs outline-none transition-colors focus:border-[rgba(61,255,192,0.4)]"
                placeholder="sk-••••••••"
              />
              <Button variant="outline" size="sm">Reveal</Button>
              <Button variant="accent" size="sm">Save</Button>
            </div>
          </div>
          <Divider />
          <div className="p-3.5 px-[18px]">
            <div className="text-[13px] font-semibold text-text mb-1">MiniMax API Key</div>
            <div className="text-[11.5px] text-text-muted leading-relaxed mb-2.5">
              API key cho MiniMax
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="password"
                className="flex-1 px-3 py-2 bg-surface-2 border border-border-light rounded-sm text-text font-mono text-xs outline-none transition-colors focus:border-[rgba(61,255,192,0.4)]"
                placeholder="mm-••••••••"
              />
              <Button variant="outline" size="sm">Reveal</Button>
              <Button variant="accent" size="sm">Save</Button>
            </div>
          </div>
          <Divider />
          <div className="flex items-center justify-between gap-4 p-[13px_18px]">
            <div>
              <div className="text-[13px] font-semibold text-text">Jira Integration</div>
              <div className="text-[11.5px] text-text-muted leading-relaxed">
                Tạo Jira tasks tự động từ action items
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>Connect</Button>
          </div>
          <Divider />
          <div className="flex items-center justify-between gap-4 p-[13px_18px]">
            <div>
              <div className="text-[13px] font-semibold text-text">Notion Export</div>
              <div className="text-[11.5px] text-text-muted leading-relaxed">
                Export recap và mindmap sang Notion
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>Connect</Button>
          </div>
        </div>
      </Section>

      {/* Danger Zone */}
      <Section title="⚠️ Danger Zone" titleColor="text-red">
        <div className="bg-surface-1 border border-[rgba(255,107,107,0.2)] rounded overflow-hidden">
          <div className="flex items-center justify-between gap-4 p-[13px_18px]">
            <div>
              <div className="text-[13px] font-semibold text-text">Clear all archived pools</div>
              <div className="text-[11.5px] text-text-muted">
                Xoá vĩnh viễn tất cả pools đã archived
              </div>
            </div>
            <Button variant="danger" size="sm">Clear</Button>
          </div>
          <Divider />
          <div className="flex items-center justify-between gap-4 p-[13px_18px]">
            <div>
              <div className="text-[13px] font-semibold text-text">Delete account</div>
              <div className="text-[11.5px] text-text-muted">
                Xoá toàn bộ dữ liệu, không thể khôi phục
              </div>
            </div>
            <Button variant="danger" size="sm">Delete</Button>
          </div>
        </div>
      </Section>

      <div className="h-10" />
    </div>
  );
}

function Section({ title, children, titleColor }: { title: string; children: React.ReactNode; titleColor?: string }) {
  return (
    <div className="mb-[26px] max-w-[680px]">
      <div className={`text-[11px] font-bold uppercase tracking-[1.2px] mb-2.5 pb-1.5 border-b border-border ${titleColor || 'text-text-muted'}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-[13px_18px]">
      <div>
        <div className="text-[13px] font-semibold text-text">{label}</div>
        <div className="text-[11.5px] text-text-muted leading-relaxed">{desc}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[var(--border)] mx-[18px]" />;
}
