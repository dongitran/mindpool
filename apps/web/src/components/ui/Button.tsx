import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'danger' | 'accent' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
}

const styles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-[var(--accent)] to-[#2de8a8] text-[var(--bg)] font-bold hover:translate-y-[-1px] hover:shadow-[0_8px_24px_rgba(61,255,192,0.3)]',
  outline:
    'bg-transparent border border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--border-light)] hover:text-[var(--text)]',
  danger:
    'bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.25)] text-[var(--red)] hover:bg-[rgba(255,107,107,0.15)]',
  accent:
    'bg-[var(--accent-dim)] border border-[rgba(61,255,192,0.3)] text-[var(--accent)] font-semibold hover:bg-[rgba(61,255,192,0.18)]',
  ghost:
    'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]';

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-xs)] font-[Sora] transition-all duration-150 cursor-pointer ${sizeClass} ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
