"use client";

import type { LearnerConceptState } from "@/types";

interface Props {
  states: LearnerConceptState[];
}

export function LearnerTwin({ states }: Props) {
  const averageMastery =
    states.length > 0
      ? states.reduce((sum, s) => sum + s.mastery, 0) /
        states.length
      : 0;

  const averageConfidence =
    states.length > 0
      ? states.reduce((sum, s) => sum + s.confidence, 0) /
        states.length
      : 0;

  const misconceptions = states.flatMap(
    (s) => s.active_misconceptions
  );

  const attempts = states.reduce(
    (sum, s) => sum + s.attempt_count,
    0
  );

  return (
    <div className="app-card p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)]">
            Learner intelligence
          </p>

          <h2 className="text-lg font-extrabold text-[var(--text)] mt-1">
            Learner Twin
          </h2>
        </div>

        <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-lg">
          🧠
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="soft-card p-4">
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
            Avg mastery
          </p>
          <p className="metric-value text-2xl font-extrabold mt-1">
            {Math.round(averageMastery * 100)}%
          </p>
        </div>

        <div className="soft-card p-4">
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
            Confidence
          </p>
          <p className="metric-value text-2xl font-extrabold mt-1">
            {Math.round(averageConfidence * 100)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="soft-card p-4">
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
            Concepts
          </p>
          <p className="metric-value text-xl font-extrabold mt-1">
            {states.length}
          </p>
        </div>

        <div className="soft-card p-4">
          <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
            Attempts
          </p>
          <p className="metric-value text-xl font-extrabold mt-1">
            {attempts}
          </p>
        </div>
      </div>

      <div className="mt-5">
        {misconceptions.length > 0 ? (
          <div className="misconception-card rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--danger)]">
                Active misconception
              </p>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              {misconceptions[0]}
            </p>
          </div>
        ) : (
          <div className="success-card rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--success)]">
                Learner state
              </p>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              No active misconception has been recorded yet.
              Start a diagnostic to let LearnLoop build your learner model.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}