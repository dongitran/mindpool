type TagVariant = 'green' | 'amber' | 'purple';

const variantStyles: Record<TagVariant, string> = {
  green: 'bg-[rgba(61,255,192,0.1)] text-[var(--accent)] border-[rgba(61,255,192,0.25)]',
  amber: 'bg-[var(--amber-dim)] text-[var(--amber)] border-[rgba(255,196,107,0.25)]',
  purple: 'bg-[var(--purple-dim)] text-[var(--purple)] border-[rgba(139,124,248,0.25)]',
};

interface TagProps {
  variant: TagVariant;
  children: React.ReactNode;
}

export function Tag({ variant, children }: TagProps) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
