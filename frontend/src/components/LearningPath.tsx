"use client";

import type { Concept, LearnerConceptState } from "@/types";

interface Props {
  concepts: Concept[];
  states: LearnerConceptState[];
  onStart: (conceptId: string) => void;
}

function getStatus(
  state: LearnerConceptState | undefined,
  index: number
) {
  const mastery = state?.mastery ?? 0;
  const misconceptions = state?.active_misconceptions ?? [];

  if (mastery >= 0.75) {
    return {
      label: "Stable",
      description: "Strong current mastery",
      tone: "success",
    };
  }

  if (misconceptions.length > 0) {
    return {
      label: "Needs attention",
      description: "Active misconception detected",
      tone: "warning",
    };
  }

  if (state) {
    return {
      label: "Developing",
      description: "Continue building mastery",
      tone: "primary",
    };
  }

  if (index === 0) {
    return {
      label: "Ready",
      description: "Start with a diagnostic",
      tone: "primary",
    };
  }

  return {
    label: "Not assessed",
    description: "Waiting for learner evidence",
    tone: "neutral",
  };
}

function getStatusClasses(tone: string) {
  switch (tone) {
    case "success":
      return {
        dot: "bg-[var(--success)]",
        badge:
          "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20",
        node:
          "bg-[var(--success)] text-white shadow-[0_8px_20px_rgba(16,185,129,0.18)]",
      };

    case "warning":
      return {
        dot: "bg-[var(--warning)]",
        badge:
          "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20",
        node:
          "bg-[var(--warning)] text-white shadow-[0_8px_20px_rgba(245,158,11,0.18)]",
      };

    case "primary":
      return {
        dot: "bg-[var(--primary)]",
        badge:
          "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary-border)]",
        node:
          "bg-[var(--primary)] text-white shadow-[0_8px_20px_rgba(99,91,255,0.20)]",
      };

    default:
      return {
        dot: "bg-[var(--text-muted)]",
        badge:
          "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]",
        node:
          "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      };
  }
}

export function LearningPath({
  concepts,
  states,
  onStart,
}: Props) {
  const stateMap = new Map(
    states.map((state) => [state.concept_id, state])
  );

  const ordered = concepts;

  return (
    <div className="app-card p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
              Adaptive sequence
            </p>

            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          </div>

          <h2 className="text-xl font-extrabold tracking-[-0.02em] text-[var(--text)] mt-1">
            Your learning path
          </h2>

          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-lg">
            LearnLoop prioritizes concepts using the evidence in your learner
            model rather than following a fixed lesson sequence.
          </p>
        </div>

        <div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[9px] uppercase tracking-[0.08em] font-extrabold text-[var(--primary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
            Adaptive path
        </div>
      </div>

      {/* PATH */}
      {ordered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-8 text-center">
          <p className="text-sm font-bold text-[var(--text)]">
            No concepts available yet.
          </p>

          <p className="text-xs text-[var(--text-muted)] mt-1">
            Add learning concepts to build the adaptive path.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* CONNECTOR */}
          <div className="absolute left-[19px] top-5 bottom-5 w-px bg-[var(--border)]" />

          <div className="space-y-3">
            {ordered.map((concept, index) => {
              const state = stateMap.get(concept.id);
              const mastery = state?.mastery ?? 0;
              const misconceptions =
                state?.active_misconceptions ?? [];

              const status = getStatus(state, index);
              const classes = getStatusClasses(status.tone);

              const masteryPercent = Math.round(
                Math.max(0, Math.min(1, mastery)) * 100
              );

              const completed = mastery >= 0.75;

              return (
                <div
                  key={concept.id}
                  className="relative flex items-start gap-4"
                >
                  {/* NODE */}
                  <div
                    className={`relative z-10 w-10 h-10 shrink-0 rounded-full border-4 border-[var(--surface)] flex items-center justify-center text-[11px] font-extrabold ${classes.node}`}
                  >
                    {completed ? "✓" : index + 1}
                  </div>

                  {/* CONCEPT CARD */}
                  <div
                    className={`
                      flex-1
                      rounded-2xl
                      border
                      p-4
                      transition-all
                      duration-200
                      ${
                        misconceptions.length > 0
                          ? "border-[var(--warning)]/25 bg-[var(--warning)]/[0.035]"
                          : index === 0 && !completed
                            ? "border-[var(--primary-border)] bg-[var(--primary-soft)]/[0.45]"
                            : "border-[var(--border)] bg-[var(--surface-soft)]"
                      }
                    `}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* CONCEPT INFO */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-extrabold text-[var(--text)]">
                            {concept.name}
                          </h3>

                          <span className="px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[9px] text-[var(--text-muted)] font-bold capitalize">
                            {concept.difficulty}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-bold ${classes.badge}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${classes.dot}`}
                            />
                            {status.label}
                          </span>
                        </div>

                        <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                          {status.description}
                        </p>
                      </div>

                      {/* MASTERY + ACTION */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="w-[92px]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold text-[var(--text-muted)]">
                              Mastery
                            </span>

                            <span className="text-[10px] font-extrabold text-[var(--text)]">
                              {masteryPercent}%
                            </span>
                          </div>

                          <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#635bff] to-[#8b5cf6] transition-all duration-500"
                              style={{
                                width: `${masteryPercent}%`,
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onStart(concept.id)}
                          className="
                            secondary-button
                            min-w-[76px]
                            px-3
                            py-2
                            rounded-xl
                            text-[10px]
                            font-extrabold
                            transition-all
                          "
                        >
                          {completed ? "Review" : "Learn"}
                        </button>
                      </div>
                    </div>

                    {/* MISCONCEPTION */}
                    {misconceptions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--warning)]/15">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 w-1.5 h-1.5 shrink-0 rounded-full bg-[var(--warning)]" />

                          <div>
                            <p className="text-[9px] uppercase tracking-[0.1em] font-extrabold text-[var(--warning)]">
                              Active misconception
                            </p>

                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                              {misconceptions[0]}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}