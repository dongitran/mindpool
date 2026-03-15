import { useState } from 'react';

interface ThinkingBlockProps {
  thinkSec: number;
  content: string;
  defaultOpen?: boolean;
  isLive?: boolean;
}

export function ThinkingBlock({
  thinkSec,
  content,
  defaultOpen = false,
  isLive = false,
}: ThinkingBlockProps) {
  const [open, setOpen] = useState(isLive || defaultOpen);

  return (
    <div className="mb-[7px]">
      <span
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-[5px] text-[11px] text-text-muted cursor-pointer px-2 py-0.5 rounded-full bg-surface-2 border border-border transition-all select-none font-mono hover:text-text hover:border-border-light ${open ? 'thinking-toggle-open' : ''}`}
      >
        <span
          className={`text-[8px] transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
        {isLive ? '💭 Đang suy nghĩ...' : `Thought for ${thinkSec} seconds`}
      </span>
      {open && (
        <div className="mt-[5px] px-[13px] py-[11px] bg-surface-2 border border-border rounded-sm border-l-2 border-l-purple text-[11.5px] leading-[1.7] text-text-muted font-mono animate-fade-in whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}
