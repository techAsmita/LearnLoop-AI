"use client";

import type { LearnerConceptState } from "@/types";

interface Props {
  states: LearnerConceptState[];
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function getMasteryLabel(mastery: number) {
  if (mastery >= 0.75) return "Strong";
  if (mastery >= 0.5) return "Developing";
  if (mastery >= 0.3) return "Needs practice";
  return "Needs attention";
}

function getConceptDisplayName(conceptId: string) {
  const names: Record<string, string> = {
    overfitting: "Overfitting",
    bias_variance: "Bias-Variance Tradeoff",
    train_validation_test: "Train / Validation / Test Splits",
    regularization: "Regularization (L1 / L2)",
    gradient_descent: "Gradient Descent",
    classification_metrics: "Classification Metrics",
  };

  return names[conceptId] ?? conceptId.replaceAll("_", " ");
}

function getMasteryTone(mastery: number) {
  if (mastery >= 0.75) {
    return {
      text: "text-[var(--success)]",
      bg: "bg-[var(--success)]/10",
      bar: "bg-[var(--success)]",
    };
  }

  if (mastery >= 0.5) {
    return {
      text: "text-[var(--primary)]",
      bg: "bg-[var(--primary-soft)]",
      bar: "bg-[var(--primary)]",
    };
  }

  if (mastery >= 0.3) {
    return {
      text: "text-[var(--warning)]",
      bg: "bg-[var(--warning)]/10",
      bar: "bg-[var(--warning)]",
    };
  }

  return {
    text: "text-[var(--danger)]",
    bg: "bg-[var(--danger)]/10",
    bar: "bg-[var(--danger)]",
  };
}

export function ProgressOverview({ states }: Props) {
  const assessedStates = states.filter(Boolean);

  const averageMastery = assessedStates.length
    ? assessedStates.reduce((sum, state) => sum + state.mastery, 0) /
      assessedStates.length
    : 0;

  const averageConfidence = assessedStates.length
    ? assessedStates.reduce((sum, state) => sum + state.confidence, 0) /
      assessedStates.length
    : 0;

  const totalAttempts = assessedStates.reduce(
    (sum, state) => sum + state.attempt_count,
    0
  );

  const misconceptionCount = assessedStates.filter(
    (state) => state.active_misconceptions?.length > 0
  ).length;

  const strongConcepts = assessedStates.filter(
    (state) => state.mastery >= 0.75
  ).length;

  const watchlist = [...assessedStates]
    .filter(
      (state) =>
        state.mastery < 0.6 ||
        state.active_misconceptions?.length > 0
    )
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 4);

