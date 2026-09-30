"use client";

import type { Concept, LearnerConceptState } from "@/types";

interface Props {
  concepts: Concept[];
  states: LearnerConceptState[];
  onStart: (conceptId: string) => void;
}

export function TodayLearning({
  concepts,
  states,
  onStart,
}: Props) {
  const stateMap = new Map(
    states.map((s) => [s.concept_id, s])
  );

  const target =
    states
      .filter((s) => s.active_misconceptions.length > 0)
      .sort((a, b) => a.mastery - b.mastery)[0] ??
    states.sort((a, b) => a.mastery - b.mastery)[0];

  const concept =
    target &&
    concepts.find((c) => c.id === target.concept_id);

  const selectedConcept = concept ?? concepts[0];

    const selectedState = selectedConcept
    ? stateMap.get(selectedConcept.id)
    : undefined;

  const hasLearnerEvidence = states.some(
    (state) => state.attempt_count > 0
  );

  return (
    <div className="app-card p-6 h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)]">
            Recommended now
          </p>

          <h2 className="text-lg font-extrabold text-[var(--text)] mt-1">
            Today&apos;s learning
          </h2>
        </div>

        <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] flex items-center justify-center">
          🎯
        </div>
      </div>

      {selectedConcept ? (
        <>
          <div className="rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] p-5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-full bg-[var(--surface)] text-[var(--primary)] text-[9px] font-bold">
                ADAPTIVE
              </span>

              {selectedState?.active_misconceptions.length ? (
                <span className="px-2 py-1 rounded-full bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)] text-[9px] font-bold">
                  NEEDS ATTENTION
                </span>
              ) : null}
            </div>

            <h3 className="text-xl font-extrabold text-[var(--text)] mt-4">
              {selectedConcept.name}
            </h3>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-2">
              {selectedState?.active_misconceptions[0] ??
                selectedConcept.description ??
                "Start a diagnostic and let LearnLoop determine the right next step."}
            </p>

            <div className="flex items-center gap-5 mt-5">
              <div>
                <p className="text-[9px] text-[var(--text-muted)] uppercase font-bold">
                  Current mastery
                </p>

                <p className="text-sm font-extrabold text-[var(--text)] mt-1">
                  {Math.round(
                    (selectedState?.mastery ?? 0) * 100
                  )}
                  %
                </p>
              </div>

              <div className="w-px h-7 bg-[var(--border)]" />

              <div>
                <p className="text-[9px] text-[var(--text-muted)] uppercase font-bold">
                  Difficulty
                </p>

                <p className="text-sm font-extrabold text-[var(--text)] mt-1 capitalize">
                  {selectedConcept.difficulty}
                </p>
              </div>
            </div>
          </div>

                    <button
            onClick={() => onStart(selectedConcept.id)}
            className="primary-button w-full mt-4 py-3 rounded-xl text-xs font-bold"
          >
            {hasLearnerEvidence
              ? "Continue learning →"
              : "Start diagnostic →"}
          </button>
        </>
      ) : (
        <div className="rounded-2xl bg-[var(--surface-soft)] border border-dashed border-[var(--border-strong)] p-6 text-center">
          <p className="text-sm font-bold text-[var(--text)]">
            Your learning path is waiting
          </p>

          <p className="text-xs text-[var(--text-muted)] mt-2">
            Choose your first concept to create your learner model.
          </p>
        </div>
      )}
    </div>
  );
}