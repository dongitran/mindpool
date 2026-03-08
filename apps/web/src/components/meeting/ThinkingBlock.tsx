import { useState } from 'react';

interface ThinkingBlockProps {
  thinkSec: number;
  content: string;
  defaultOpen?: boolean;
}

export function ThinkingBlock({
  thinkSec,
  content,
  defaultOpen = false,
}: ThinkingBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-[7px]">
      <span
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-[5px] text-[11px] text-[var(--text-muted)] cursor-pointer px-2 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] transition-all select-none font-mono hover:text-[var(--text)] hover:border-[var(--border-light)] ${open ? 'thinking-toggle-open' : ''}`}
      >
        <span
          className={`text-[8px] transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        >
          ▶
        </span>
        Thought for {thinkSec} seconds
      </span>
      {open && (
        <div className="mt-[5px] px-[13px] py-[11px] bg-[var(--surface-2)] border border-[var(--border)] rounded-[var(--radius-sm)] border-l-2 border-l-[var(--purple)] text-[11.5px] leading-[1.7] text-[var(--text-muted)] font-mono animate-fade-in whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}