  const topConcepts = [...assessedStates]
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.17em] font-extrabold text-[var(--primary)]">
            Learner intelligence
          </p>

          <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-[var(--text)] mt-1">
            Learning analytics
          </h2>

          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
            A live view of the learner model built from your recorded
            mastery, confidence, attempts, and misconception evidence.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start lg:self-auto px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />

          <span className="text-[9px] uppercase tracking-[0.1em] font-extrabold text-[var(--success)]">
            Live learner model
          </span>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="app-card p-5">
          <p className="text-[10px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
            Avg mastery
          </p>

          <div className="flex items-end justify-between mt-3">
            <p className="metric-value text-3xl font-extrabold">
              {clampPercent(averageMastery)}%
            </p>

            <div className="w-8 h-8 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center">
              ◒
            </div>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Across assessed concepts
          </p>
        </div>

        <div className="app-card p-5">
          <p className="text-[10px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
            Confidence
          </p>

          <div className="flex items-end justify-between mt-3">
            <p className="metric-value text-3xl font-extrabold">
              {clampPercent(averageConfidence)}%
            </p>

            <div className="w-8 h-8 rounded-lg bg-[var(--violet)]/10 text-[var(--violet)] flex items-center justify-center">
              ◉
            </div>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Self-reported confidence
          </p>
        </div>

        <div className="app-card p-5">
          <p className="text-[10px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
            Evidence
          </p>

          <div className="flex items-end justify-between mt-3">
            <p className="metric-value text-3xl font-extrabold">
              {totalAttempts}
            </p>

            <div className="w-8 h-8 rounded-lg bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
              ↗
            </div>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Recorded learning attempts
          </p>
        </div>

        <div className="app-card p-5">
          <p className="text-[10px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
            Watchlist
          </p>

          <div className="flex items-end justify-between mt-3">
            <p className="metric-value text-3xl font-extrabold">
              {misconceptionCount}
            </p>

            <div className="w-8 h-8 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center">
              !
            </div>
          </div>

          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Active misconceptions
          </p>
        </div>
      </div>

      {/* EMPTY STATE */}
      {assessedStates.length === 0 ? (
        <div className="app-card p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-lg">
            ✦
          </div>

          <h3 className="text-base font-extrabold text-[var(--text)] mt-4">
            Your learner model is ready
          </h3>

          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
            Complete a diagnostic session to start building evidence about
            mastery, confidence, and misconceptions.
          </p>
        </div>
      ) : (
        <>
          {/* MAIN INTELLIGENCE GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5">
            {/* MASTERY DISTRIBUTION */}
            <div className="app-card p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                    Mastery performance
                  </p>

                  <h3 className="text-lg font-extrabold text-[var(--text)] mt-1">
                    Concept mastery
                  </h3>

                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Current mastery estimates across assessed concepts.
                  </p>
                </div>

                <span className="text-[10px] font-bold text-[var(--text-muted)]">
                  {strongConcepts} strong
                </span>
              </div>

              <div className="space-y-5">
                {topConcepts.map((state) => {
                  const mastery = clampPercent(state.mastery);
                  const tone = getMasteryTone(state.mastery);

                  return (
                    <div key={getConceptDisplayName(state.concept_id)}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-[var(--text)] truncate">
                            {state.concept_id}
                          </p>

                          <p className={`text-[9px] font-bold mt-0.5 ${tone.text}`}>
                            {getMasteryLabel(state.mastery)}
                          </p>
                        </div>

                        <span className="text-xs font-extrabold text-[var(--text)]">
                          {mastery}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
                          style={{ width: `${mastery}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LEARNING STATE */}
            <div className="app-card p-6">
              <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                Learning state
              </p>

              <h3 className="text-lg font-extrabold text-[var(--text)] mt-1">
                What the model sees
              </h3>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                      Strong concepts
                    </span>

                    <span className="text-sm font-extrabold text-[var(--success)]">
                      {strongConcepts}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                      Needs practice
                    </span>

                    <span className="text-sm font-extrabold text-[var(--warning)]">
                      {
                        assessedStates.filter(
                          (state) =>
                            state.mastery >= 0.3 &&
                            state.mastery < 0.75
                        ).length
                      }
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                      Active misconceptions
                    </span>

                    <span className="text-sm font-extrabold text-[var(--danger)]">
                      {misconceptionCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4">
                <p className="text-[9px] uppercase tracking-[0.12em] font-extrabold text-[var(--primary)]">
                  Interpretation
                </p>

                <p className="text-xs font-bold leading-relaxed text-[var(--text)] mt-1">
                  {misconceptionCount > 0
                    ? "The learner model has unresolved misconception evidence. The next intervention should account for it."
                    : averageMastery >= 0.75
                      ? "Current evidence indicates strong overall mastery. Practice can focus on retention and challenge."
                      : "The learner model is still developing. Additional evidence will help LearnLoop personalize the next step."}
                </p>
              </div>
            </div>
          </div>

          {/* CONFIDENCE × MASTERY */}
          <div className="app-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                  Calibration view
                </p>

                <h3 className="text-lg font-extrabold text-[var(--text)] mt-1">
                  Confidence × mastery
                </h3>

                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Compare what the learner believes with the current mastery estimate.
                </p>
              </div>

              <div className="flex items-center gap-4 text-[9px] font-bold text-[var(--text-muted)]">
                <span>High confidence</span>
                <span>→</span>
                <span>High mastery</span>
              </div>
            </div>

            <div className="relative h-[230px] rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] overflow-hidden">
              {/* GRID */}
              <div className="absolute inset-0">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border)]" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--border)]" />
              </div>

              {/* QUADRANT LABELS */}
              <span className="absolute top-3 left-3 text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Developing confidence
              </span>

              <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Confident mastery
              </span>

              <span className="absolute bottom-3 left-3 text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Needs support
              </span>

              <span className="absolute bottom-3 right-3 text-[8px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Confidence gap
              </span>

              {/* POINTS */}
              {assessedStates.map((state, index) => {
                const left = Math.max(
                  4,
                  Math.min(94, state.confidence * 100)
                );

                const top = Math.max(
                  8,
                  Math.min(88, 100 - state.mastery * 100)
                );

                const tone = getMasteryTone(state.mastery);

                return (
                  <div
                    key={state.concept_id}
                    className="absolute group"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${tone.bg} border-2 border-[var(--surface)] shadow-md flex items-center justify-center`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${tone.bar}`}
                      />
                    </div>

                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <div className="whitespace-nowrap rounded-lg bg-[#17172b] px-3 py-2 shadow-xl">
                        <p className="text-[10px] font-bold text-white">
  {getConceptDisplayName(state.concept_id)}
</p>

                        <p className="text-[9px] text-white/70 mt-0.5">
                          Mastery {clampPercent(state.mastery)}% · Confidence{" "}
                          {clampPercent(state.confidence)}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-2 text-[9px] text-[var(--text-muted)]">
              <span>Low confidence</span>
              <span>High confidence</span>
            </div>
          </div>

          {/* WATCHLIST + ADAPTATION */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* WATCHLIST */}
            <div className="app-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-[var(--warning)]">
                    Concept watchlist
                  </p>

                  <h3 className="text-lg font-extrabold text-[var(--text)] mt-1">
                    Where attention is needed
                  </h3>
                </div>

                <span className="text-[9px] font-bold text-[var(--text-muted)]">
                  {watchlist.length} flagged
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                {watchlist.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-5 text-center">
                    <p className="text-xs font-bold text-[var(--text)]">
                      No concepts currently flagged.
                    </p>

                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Continue learning to generate more evidence.
                    </p>
                  </div>
                ) : (
                  watchlist.map((state) => (
                    <div
                      key={state.concept_id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3.5"
                    >
                      <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center text-xs font-extrabold">
                        !
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-extrabold text-[var(--text)] truncate">
  {getConceptDisplayName(state.concept_id)}
</p>

                        <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                          Mastery {clampPercent(state.mastery)}%
                        </p>
                      </div>

                      {state.active_misconceptions?.length > 0 && (
                        <span className="text-[8px] font-extrabold text-[var(--danger)] uppercase tracking-wide">
                          Misconception
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ADAPTATION HISTORY */}
            <div className="app-card p-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                  Adaptation history
                </p>

                <h3 className="text-lg font-extrabold text-[var(--text)] mt-1">
                  Decisions powered by evidence
                </h3>

                <p className="text-xs text-[var(--text-muted)] mt-1">
                  The learner model records how each concept should be handled.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {assessedStates.slice(0, 4).map((state, index) => (
                  <div
                    key={state.concept_id}
                    className="flex items-start gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-[9px] font-extrabold">
                        {index + 1}
                      </div>

                      {index < Math.min(assessedStates.length, 4) - 1 && (
                        <div className="w-px h-7 bg-[var(--border)] mt-1" />
                      )}
                    </div>

                    <div className="pt-0.5 min-w-0">
                      <p className="text-xs font-extrabold text-[var(--text)] truncate">
                        {state.concept_id}
                      </p>

                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {state.last_intervention_type
                          ? `Next strategy: ${state.last_intervention_type.replaceAll(
                              "_",
                              " "
                            )}`
                          : "Awaiting intervention evidence"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}