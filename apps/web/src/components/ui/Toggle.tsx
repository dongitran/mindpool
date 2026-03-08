interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <div
      className={`w-9 h-5 rounded-full cursor-pointer relative transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--border-light)]'
      }`}
      onClick={() => onChange(!checked)}
    >
      <div
        className={`absolute top-[3px] left-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </div>
  );
}
