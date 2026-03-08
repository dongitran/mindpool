import { useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  placeholder?: string;
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({
  placeholder = 'Mô tả chủ đề bạn muốn thảo luận...',
  onSend,
  disabled = false,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!ref.current) return;
    const val = ref.current.value.trim();
    if (!val) return;
    onSend(val);
    ref.current.value = '';
    ref.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-[22px] py-[14px] pb-[18px] border-t border-[var(--border)] flex-shrink-0">
      <div className="flex items-end gap-2.5 px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--border-light)] rounded-[var(--radius)] transition-colors focus-within:border-[rgba(61,255,192,0.4)]">
        <textarea
          ref={ref}
          className="flex-1 bg-transparent border-none outline-none text-[var(--text)] font-[Sora] text-[13.5px] resize-none leading-relaxed max-h-[120px] overflow-y-auto placeholder:text-[var(--text-muted)]"
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = 'auto';
            t.style.height = t.scrollHeight + 'px';
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          disabled={disabled}
          className="w-[30px] h-[30px] bg-[var(--accent)] border-none rounded-[7px] text-[var(--bg)] cursor-pointer flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 text-sm disabled:opacity-35 disabled:pointer-events-none"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
