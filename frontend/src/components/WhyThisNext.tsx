interface Props {
  text: string;
}

export function WhyThisNext({ text }: Props) {
  return (
    <div className="app-card p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center">
          <span className="text-lg">✦</span>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[var(--primary)]">
            Why this next?
          </p>

          <h3 className="text-sm font-extrabold text-[var(--text)] mt-1">
            LearnLoop adapted this step for you
          </h3>
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-3">
        {text}
      </p>
    </div>
  );
}