import { useState, KeyboardEvent, useEffect, useRef } from 'react';

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
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const val = message.trim();
    if (!val) return;
    onSend(val);
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-[22px] py-[14px] pb-[18px] border-t border-border flex-shrink-0">
      <div className="flex items-end gap-2.5 px-3.5 py-2.5 bg-surface-2 border border-border-light rounded transition-colors focus-within:border-[rgba(61,255,192,0.4)]">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-text font-[Sora] text-[13.5px] resize-none leading-relaxed max-h-[120px] overflow-y-auto placeholder:text-text-muted"
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={handleSend}
          disabled={disabled}
          className="w-[30px] h-[30px] bg-accent border-none rounded-[7px] text-bg cursor-pointer flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 text-sm disabled:opacity-35 disabled:pointer-events-none"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
