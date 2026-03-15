interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      className={`w-9 h-5 rounded-full cursor-pointer relative transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-accent' : 'bg-[var(--border-light)]'
      }`}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div
        className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </div>
  );
}
