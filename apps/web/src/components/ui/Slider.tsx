interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  labelMin?: string;
  labelMax?: string;
  formatValue?: (value: number) => string;
}

export function Slider({
  min,
  max,
  value,
  onChange,
  labelMin,
  labelMax,
  formatValue = (v) => String(v),
}: SliderProps) {
  return (
    <div className="flex items-center gap-2.5">
      {labelMin && (
        <span className="text-[11px] text-[var(--text-muted)]">{labelMin}</span>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 appearance-none h-[3px] rounded bg-[var(--border-light)] outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--accent)]
          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(61,255,192,0.4)]"
      />
      {labelMax && (
        <span className="text-[11px] text-[var(--text-muted)]">{labelMax}</span>
      )}
      <span className="text-xs font-semibold text-[var(--accent)] min-w-[48px] text-right font-mono">
        {formatValue(value)}
      </span>
    </div>
  );
}
