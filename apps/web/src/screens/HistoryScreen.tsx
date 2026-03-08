import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { Tag } from '../components/ui/Tag';
import { api } from '../lib/api';

interface PoolCard {
  _id: string;
  title: string;
  status: string;
  agents: { icon: string; name: string }[];
  statusText?: string;
  duration?: number;
  createdAt: string;
}

function timeGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return 'Live';
  if (diffDays < 7) return 'This Week';
  if (diffDays < 30) return 'Last Month';
  return 'Older';
}

export function HistoryScreen() {
  const { navigateToMeeting } = useAppStore();
  const [pools, setPools] = useState<PoolCard[]>([]);

  useEffect(() => {
    api.getPools().then((data: any) => {
      setPools(Array.isArray(data) ? data : []);
    }).catch(() => setPools([]));
  }, []);

  // Group by time
  const grouped: Record<string, PoolCard[]> = {};
  const order = ['Live', 'This Week', 'Last Month', 'Older'];
  pools.forEach((p) => {
    const group = p.status === 'active' ? 'Live' : timeGroup(p.createdAt);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(p);
  });

  const totalPools = pools.length;

  return (
    <div className="flex-1 overflow-y-auto px-[38px] py-[30px] scrollbar-thin">
      <div className="mb-7">
        <h1 className="font-['DM_Serif_Display',serif] text-[26px] text-[var(--text)] mb-[5px]">
          Your Mindpools
        </h1>
        <p className="text-[13.5px] text-[var(--text-muted)]">
          Tất cả các cuộc họp đã tạo · {totalPools} pools
        </p>
      </div>

      {order.map(
        (section) =>
          grouped[section] &&
          grouped[section].length > 0 && (
            <div key={section}>
              <div className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)] mb-[11px] pb-[7px] border-b border-[var(--border)]">
                {section}
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3.5 mb-7">
                {grouped[section].map((pool) => (
                  <div
                    key={pool._id}
                    onClick={() => navigateToMeeting(pool._id)}
                    className="p-4 px-[18px] bg-[var(--surface-1)] border border-[var(--border)] rounded-[var(--radius)] cursor-pointer transition-all relative overflow-hidden group hover:border-[var(--border-light)] hover:bg-[var(--surface-2)] hover:translate-y-[-2px]"
                  >
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[var(--accent)] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="text-sm font-semibold text-[var(--text)] mb-[7px]">
                      {pool.title}
                    </div>
                    <div className="flex gap-[5px] mb-2.5 flex-wrap">
                      {pool.agents?.map((a, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-0.5 bg-[var(--surface-2)] border border-[var(--border-light)] rounded-full text-[10.5px] text-[var(--text-muted)] flex items-center gap-1"
                        >
                          {a.icon}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)]">
                      <Tag variant={pool.status === 'active' ? 'green' : 'amber'}>
                        {pool.status === 'active' ? '● Live' : 'Completed'}
                      </Tag>
                      <span>
                        {pool.agents?.length || 0} agents
                        {pool.duration ? ` · ${pool.duration} min` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
      )}

      {totalPools === 0 && (
        <div className="text-center text-[var(--text-muted)] mt-20">
          <div className="text-4xl mb-4">🧠</div>
          <p>Chưa có pool nào. Hãy tạo Mindpool đầu tiên!</p>
        </div>
      )}
    </div>
  );
}
