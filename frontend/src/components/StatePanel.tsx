"use client";

import { MasteryBar } from "./MasteryBar";

interface Props {
  mastery: number;
  confidence: number;
  misconceptions: string[];
}

function tone(value: number) {
  if (value >= 0.7) return "text-[var(--success)]";
  if (value >= 0.4) return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

export function StatePanel({ mastery, confidence, misconceptions }: Props) {
  return (
    <div className="app-card p-5 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] font-extrabold text-[var(--text-muted)]">
            Learner Twin
          </p>
          <h3 className="text-base font-extrabold text-[var(--text)] mt-1">
            Current learner state
          </h3>
        </div>

        <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center">
          <span className="text-lg">✦</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] p-4">
          <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wide">
            Mastery
          </p>
          <p className={`text-3xl font-extrabold mt-1 ${tone(mastery)}`}>
            {Math.round(mastery * 100)}%
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] p-4">
          <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wide">
            Confidence
          </p>
          <p className={`text-3xl font-extrabold mt-1 ${tone(confidence)}`}>
            {Math.round(confidence * 100)}%
          </p>
        </div>
      </div>

      <MasteryBar value={mastery} />

      {misconceptions.length > 0 && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4 mt-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
            <p className="text-[11px] text-[var(--danger)] uppercase tracking-[0.12em] font-extrabold">
              Active misconception
            </p>
          </div>

          <p className="text-sm text-[var(--text)] leading-relaxed">
            {misconceptions[0]}
          </p>
        </div>
      )}
    </div>
  );
}