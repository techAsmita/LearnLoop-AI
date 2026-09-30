interface Props {
  value: number;
  label?: string;
  showValue?: boolean;
}

export function MasteryBar({
  value,
  label = "Mastery",
  showValue = true,
}: Props) {
  const safe = Math.max(
    0,
    Math.min(1, Number.isFinite(value) ? value : 0)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {label}
        </span>

        {showValue && (
          <span className="text-[11px] font-bold text-[var(--primary)]">
            {Math.round(safe * 100)}%
          </span>
        )}
      </div>

      <div className="progress-track">
        <div
          className="progress-fill h-full"
          style={{
            width: `${safe * 100}%`,
          }}
        />
      </div>
    </div>
  );
}