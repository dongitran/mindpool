interface RaiseHandBadgeProps {
  position: number;
}

export function RaiseHandBadge({ position }: RaiseHandBadgeProps) {
  return (
    <div className="w-[15px] h-[15px] bg-purple rounded-full text-[8px] font-bold text-white flex items-center justify-center flex-shrink-0">
      {position}
    </div>
  );
}
