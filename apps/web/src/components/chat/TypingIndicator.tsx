export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-[9px_13px] bg-surface-2 border border-border rounded-[14px] rounded-tl w-fit">
      <div className="w-[5px] h-[5px] bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-[5px] h-[5px] bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '200ms' }} />
      <div className="w-[5px] h-[5px] bg-text-muted rounded-full animate-typing-bounce" style={{ animationDelay: '400ms' }} />
    </div>
  );
}
