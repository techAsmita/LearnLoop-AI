"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

import type {
  Concept,
  SessionStart,
  DiagnoseResponse,
  Intervention,
  ReassessResponse,
  LearnerConceptState,
  Screen,
} from "@/types";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LearnerTwin } from "@/components/LearnerTwin";
import { LearningPath } from "@/components/LearningPath";
import { TodayLearning } from "@/components/TodayLearning";
import { ProgressOverview } from "@/components/ProgressOverview";
import { WhyThisNext } from "@/components/WhyThisNext";
import { LessonBody } from "@/components/LessonBody";
import { StatePanel } from "@/components/StatePanel";
import { MasteryBar } from "@/components/MasteryBar";

type View =
  | "overview"
  | "learning-path"
  | "concepts"
  | "progress"
  | "insights"
  | "evaluation";

const VIEWS: View[] = [
  "overview",
  "learning-path",
  "progress",
  "concepts",
  "insights",
  "evaluation",
];

const STEPS: { id: Screen; label: string }[] = [
  { id: "diagnostic", label: "Diagnose" },
  { id: "diagnosis", label: "Analysis" },
  { id: "intervention", label: "Intervene" },
  { id: "reassessment", label: "Reassess" },
  { id: "result", label: "Progress" },
];

type TraceStep = { stage: string; detail: unknown };

type AnalysisData = {
  diagnosis?: {
    concept?: string;
    correctness?: boolean;
    reasoning_summary?: string;
    misconception_detected?: boolean;
    misconception?: string | null;
    misconception_confidence?: number;
    recommended_intervention_type?: string;
    policy_rule?: string;
    policy_reason?: string;
    decision_trace?: { steps?: TraceStep[] };
  };
  updated_state?: {
    mastery: number;
    confidence: number;
    active_misconceptions: string[];
    attempt_count: number;
  };
  why_this_next?: string;
};

const STAGE_LABELS: Record<string, string> = {
  QUESTION: "Question asked",
  LEARNER_EVIDENCE: "Evidence collected",
  DIAGNOSIS: "Diagnosis made",
  LEARNER_STATE_UPDATE: "Learner model updated",
  INTERVENTION_POLICY: "Intervention selected",
};

function describeStep(step: TraceStep): string {
  const d = step.detail as Record<string, unknown> | string | null;
  if (typeof d === "string") return d;
  if (!d) return "";

  const pct = (v: unknown) =>
    typeof v === "number" ? `${Math.round(v * 100)}%` : "–";

  switch (step.stage) {
    case "LEARNER_EVIDENCE":
      return `Answer, reasoning and ${pct(d.confidence)} self-reported confidence recorded.`;
    case "DIAGNOSIS":
      return d.correct
        ? "Answer judged correct."
        : d.misconception
        ? `Answer judged incorrect. Misconception: ${String(d.misconception)}`
        : "Answer judged incorrect.";
    case "LEARNER_STATE_UPDATE":
      return `Mastery moved from ${pct(d.mastery_before)} to ${pct(d.mastery_after)}.`;
    case "INTERVENTION_POLICY":
      return `${String(d.selected ?? "").replaceAll("_", " ")} chosen by the "${String(
        d.rule ?? ""
      ).replaceAll("_", " ")}" rule.`;
    default:
      return "";
  }
}

function SessionSteps({ current }: { current: Screen }) {
  const idx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, i) => {
        const state = i < idx ? "done" : i === idx ? "active" : "todo";

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className={`step-dot ${state}`} />

            {state === "active" && (
              <span className="text-[12px] font-bold text-[#635bff]">
                {step.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [view, setView] = useState<View>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [states, setStates] = useState<LearnerConceptState[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mockMode, setMockMode] = useState(true);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(
    null
  );

  const [screen, setScreen] = useState<Screen>("dashboard");

  const [session, setSession] = useState<SessionStart | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnoseResponse | null>(null);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [reassessResult, setReassessResult] =
    useState<ReassessResponse | null>(null);

  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [confidence, setConfidence] = useState(0.5);

  const [reAnswer, setReAnswer] = useState("");
  const [reReasoning, setReReasoning] = useState("");
  const [reConfidence, setReConfidence] = useState(0.5);

  const [demoScenario, setDemoScenario] = useState<string>("");
  const [learnerId, setLearnerId] = useState<string | null>(null);

  /* ---------- INITIAL LOAD ---------- */

  useEffect(() => {
    const savedLearner =
      typeof window !== "undefined"
        ? localStorage.getItem("learnloop_learner_id")
        : null;

    if (savedLearner) {
      setLearnerId(savedLearner);
      refreshLearner(savedLearner);
    }

    api
      .listConcepts()
      .then((data) => {
        setConcepts(data);
        setBackendConnected(true);
      })
      .catch((e) => {
        setError(String(e));
        setBackendConnected(false);
      });

    api
      .health()
      .then((health) => {
        setMockMode(health.mock_mode);
        setBackendConnected(true);
      })
      .catch(() => {
        setBackendConnected(false);
      });
  }, []);

  async function refreshLearner(id?: string) {
    const target = id ?? learnerId;

    if (!target) return;

    try {
      const learner = await api.getLearner(target);
      setStates(learner.concept_states ?? []);
    } catch {
      // The dashboard can still function without learner state.
    }
  }

  /* ---------- SESSION ---------- */

  const startLearning = async (conceptId: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.startSession({
        name: "Learner",
        concept_id: conceptId,
        demo_scenario: demoScenario || undefined,
        learner_id: learnerId ?? undefined,
      });

      setSession(res);
      setLearnerId(res.learner_id);
      localStorage.setItem("learnloop_learner_id", res.learner_id);

      setMockMode(res.mock_mode);

      setAnswer("");
      setReasoning("");
      setConfidence(res.initial_confidence || 0.5);

      setDiagnosis(null);
      setIntervention(null);
      setReassessResult(null);

      setScreen("diagnostic");

      await refreshLearner(res.learner_id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const submitDiagnosis = async () => {
    if (!session || !answer.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.diagnose({
        session_id: session.session_id,
        learner_id: session.learner_id,
        concept_id: session.concept.id,
        answer,
        reasoning: reasoning || undefined,
        confidence,
      });

      setDiagnosis(res);
      setScreen("diagnosis");

      await refreshLearner(session.learner_id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const requestIntervention = async () => {
    if (!session || !diagnosis) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.intervention({
        session_id: session.session_id,
        learner_id: session.learner_id,
        concept_id: session.concept.id,
      });

      setIntervention(res);
      setScreen("intervention");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const submitReassessment = async () => {
    if (!session || !reAnswer.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.reassess({
        session_id: session.session_id,
        learner_id: session.learner_id,
        concept_id: session.concept.id,
        answer: reAnswer,
        reasoning: reReasoning || undefined,
        confidence: reConfidence,
      });

      setReassessResult(res);
      setScreen("result");

      await refreshLearner(session.learner_id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  /* ---------- NAVIGATION ---------- */

  const navigate = (next: string) => {
    if (VIEWS.includes(next as View)) {
      setView(next as View);
      setScreen("dashboard");

      setTimeout(() => {
        const element = document.getElementById(next);

        element?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 20);
    }
  };

  const resetSession = () => {
    setScreen("dashboard");
    setSession(null);
    setDiagnosis(null);
    setIntervention(null);
    setReassessResult(null);

    setAnswer("");
    setReasoning("");
    setReAnswer("");
    setReReasoning("");
    setDemoScenario("");
    setError(null);

    setView("overview");

    refreshLearner();
  };

  /* ---------- DERIVED STATE ---------- */

  const averageMastery = useMemo(() => {
    if (!states.length) return 0;
    return states.reduce((sum, s) => sum + s.mastery, 0) / states.length;
  }, [states]);

  const averageConfidence = useMemo(() => {
    if (!states.length) return 0;
    return states.reduce((sum, s) => sum + s.confidence, 0) / states.length;
  }, [states]);

  const totalAttempts = useMemo(
    () => states.reduce((sum, s) => sum + s.attempt_count, 0),
    [states]
  );

  const activeMisconceptions = useMemo(
    () => states.flatMap((s) => s.active_misconceptions),
    [states]
  );

  const oracleMessage = useMemo(() => {
    if (activeMisconceptions.length > 0) {
      return {
        title: "I spotted something worth fixing.",
        text: "Your reasoning revealed a misconception. Let's work on that before moving forward.",
        tone: "insight",
      };
    }

    if (!states.length) {
      return {
        title: "Let's discover what you know.",
        text: "Give me one answer. I'll use it to start building your learner model.",
        tone: "new",
      };
    }

    if (averageMastery < 0.4) {
      return {
        title: "Let's strengthen the foundation.",
        text: "I've found a few concepts where a stronger foundation could help you move faster.",
        tone: "focus",
      };
    }

    if (averageConfidence < 0.4) {
      return {
        title: "You may know more than you think.",
        text: "Let's reinforce your understanding and turn uncertainty into confidence.",
        tone: "confidence",
      };
    }

    if (averageMastery >= 0.75) {
      return {
        title: "Ready for a harder challenge?",
        text: "Your learner model is showing strong understanding. Let's test whether you can transfer it.",
        tone: "challenge",
      };
    }

    return {
      title: "Keep going. I'm learning how you think.",
      text: "Every answer gives LearnLoop more evidence about what you should learn next.",
      tone: "progress",
    };
  }, [
    activeMisconceptions,
    states.length,
    averageMastery,
    averageConfidence,
  ]);

  /* ====================================================== */
  /* SESSION EXPERIENCE                                      */
  /* ====================================================== */

  if (screen !== "dashboard" && session) {
    return (
      <div className="min-h-screen session-shell">
        <TopBar
          backendConnected={backendConnected}
          mockMode={mockMode}
          onHome={() => navigate("overview")}
          sidebarCollapsed={sidebarCollapsed}
        />

          <main className="w-full max-w-[1380px] mx-auto px-5 lg:px-8 xl:px-10 py-8">
          <button
            onClick={resetSession}
            className="text-xs font-bold text-[#77788b] hover:text-[#635bff] mb-6"
          >
            ← Back to learner dashboard
          </button>

          <SessionSteps current={screen} />

          {error && (
            <div className="mb-6 rounded-2xl bg-[#fff0f3] border border-[#f3d5dc] p-4 text-sm text-[#bd4d66]">
              <p className="font-bold">Request failed</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {/* DIAGNOSTIC */}

{screen === "diagnostic" && (
  <div className="space-y-6">
    {/* Learning Studio header */}
    <div className="flex items-start justify-between gap-5">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_12px_rgba(99,91,255,0.45)]" />

          <p className="text-[12px] uppercase tracking-[0.16em] font-black text-[var(--primary)]">
            Learning Studio
          </p>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-[-0.035em] text-[var(--text)] mt-2">
          Let&apos;s understand how you think.
        </h1>

      </div>

      <div className="hidden sm:flex flex-shrink-0 items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />

        <span className="text-[11px] uppercase tracking-[0.12em] font-black text-[var(--text-muted)]">
          Diagnostic
        </span>
      </div>
    </div>

    {/* Concept identity */}
    <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[0_14px_45px_rgba(30,30,70,0.05)]">
      <div className="grid lg:grid-cols-[1fr_0.82fr]">
        {/* Concept information */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[11px] uppercase tracking-[0.12em] font-black text-[var(--primary)]">
              {session.concept.difficulty}
            </span>

            <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
              Concept check
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-[-0.035em] text-[var(--text)] mt-4">
            {session.concept.name}
          </h2>

          <p className="text-sm leading-relaxed text-[var(--text-secondary)] mt-3 max-w-xl">
            {session.concept.description}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--primary)]">
              ✦
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
                What I&apos;m looking for
              </p>

              <p className="text-xs font-bold text-[var(--text)] mt-0.5">
                Your reasoning, not just your final answer
              </p>
            </div>
          </div>
        </div>

        {/* Concept-specific visual */}
        <div className="relative min-h-[220px] lg:min-h-full bg-[var(--surface-soft)] border-t lg:border-t-0 lg:border-l border-[var(--border)] overflow-hidden">
          {/* OVERFITTING */}
          {session.concept.id === "overfitting" && (
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--primary)]">
                Generalization check
              </p>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Can the model perform beyond the data it memorized?
              </p>

              <div className="relative mt-8 h-24">
                <div className="absolute left-0 right-0 top-1/2 border-t border-[var(--border)]" />

                <div className="absolute left-3 top-7 flex items-end gap-2">
                  {[22, 34, 46, 61, 72].map((height, index) => (
                    <span
                      key={index}
                      className="w-2 rounded-full bg-[color-mix(in_srgb,var(--primary)_70%,transparent)]"
                      style={{ height }}
                    />
                  ))}
                </div>

                <div className="absolute right-8 top-8 flex flex-col gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--pink)]" />
                  <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--pink)_60%,transparent)] ml-5" />
                  <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--pink)_40%,transparent)] ml-2" />
                </div>

                <div className="absolute left-1 bottom-0 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
                  Training data
                </div>

                <div className="absolute right-0 bottom-0 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
                  Unseen data
                </div>
              </div>
            </div>
          )}

          {/* BIAS VARIANCE */}
          {session.concept.id === "bias_variance" && (
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--primary)]">
                Model complexity check
              </p>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Think about underfitting, overfitting, and the tradeoff.
              </p>

              <div className="mt-8 flex items-center gap-5">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)] mb-2">
                    High bias
                  </p>

                  <div className="h-16 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
                    <div className="w-20 h-1 rounded-full bg-[var(--primary)] opacity-40" />
                  </div>
                </div>

                <div className="text-[var(--text-muted)] text-lg">
                  →
                </div>

                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)] mb-2">
                    High variance
                  </p>

                  <div className="h-16 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
                    <svg
                      viewBox="0 0 90 45"
                      className="w-20 h-12"
                      fill="none"
                    >
                      <path
                        d="M2 35 C12 8 22 40 32 13 C42 39 52 5 62 29 C72 9 78 35 88 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-[var(--pink)]"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TRAIN / VALIDATION / TEST */}
            {session.concept.id === "train_val_test" && (
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--primary)]">
                Evaluation check
              </p>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Separate learning, tuning, and final evaluation.
              </p>

              <div className="mt-9">
                <div className="flex h-12 rounded-2xl overflow-hidden border border-[var(--border)]">
                  <div className="w-[50%] bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] flex items-center justify-center">
                    <div>
                      <p className="text-[11px] font-black text-[var(--primary)]">
                        TRAIN
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Learn
                      </p>
                    </div>
                  </div>

                  <div className="w-[25%] bg-[color-mix(in_srgb,var(--violet)_15%,transparent)] flex items-center justify-center">
                    <div>
                      <p className="text-[11px] font-black text-[var(--violet)]">
                        VAL
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Tune
                      </p>
                    </div>
                  </div>

                  <div className="w-[25%] bg-[color-mix(in_srgb,var(--success)_15%,transparent)] flex items-center justify-center">
                    <div>
                      <p className="text-[11px] font-black text-[var(--success)]">
                        TEST
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Verify
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-3 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
                  <span>Learning</span>
                  <span>Selection</span>
                  <span>Generalization</span>
                </div>
              </div>
            </div>
          )}

          {/* REGULARIZATION */}
          {session.concept.id === "regularization" && (
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--primary)]">
                Complexity control check
              </p>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Think about how constraints affect model complexity.
              </p>

              <div className="mt-8 flex items-end justify-center gap-4 h-24">
                {[70, 56, 42, 28].map((height, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-8 rounded-t-lg ${
                        index === 3
                          ? "bg-[var(--primary)]"
                          : "bg-[color-mix(in_srgb,var(--pink)_30%,transparent)]"
                      }`}
                      style={{ height }}
                    />

                    <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-[var(--text-muted)]">
                      {index === 3 ? "λ" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GRADIENT DESCENT */}
          {session.concept.id === "gradient_descent" && (
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--primary)]">
                Optimization check
              </p>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Think about how the model finds a lower-loss direction.
              </p>

              <div className="relative mt-6 h-28">
                <svg
                  viewBox="0 0 300 120"
                  className="w-full h-full"
                  fill="none"
                >
                  <path
                    d="M10 25 C65 25 72 95 145 95 C215 95 225 30 290 30"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-[var(--border)]"
                  />

                  <path
                    d="M42 30 C65 40 73 70 105 87 C120 95 137 95 155 91"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-[var(--primary)]"
                  />

                  <circle
                    cx="42"
                    cy="30"
                    r="6"
                    fill="currentColor"
                    className="text-[var(--pink)]"
                  />

                  <circle
                    cx="155"
                    cy="91"
                    r="6"
                    fill="currentColor"
                    className="text-[var(--primary)]"
                  />
                </svg>

                <div className="absolute left-2 bottom-0 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
                  Higher loss
                </div>

                <div className="absolute right-3 bottom-0 text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
                  Lower loss
                </div>
              </div>
            </div>
          )}

          {/* CLASSIFICATION METRICS */}
          {session.concept.id === "classification_metrics" && (
            <div className="absolute inset-0 p-8 flex flex-col justify-center">
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--primary)]">
                Metrics check
              </p>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Choose the metric based on the cost of being wrong.
              </p>

              <div className="mt-7 flex justify-center">
                <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden border border-[var(--border)]">
                  <div className="w-24 h-12 bg-[color-mix(in_srgb,var(--success)_10%,transparent)] flex flex-col items-center justify-center">
                    <span className="text-[12px] font-black text-[var(--success)]">
                      TP
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      caught
                    </span>
                  </div>

                  <div className="w-24 h-12 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] flex flex-col items-center justify-center">
                    <span className="text-[12px] font-black text-[var(--danger)]">
                      FN
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      missed
                    </span>
                  </div>

                  <div className="w-24 h-12 bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] flex flex-col items-center justify-center">
                    <span className="text-[12px] font-black text-[var(--warning)]">
                      FP
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      flagged
                    </span>
                  </div>

                  <div className="w-24 h-12 bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] flex flex-col items-center justify-center">
                    <span className="text-[12px] font-black text-[var(--primary)]">
                      TN
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      cleared
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Question + learner evidence */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Main question */}
      <div className="contents">
        <div className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-[0_14px_45px_rgba(30,30,70,0.04)]">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#635bff] via-[#8b5cf6] to-transparent" />
          <div className="flex items-center justify-between gap-4 mb-5"></div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--text-muted)]">
                Diagnostic question
              </p>

              <p className="text-[12px] text-[var(--text-muted)] mt-1">
                There is no penalty for thinking out loud.
              </p>
            </div>

            <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)]">
              ?
            </div>
          </div>

                  <div className="rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] p-5 sm:p-6">
            <p className="text-base sm:text-lg leading-relaxed font-bold text-[var(--text)]">
              {session.diagnostic_question}
            </p>
          </div>
        </div>

        {/* Answer */}
<div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-[0_14px_45px_rgba(30,30,70,0.04)] space-y-6">

  {/* Answer field */}
  <div>
    <div className="flex items-center justify-between gap-3 mb-3">
      <div>
        <label className="text-[12px] uppercase tracking-[0.14em] font-black text-[var(--text-muted)]">
          Your answer
        </label>

        <p className="text-[12px] text-[var(--text-muted)] mt-1">
          Explain the concept in your own words.
        </p>
      </div>

      <span className="hidden sm:block text-[11px] font-bold text-[var(--text-muted)]">
        What do you think is happening?
      </span>
    </div>

    <textarea
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      rows={6}
      className="
        block
        w-full
        min-h-[170px]
        resize-none
        rounded-2xl
        border
        border-[var(--border)]
        bg-[var(--surface-soft)]
        px-5
        py-4
        text-sm
        leading-7
        text-[var(--text)]
        placeholder:text-[var(--text-muted)]
        outline-none
        transition-all
        duration-200
        focus:border-[var(--primary-border)]
        focus:ring-4
        focus:ring-[var(--primary-soft)]
      "
            placeholder="Start with what you believe is happening..."
    />
  </div>
</div>

{/* Reasoning + confidence + submit (second card) */}
<div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-[0_14px_45px_rgba(30,30,70,0.04)] space-y-6">

  {/* Reasoning field */}
  <div>
    <div className="flex items-center justify-between gap-3 mb-3">
      <div>
        <label className="text-[12px] uppercase tracking-[0.14em] font-black text-[var(--text-muted)]">
          Your reasoning
        </label>

        <p className="text-[12px] text-[var(--text-muted)] mt-1">
          Show how you arrived at your answer.
        </p>
      </div>

      <span className="hidden sm:block text-[11px] font-bold text-[var(--text-muted)]">
        Helps detect misconceptions
      </span>
    </div>

    <textarea
      value={reasoning}
      onChange={(e) => setReasoning(e.target.value)}
      rows={4}
      className="
        block
        w-full
        min-h-[125px]
        resize-none
        rounded-2xl
        border
        border-[var(--border)]
        bg-[var(--surface-soft)]
        px-5
        py-4
        text-sm
        leading-7
        text-[var(--text)]
        placeholder:text-[var(--text-muted)]
        outline-none
        transition-all
        duration-200
        focus:border-[var(--primary-border)]
        focus:ring-4
        focus:ring-[var(--primary-soft)]
      "
      placeholder="Why do you think that is the case?"
    />
  </div>

  {/* Confidence */}
  <div className="rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-[12px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
          Confidence
        </p>

        <p className="text-[12px] text-[var(--text-muted)] mt-1">
          How certain are you about your reasoning?
        </p>
      </div>

      <span className="text-xl font-black text-[var(--primary)]">
        {Math.round(confidence * 100)}%
      </span>
    </div>

    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={confidence}
      onChange={(e) =>
        setConfidence(parseFloat(e.target.value))
      }
      className="w-full accent-[var(--primary)] cursor-pointer"
    />

    <div className="flex justify-between text-[10px] uppercase tracking-[0.1em] font-bold text-[var(--text-muted)] mt-2">
      <span>Unsure</span>
      <span>Somewhat sure</span>
      <span>Very confident</span>
    </div>
  </div>

  {/* Primary action */}
  <button
    onClick={submitDiagnosis}
    disabled={loading || !answer.trim()}
    className="
      group
      w-full
      min-h-[52px]
      rounded-2xl
      px-6
      py-3.5
      bg-[var(--primary)]
      text-white
      text-xs
      font-black
      tracking-[0.01em]
      shadow-[0_12px_28px_rgba(99,91,255,0.22)]
      transition-all
      duration-200
      hover:-translate-y-0.5
      hover:shadow-[0_16px_34px_rgba(99,91,255,0.30)]
      active:translate-y-0
      disabled:opacity-50
      disabled:cursor-not-allowed
      disabled:hover:translate-y-0
    "
  >
    {loading ? (
      <span className="inline-flex items-center justify-center gap-2">
        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        Analyzing your learner evidence...
      </span>
    ) : (
      <span className="inline-flex items-center justify-center gap-2">
        Analyze my understanding
        <span className="text-sm transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </span>
    )}
  </button>

      <p className="text-center text-[11px] text-[var(--text-muted)]">
    LearnLoop will use your answer, reasoning, and confidence to decide what happens next.
  </p>
</div>
      </div>

      {/* Learner Twin */}
            <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-[84px] lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_14px_45px_rgba(30,30,70,0.04)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)]">
              ✦
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] font-black text-[var(--text-muted)]">
                Learner Twin
              </p>

              <p className="text-xs font-black text-[var(--text)] mt-0.5">
                Current understanding
              </p>
            </div>
          </div>

          <StatePanel
            mastery={session.initial_mastery}
            confidence={session.initial_confidence}
            misconceptions={[]}
          />

          <div className="mt-5 pt-5 border-t border-[var(--border)]">
            <p className="text-[11px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
              What happens next
            </p>

            <div className="mt-3 space-y-3">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-[10px] font-black">
                  1
                </span>

                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  Your answer becomes evidence about your understanding.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-[10px] font-black">
                  2
                </span>

                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  LearnLoop checks for misconceptions and confidence signals.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-[10px] font-black">
                  3
                </span>

                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  The next intervention is selected from your learner state.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
                              {/* ANALYSIS */}

          {screen === "diagnosis" && diagnosis && (() => {
            const data = diagnosis as unknown as AnalysisData;
            const d = data.diagnosis ?? {};
            const state = data.updated_state;
            const steps = d.decision_trace?.steps ?? [];

            const update = steps.find((s) => s.stage === "LEARNER_STATE_UPDATE")
              ?.detail as { mastery_before?: number; mastery_after?: number } | undefined;

            const before = update?.mastery_before;
            const after = update?.mastery_after ?? state?.mastery ?? 0;
            const delta = before !== undefined ? after - before : null;

            const correct = d.correctness === true;
            const learnerConf = state?.confidence ?? 0;

            const calibration = correct
              ? learnerConf < 0.4
                ? "Underconfident"
                : "Well calibrated"
              : learnerConf >= 0.6
              ? "Overconfident"
              : "Well calibrated";

            const headline = correct
              ? "You've got the core idea."
              : "LearnLoop found a gap to work on.";

            const subline = correct
              ? learnerConf < 0.4
                ? "Your answer was right, but you weren't sure. Reinforcing it will turn that uncertainty into confidence."
                : "Your answer and your confidence line up. Next we'll test whether it transfers."
              : learnerConf >= 0.6
              ? "You were fairly sure and the answer missed. That gap between confidence and accuracy is the most useful signal for choosing your next step."
              : "The answer missed, and you sensed it. That honesty helps LearnLoop target the right foundation.";

            const intervention = (d.recommended_intervention_type ?? "next step").replaceAll("_", " ");
            const misconceptionPct = Math.round((d.misconception_confidence ?? 0) * 100);

            return (
              <div className="space-y-6">
                {/* HEADER */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.17em] text-[var(--primary)]">
                      Analysis
                    </p>
                    {d.concept && (
                      <span className="text-[12px] font-semibold text-[var(--text-muted)]">
                        · {d.concept}
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.035em] text-[var(--text)] mt-2">
                    {headline}
                  </h1>

                  <p className="text-base text-[var(--text-secondary)] mt-3 max-w-2xl leading-relaxed">
                    {subline}
                  </p>
                </div>

                                <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
                  <div className="contents">
                    {/* RESULT TILES */}
                    <div className="order-1 lg:col-start-1 lg:row-start-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="app-card p-5">
                        <p className="text-[11px] uppercase tracking-[0.13em] font-extrabold text-[var(--text-muted)]">
                          Result
                        </p>
                        <p
                          className={`text-2xl font-extrabold mt-2 ${
                            correct ? "text-[var(--success)]" : "text-[var(--warning)]"
                          }`}
                        >
                          {correct ? "Correct" : "Needs work"}
                        </p>
                      </div>

                      <div className="app-card p-5">
                        <p className="text-[11px] uppercase tracking-[0.13em] font-extrabold text-[var(--text-muted)]">
                          Your confidence
                        </p>
                        <p className="text-2xl font-extrabold mt-2 text-[var(--primary)]">
                          {Math.round(learnerConf * 100)}%
                        </p>
                      </div>

                      <div className="app-card p-5">
                        <p className="text-[11px] uppercase tracking-[0.13em] font-extrabold text-[var(--text-muted)]">
                          Calibration
                        </p>
                        <p
                          className={`text-2xl font-extrabold mt-2 ${
                            calibration === "Well calibrated"
                              ? "text-[var(--success)]"
                              : "text-[var(--warning)]"
                          }`}
                        >
                          {calibration}
                        </p>
                      </div>
                    </div>

                    {/* MISCONCEPTION */}
                    {d.misconception_detected && d.misconception && (
                                            <div className="order-2 lg:col-start-1 lg:row-start-2 rounded-[22px] border border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[var(--warning)] flex items-center justify-center text-lg font-extrabold">
                            !
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-[var(--warning)]">
                              Misconception detected
                            </p>

                            <p className="text-lg font-bold text-[var(--text)] mt-1.5 leading-snug">
                              {d.misconception}
                            </p>

                            <div className="mt-4 flex items-center gap-3">
                              <div className="h-2 flex-1 rounded-full bg-[var(--border)] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[var(--warning)]"
                                  style={{ width: `${misconceptionPct}%` }}
                                />
                              </div>
                              <span className="text-[12px] font-bold text-[var(--text-secondary)] whitespace-nowrap">
                                {misconceptionPct}% detection confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                                        {/* MASTERY SHIFT */}
                    <div className="order-4 lg:col-start-1 lg:row-start-3 app-card p-6 flex flex-col justify-center">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.15em] font-extrabold text-[var(--text-muted)]">
                            Mastery shift
                          </p>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            How this attempt moved your learner model.
                          </p>
                        </div>

                        {delta !== null && (
                          <span
                            className={`px-3 py-1.5 rounded-full text-[12px] font-extrabold ${
                              delta >= 0
                                ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]"
                                : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
                            }`}
                          >
                            {delta >= 0 ? "+" : ""}
                            {Math.round(delta * 100)}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-8 mt-6">
                        {before !== undefined && (
                          <>
                            <div className="text-center">
                              <p className="text-3xl font-extrabold text-[var(--text-muted)]">
                                {Math.round(before * 100)}%
                              </p>
                              <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-[var(--text-muted)] mt-1">
                                Before
                              </p>
                            </div>

                            <span className="text-2xl text-[var(--primary)]">→</span>
                          </>
                        )}

                        <div className="text-center">
                          <p className="text-5xl font-extrabold text-[var(--primary)]">
                            {Math.round(after * 100)}%
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-[var(--text-muted)] mt-1">
                            After
                          </p>
                        </div>
                      </div>

                      <div className="w-full max-w-xl mx-auto mt-6">
                        <MasteryBar value={after} />
                      </div>
                    </div>

                    {/* HOW LEARNLOOP DECIDED */}
                    {steps.length > 0 && (
                      <div className="order-6 lg:col-span-2 lg:row-start-4 app-card p-6">
                        <p className="text-[11px] uppercase tracking-[0.15em] font-extrabold text-[var(--text-muted)]">
                          How LearnLoop decided
                        </p>

                        <ol className="mt-5 space-y-5 border-l border-[var(--border)] ml-3">
                          {steps.map((step, i) => (
                            <li key={`${step.stage}-${i}`} className="relative pl-7">
                              <span className="absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full bg-[var(--primary)] border-2 border-[var(--surface)]" />

                              <p className="text-[13px] font-extrabold text-[var(--text)]">
                                {STAGE_LABELS[step.stage] ?? step.stage}
                              </p>

                              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-1">
                                {describeStep(step)}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: decision + learner twin */}
                                    <div className="contents">
                    <div className="order-3 lg:col-start-2 lg:row-start-1 lg:row-span-2 app-card relative overflow-hidden p-5">
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#635bff] via-[#8b5cf6] to-transparent" />

                      <p className="text-[11px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                        Recommended next step
                      </p>

                      <p className="text-xl font-extrabold text-[var(--text)] mt-2 capitalize">
                        {intervention}
                      </p>

                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-2">
                        {d.policy_reason ?? data.why_this_next}
                      </p>

                      {d.policy_rule && (
                        <span className="inline-block mt-3 px-2.5 py-1 rounded-full bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[11px] font-bold text-[var(--primary)] capitalize">
                          Rule: {d.policy_rule.replaceAll("_", " ")}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={requestIntervention}
                        disabled={loading}
                        className="bg-[var(--primary)] text-white shadow-[0_12px_28px_rgba(99,91,255,0.22)] hover:opacity-90 transition-all w-full mt-5 px-6 py-3.5 rounded-xl text-sm font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Selecting intervention..." : "Get my intervention →"}
                      </button>
                    </div>

                                        {state && (
                      <div className="order-5 lg:col-start-2 lg:row-start-3 flex">
                        <StatePanel
                          mastery={state.mastery}
                          confidence={state.confidence}
                          misconceptions={state.active_misconceptions}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* INTERVENTION */}

                    {screen === "intervention" && intervention && (
            <div className="space-y-6">
              {/* HEADER */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-extrabold uppercase tracking-[0.17em] text-[var(--primary)]">
                    Personalized intervention
                  </p>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                </div>

                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.035em] text-[var(--text)] mt-2">
                  Let&apos;s work on {session.concept.name}.
                </h1>

                <p className="text-base text-[var(--text-secondary)] mt-3 max-w-2xl leading-relaxed">
                  LearnLoop selected this intervention from your current learner
                  state, not from a fixed lesson sequence.
                </p>
              </div>

              <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
                {/* LEFT: lesson */}
                <div className="app-card relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#635bff] via-[#8b5cf6] to-transparent" />

                  <div className="p-7 lg:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center font-extrabold">
                        ✦
                      </div>

                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] font-extrabold text-[var(--primary)]">
                          Your personalized lesson
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Selected from your learner state
                        </p>
                      </div>
                    </div>

                    <LessonBody content={intervention.content} />
                  </div>
                </div>

                {/* RIGHT: why + summary + CTA */}
                <div className="flex flex-col gap-4">
                  <WhyThisNext text={intervention.why_this_next} />

                  <div className="app-card p-5">
                    <p className="text-[11px] uppercase tracking-[0.15em] font-extrabold text-[var(--text-muted)]">
                      Adaptation
                    </p>

                    <ol className="mt-4 space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-xs font-extrabold">
                          01
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.13em] font-extrabold text-[var(--text-muted)]">
                            Strategy
                          </p>
                          <p className="text-sm font-extrabold text-[var(--text)] mt-0.5 capitalize">
                            {intervention.intervention_type.replaceAll("_", " ")}
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3">
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)] flex items-center justify-center text-xs font-extrabold">
                          02
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.13em] font-extrabold text-[var(--text-muted)]">
                            Learning target
                          </p>
                          <p
                            className="text-sm font-extrabold text-[var(--text)] mt-0.5 leading-snug"
                            title={intervention.misconception_targeted ?? undefined}
                          >
                            {intervention.misconception_targeted ?? "Current understanding"}
                          </p>
                        </div>
                      </li>

                      <li className="flex items-start gap-3">
                        <div className="w-8 h-8 shrink-0 rounded-lg bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)] flex items-center justify-center text-xs font-extrabold">
                          03
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.13em] font-extrabold text-[var(--text-muted)]">
                            Next evidence
                          </p>
                          <p className="text-sm font-extrabold text-[var(--text)] mt-0.5">
                            Reassessment
                          </p>
                        </div>
                      </li>
                    </ol>
                  </div>

                   <div className="app-card p-5 mt-auto">
                    <p className="text-sm font-extrabold text-[var(--text)]">
                      Ready to test what changed?
                    </p>
                    <p className="text-[13px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                      LearnLoop will reassess the same concept and use the new
                      evidence to update your learner model.
                    </p>
                    <button
                      type="button"
                      onClick={() => setScreen("reassessment")}
                      className="bg-[var(--primary)] text-white shadow-[0_12px_28px_rgba(99,91,255,0.22)] hover:opacity-90 transition-all w-full mt-4 px-6 py-3.5 rounded-xl text-sm font-extrabold"
                    >
                      Continue to reassessment →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REASSESSMENT */}

          {screen === "reassessment" && (
  <div className="space-y-6">
    {/* HEADER */}
    <div>
      <div className="flex items-center gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.17em] text-[var(--primary)]">
          Reassessment
        </p>

        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
      </div>

      <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.035em] text-[var(--text)] mt-2">
        Show what changed.
      </h1>

      <p className="text-sm text-[var(--text-muted)] mt-2">
        Apply the intervention and show LearnLoop what you understand now.
      </p>
    </div>

    {/* REASSESSMENT LOOP */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="app-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center font-extrabold">
            01
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
              Earlier
            </p>

            <p className="text-xs font-extrabold text-[var(--text)] mt-0.5">
              Diagnostic evidence
            </p>
          </div>
        </div>
      </div>

      <div className="app-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center font-extrabold">
            02
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
              Intervention
            </p>

            <p className="text-xs font-extrabold text-[var(--text)] mt-0.5">
              Targeted learning
            </p>
          </div>
        </div>
      </div>

      <div className="app-card p-4 border-[var(--primary-border)] bg-[var(--primary-soft)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-extrabold">
            03
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-[var(--primary)]">
              Now
            </p>

            <p className="text-xs font-extrabold text-[var(--text)] mt-0.5">
              New evidence
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* QUESTION + FORM */}
    <div className="app-card p-6 lg:p-7">
      {/* QUESTION */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-5">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#635bff] via-[#8b5cf6] to-transparent" />

        <div className="flex items-start gap-4">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-[var(--surface)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center font-extrabold">
            ?
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--primary)] font-extrabold">
              Same concept · New evidence
            </p>

            <p className="text-base lg:text-lg text-[var(--text)] font-semibold leading-relaxed mt-2">
              {session.concept.reassessment_question ??
                `Explain the key principle behind ${session.concept.name} and how you would recognize it in practice.`}
            </p>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="space-y-6 mt-7">
        {/* ANSWER */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] uppercase tracking-[0.14em] font-extrabold text-[var(--text-muted)]">
              Your answer
            </label>

            <span className="text-[11px] font-semibold text-[var(--text-muted)]">
              Required
            </span>
          </div>

          <textarea
            value={reAnswer}
            onChange={(e) => setReAnswer(e.target.value)}
            rows={5}
            className="block w-full min-h-[140px] resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--text-muted)] transition focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
            placeholder="Explain what you now understand..."
          />

          <p className="text-[12px] text-[var(--text-muted)] mt-2">
            Focus on what you learned from the intervention.
          </p>
        </div>

        {/* REASONING */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[12px] uppercase tracking-[0.14em] font-extrabold text-[var(--text-muted)]">
              What changed in your reasoning?
            </label>

            <span className="text-[11px] font-semibold text-[var(--text-muted)]">
              Evidence for adaptation
            </span>
          </div>

          <textarea
            value={reReasoning}
            onChange={(e) => setReReasoning(e.target.value)}
                        rows={4}
            className="block w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--text)] placeholder:text-[var(--text-muted)] transition focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
            placeholder="Explain what you understand differently now..."
          />

          <p className="text-[12px] text-[var(--text-muted)] mt-2">
            This helps LearnLoop determine whether the original misconception
            has actually been resolved.
          </p>
        </div>

        {/* CONFIDENCE */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-[12px] uppercase tracking-[0.14em] font-extrabold text-[var(--text-muted)]">
                Confidence after intervention
              </label>

              <p className="text-xs text-[var(--text-secondary)] mt-1">
                How confident are you in your new understanding?
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-extrabold text-[var(--primary)]">
                {Math.round(reConfidence * 100)}%
              </p>

              <p className="text-[11px] font-semibold text-[var(--text-muted)]">
                self-reported
              </p>
            </div>
          </div>

          <div className="mt-5">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={reConfidence}
              onChange={(e) =>
                setReConfidence(parseFloat(e.target.value))
              }
                            className="themed-range"
              style={{ "--pct": `${reConfidence * 100}%` } as React.CSSProperties}
            />

            <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-2">
              <span>Not sure</span>
              <span>Somewhat confident</span>
              <span>Very confident</span>
            </div>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="pt-1">
          <button
            type="button"
            onClick={submitReassessment}
            disabled={loading || !reAnswer.trim()}
            className="bg-[var(--primary)] text-white shadow-[0_12px_28px_rgba(99,91,255,0.22)] hover:opacity-90 transition-all w-full sm:w-auto px-7 py-3.5 rounded-xl text-xs font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Updating learner model..."
              : "Update my learner model →"}
          </button>

          {!reAnswer.trim() && (
            <p className="text-[12px] text-[var(--text-muted)] mt-2">
              Add your answer before updating the learner model.
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
)}

                    {/* RESULT */}

          {screen === "result" && reassessResult && (
            <div className="space-y-6">
              {/* HEADER */}
              <div className="text-center max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)]" />

                  <p className="text-[12px] uppercase tracking-[0.17em] text-[var(--primary)] font-extrabold">
                    Learning evidence
                  </p>
                </div>

                <h1 className="text-3xl lg:text-4xl font-extrabold tracking-[-0.035em] text-[var(--text)] mt-3">
                  {reassessResult.is_correct
                    ? "Your learner model improved."
                    : "LearnLoop found another gap."}
                </h1>

                <p className="text-sm text-[var(--text-muted)] mt-3 leading-relaxed">
                  {reassessResult.progress_summary}
                </p>
              </div>

              {/* MASTERY TRANSITION */}
              <div className="app-card p-6 lg:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-extrabold">
                      Mastery transition
                    </p>

                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Evidence from your reassessment
                    </p>
                  </div>

                  <div
                                        className={`px-3 py-1.5 rounded-full text-[12px] font-extrabold ${
                      Math.round(reassessResult.mastery_delta * 100) > 0
                        ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
                        : Math.round(reassessResult.mastery_delta * 100) === 0
                        ? "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                        : "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
                    }`}
                  >
                    {Math.round(reassessResult.mastery_delta * 100) > 0
                      ? "Progress registered"
                      : Math.round(reassessResult.mastery_delta * 100) === 0
                      ? "No change yet"
                      : "More practice needed"}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-9 mt-8">
                  {/* BEFORE */}
                  <div className="text-center">
                    <p className="text-3xl font-extrabold tracking-tight text-[var(--text-muted)]">
                      {Math.round(reassessResult.previous_mastery * 100)}%
                    </p>

                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-extrabold mt-1">
                      Before
                    </p>
                  </div>

                  <div className="hidden sm:flex w-10 h-10 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] items-center justify-center text-lg font-bold">
                    →
                  </div>

                  <div className="sm:hidden text-[var(--primary)] text-xl">
                    ↓
                  </div>

                  {/* AFTER */}
                  <div className="text-center">
                    <p className="text-4xl font-extrabold tracking-tight text-[var(--primary)]">
                      {Math.round(reassessResult.new_mastery * 100)}%
                    </p>

                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-extrabold mt-1">
                      After
                    </p>
                  </div>

                  {/* CHANGE */}
                  <div className="sm:pl-8 sm:border-l border-[var(--border)] text-center">
                    <p
                                            className={`text-2xl font-extrabold ${
                        Math.round(reassessResult.mastery_delta * 100) > 0
                          ? "text-[var(--success)]"
                          : Math.round(reassessResult.mastery_delta * 100) === 0
                          ? "text-[var(--text-muted)]"
                          : "text-[var(--warning)]"
                      }`}
                    >
                      {Math.round(reassessResult.mastery_delta * 100) > 0 ? "+" : ""}
                      {Math.round(reassessResult.mastery_delta * 100)}%
                    </p>

                    <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-extrabold mt-1">
                      Change
                    </p>
                  </div>
                </div>
              </div>

              {/* WHY THIS NEXT */}
              <WhyThisNext text={reassessResult.why_this_next} />

                            {/* ADAPTIVE STATE */}
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="app-card p-6 flex flex-col">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--text-muted)] font-extrabold">
                    Next adaptive action
                  </p>

                  <p className="text-lg font-extrabold text-[var(--text)] mt-2 leading-snug">
                    {reassessResult.next_action}
                  </p>

                  <div className="mt-5 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] p-4">
                    <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--text-muted)] font-extrabold">
                      Misconception status
                    </p>

                    <p className="text-sm font-semibold text-[var(--text-secondary)] mt-2">
                      {reassessResult.updated_state.active_misconceptions.length === 0
                        ? "No active misconceptions detected."
                        : `${reassessResult.updated_state.active_misconceptions.length} active misconception${
                            reassessResult.updated_state.active_misconceptions.length > 1
                              ? "s"
                              : ""
                          } remains.`}
                    </p>
                  </div>

                  <div className="mt-auto pt-6">
                    <button
                      type="button"
                      onClick={resetSession}
                      className="bg-[var(--primary)] text-white shadow-[0_12px_28px_rgba(99,91,255,0.22)] hover:opacity-90 transition-all w-full px-7 py-3.5 rounded-xl text-sm font-extrabold"
                    >
                      Return to learner dashboard →
                    </button>
                  </div>
                </div>

                <StatePanel
                  mastery={reassessResult.updated_state.mastery}
                  confidence={reassessResult.updated_state.confidence}
                  misconceptions={reassessResult.updated_state.active_misconceptions}
                />
              </div>

            </div>
          )}
        </main>
      </div>
    );
  }

  /* ====================================================== */
  /* DASHBOARD                                               */
  /* Order: Overview → Learning Path → Progress →            */
  /*        Concepts → Insights → Evaluation                 */
  /* ====================================================== */

  return (
    <div className="min-h-screen">
      <Sidebar
        active={view}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      <div
        className={`min-h-screen transition-[margin] duration-300 ease-out ${
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[238px]"
        }`}
      >
                <TopBar
          backendConnected={backendConnected}
          mockMode={mockMode}
          onHome={() => navigate("overview")}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="max-w-[1450px] mx-auto px-5 lg:px-9 py-8">
          {error && (
            <div className="mb-6 rounded-2xl bg-[#fff0f3] border border-[#f3d5dc] p-4 text-sm text-[#bd4d66]">
              <p className="font-bold">Something needs attention</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {/* 1. OVERVIEW */}

          <section id="overview" className="scroll-mt-28">
            {/* OVERVIEW HEADER */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-7">
              <div className="flex items-center gap-5">
                {/* ORACLE */}
                <div className="hidden sm:flex relative w-[76px] h-[76px] shrink-0 rounded-[24px] items-center justify-center overflow-hidden border border-[var(--primary-border)] bg-gradient-to-br from-[var(--primary-soft)] via-[var(--surface)] to-[var(--surface-soft)] shadow-[0_12px_30px_rgba(99,91,255,0.12)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,91,255,0.18),transparent_62%)]" />

                  <div className="relative z-10 w-11 h-11 rounded-[15px] bg-gradient-to-br from-[#6d63ff] to-[#8b5cf6] shadow-[0_8px_20px_rgba(99,91,255,0.30)] flex items-center justify-center">
                    <div className="w-7 h-6 rounded-[10px] bg-white/95 relative">
                      <span className="absolute left-[7px] top-[8px] w-[4px] h-[4px] rounded-full bg-[#635bff]" />
                      <span className="absolute right-[7px] top-[8px] w-[4px] h-[4px] rounded-full bg-[#635bff]" />
                      <span className="absolute left-1/2 -translate-x-1/2 bottom-[5px] w-[8px] h-[3px] rounded-full bg-[#8b5cf6]" />
                    </div>
                  </div>

                  <span className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[var(--success)] border-2 border-[var(--surface)]" />
                </div>

                              {/* TITLE */}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[12px] uppercase tracking-[0.18em] font-extrabold text-[var(--primary)]">
                    Learner intelligence
                  </p>

                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />

                  <span className="text-[12px] font-semibold text-[var(--text-muted)]">
                    Adaptive mode
                  </span>
                </div>

                <h1 className="text-3xl lg:text-4xl font-extrabold text-[var(--text)] mt-2 tracking-[-0.04em]">
                  Welcome back 👋
                </h1>

                <p className="text-base lg:text-lg font-extrabold text-[var(--text)] mt-2">
                  Oracle is learning how you learn.
                </p>

                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-xl leading-relaxed">
                  LearnLoop continuously updates your learner model from
                  answers, reasoning, confidence, and intervention outcomes.
                </p>
              </div>
            </div>

              {/* ORACLE INSIGHT */}
              <div className="xl:max-w-[390px] w-full">
                <div className="relative rounded-[22px] border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4 shadow-[0_10px_30px_rgba(99,91,255,0.06)]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-xl bg-[var(--surface)] border border-[var(--primary-border)] flex items-center justify-center text-[var(--primary)] font-bold">
                      ✦
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                          Oracle insight
                        </p>

                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                      </div>

                      <p className="text-sm font-extrabold text-[var(--text)] mt-1">
                        {oracleMessage.title}
                      </p>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1.5">
                        {oracleMessage.text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* LEARNER STATE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* AVG MASTERY */}
              <div className="app-card group relative overflow-hidden p-5">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[var(--primary-soft)] blur-2xl opacity-70 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
                      Avg mastery
                    </p>

                    <div className="w-8 h-8 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center text-sm">
                      ◒
                    </div>
                  </div>

                  <p className="metric-value text-3xl font-extrabold mt-4">
                    {Math.round(averageMastery * 100)}%
                  </p>

                  <p className="text-[12px] text-[var(--text-muted)] mt-1">
                    Across assessed concepts
                  </p>
                </div>
              </div>

              {/* CONFIDENCE */}
              <div className="app-card group relative overflow-hidden p-5">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[color-mix(in_srgb,var(--violet)_10%,transparent)] blur-2xl pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
                      Confidence
                    </p>

                    <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--violet)_10%,transparent)] text-[var(--violet)] flex items-center justify-center text-sm">
                      ◉
                    </div>
                  </div>

                  <p className="metric-value text-3xl font-extrabold mt-4">
                    {Math.round(averageConfidence * 100)}%
                  </p>

                  <p className="text-[12px] text-[var(--text-muted)] mt-1">
                    Self-reported confidence
                  </p>
                </div>
              </div>

              {/* CONCEPTS */}
              <div className="app-card group relative overflow-hidden p-5">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[color-mix(in_srgb,var(--pink)_10%,transparent)] blur-2xl pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
                      Concepts
                    </p>

                    <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--pink)_10%,transparent)] text-[var(--pink)] flex items-center justify-center text-sm">
                      ◇
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="metric-value text-3xl font-extrabold">
                      {states.length}
                    </span>

                    <span className="text-lg font-semibold text-[var(--text-muted)]">
                      / {concepts.length}
                    </span>
                  </div>

                  <p className="text-[12px] text-[var(--text-muted)] mt-1">
                    Concepts assessed
                  </p>
                </div>
              </div>

              {/* ATTEMPTS */}
              <div className="app-card group relative overflow-hidden p-5">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[color-mix(in_srgb,var(--success)_10%,transparent)] blur-2xl pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
                      Evidence
                    </p>

                    <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)] flex items-center justify-center text-sm">
                      ↗
                    </div>
                  </div>

                  <p className="metric-value text-3xl font-extrabold mt-4">
                    {totalAttempts}
                  </p>

                  <p className="text-[12px] text-[var(--text-muted)] mt-1">
                    Learning attempts recorded
                  </p>
                </div>
              </div>
            </div>

            {/* ADAPTIVE LEARNING PATH */}
            <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5">
              {/* PATH */}
              <div className="app-card p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.16em] font-extrabold text-[var(--primary)]">
                      Adaptive learning path
                    </p>

                    <h2 className="text-lg font-extrabold text-[var(--text)] mt-1">
                      Your learning state
                    </h2>

                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      The path changes when LearnLoop finds new evidence.
                    </p>
                  </div>

                  <div className="px-3 py-1.5 rounded-full bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[12px] font-bold text-[var(--primary)]">
                    Evidence-driven
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="w-9 h-9 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center font-bold">
                      01
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-[var(--text)]">
                        Diagnose
                      </p>

                      <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                        Establish what you currently know.
                      </p>
                    </div>

                    <span className="text-[var(--success)] text-sm">✓</span>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-4">
                    <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold shadow-sm">
                      02
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-[var(--text)]">
                        Detect
                      </p>

                      <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                        Identify misconceptions and confidence gaps.
                      </p>
                    </div>

                    <span className="px-2 py-1 rounded-full bg-[var(--surface)] text-[11px] font-bold text-[var(--primary)] border border-[var(--primary-border)]">
                      Core
                    </span>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center font-bold">
                      03
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-[var(--text)]">
                        Intervene
                      </p>

                      <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                        Select the next explanation or practice strategy.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center font-bold">
                      04
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-[var(--text)]">
                        Reassess
                      </p>

                      <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                        Check whether the intervention actually worked.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center font-bold">
                      05
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold text-[var(--text)]">
                        Adapt
                      </p>

                      <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
                        Update the learner model for what comes next.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* WHY THIS NEXT */}
              <div className="app-card p-6 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-[var(--primary-soft)] blur-3xl pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center">
                      ✦
                    </div>

                    <div>
                      <p className="text-[12px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                        Decision layer
                      </p>

                      <h3 className="text-base font-extrabold text-[var(--text)] mt-0.5">
                        Why this next?
                      </h3>
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                      LearnLoop does not follow a fixed lesson sequence. Each
                      next step is selected from the learner state built from
                      your evidence.
                    </p>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
                          Mastery signal
                        </p>

                        <p className="text-xs font-bold text-[var(--text)] mt-1">
                          {Math.round(averageMastery * 100)}% average mastery
                        </p>
                      </div>

                      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-[var(--text-muted)]">
                          Confidence signal
                        </p>

                        <p className="text-xs font-bold text-[var(--text)] mt-1">
                          {Math.round(averageConfidence * 100)}% self-reported
                          confidence
                        </p>
                      </div>

                      <div className="rounded-xl border border-[var(--primary-border)] bg-[var(--primary-soft)] p-3.5">
                        <p className="text-[11px] uppercase tracking-[0.12em] font-extrabold text-[var(--primary)]">
                          Adaptive principle
                        </p>

                        <p className="text-xs font-bold text-[var(--text)] mt-1 leading-relaxed">
                          Intervention changes when misconception evidence
                          persists.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONCEPT SNAPSHOT */}
            <div className="mt-5 app-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.16em] font-extrabold text-[var(--primary)]">
                    Concept snapshot
                  </p>

                  <h2 className="text-lg font-extrabold text-[var(--text)] mt-1">
                    Where your learner model stands
                  </h2>
                </div>

                <p className="text-[12px] font-semibold text-[var(--text-muted)]">
                  {states.length} of {concepts.length} concepts assessed
                </p>
              </div>

              {states.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-6 text-center">
                  <p className="text-sm font-bold text-[var(--text)]">
                    Your learner model is ready.
                  </p>

                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Start a learning session to create your first evidence
                    point.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {states.slice(0, 6).map((state) => {
                    const concept = concepts.find(
                      (item) => item.id === state.concept_id
                    );

                    const mastery = Math.round(state.mastery * 100);

                    return (
                      <div
                        key={state.concept_id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-[var(--text)] truncate">
                              {concept?.name || "Concept"}
                            </p>

                            <p className="text-[12px] text-[var(--text-muted)] mt-1">
                              {state.attempt_count} attempt
                              {state.attempt_count === 1 ? "" : "s"}
                            </p>
                          </div>

                          <span className="text-sm font-extrabold text-[var(--primary)]">
                            {mastery}%
                          </span>
                        </div>

                        <div className="mt-3 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#635bff] to-[#8b5cf6]"
                            style={{ width: `${Math.min(100, mastery)}%` }}
                          />
                        </div>

                        {state.active_misconceptions?.length > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)]" />

                            <span className="text-[11px] font-bold text-[var(--warning)]">
                              Misconception active
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 2. LEARNING PATH */}

          <section
  id="learning-path"
  className="scroll-mt-28 mt-6 grid xl:grid-cols-[1.45fr_0.85fr] gap-5"
>
            <LearningPath
              concepts={concepts}
              states={states}
              onStart={startLearning}
            />

            <LearnerTwin states={states} />
          </section>

          {/* TODAY'S LEARNING (part of the learning path area, no sidebar entry) */}

          <section className="mt-6">
            <TodayLearning
              concepts={concepts}
              states={states}
              onStart={startLearning}
            />
          </section>

          {/* 3. PROGRESS */}

          <section id="progress" className="scroll-mt-28 mt-6">
            <ProgressOverview states={states} />
          </section>

          {/* 4. CONCEPTS */}

<section id="concepts" className="scroll-mt-28 mt-5">
  {/* Section header */}
  <div className="flex items-end justify-between gap-4 mb-5">
    <div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_12px_rgba(99,91,255,0.45)]" />

        <p className="text-[12px] uppercase tracking-[0.16em] font-bold text-[var(--text-muted)]">
          Knowledge space
        </p>
      </div>

      <h2 className="text-2xl font-black tracking-[-0.03em] text-[var(--text)] mt-2">
        Explore concepts
      </h2>

      <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xl">
        LearnLoop adapts the learning path around what you understand,
        what you miss, and how confidently you reason.
      </p>
    </div>

    <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
      <span className="text-sm font-black text-[var(--text)]">
        {concepts.length}
      </span>

      <span className="text-[12px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
        concepts
      </span>
    </div>
  </div>

  {/* Concept grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {concepts.map((concept) => {
      const state = states.find(
        (s) => s.concept_id === concept.id
      );

      const mastery = Math.round((state?.mastery ?? 0) * 100);
      const attempts = state?.attempt_count ?? 0;

      const status =
        attempts === 0
          ? "Not started"
          : mastery >= 75
          ? "Strong"
          : mastery >= 40
          ? "Developing"
          : "Needs attention";

      const statusClass =
        attempts === 0
          ? "text-[var(--text-muted)] bg-[var(--surface-muted)]"
          : mastery >= 75
          ? "text-[var(--success)] bg-[rgba(16,185,129,0.10)]"
          : mastery >= 40
          ? "text-[var(--warning)] bg-[rgba(245,158,11,0.10)]"
          : "text-[var(--danger)] bg-[rgba(239,68,68,0.10)]";

      const visualMap: Record<
  string,
  { label: string; visual: React.ReactNode }
> = {
  overfitting: {
    label: "GENERALIZATION",
    visual: (
      <div className="relative h-[116px] overflow-hidden rounded-[18px] border border-[var(--primary-border)] bg-gradient-to-br from-[var(--primary-soft)] via-[var(--surface-soft)] to-[var(--surface)]">
        <div className="absolute inset-x-5 top-1/2 border-t border-[var(--border)]" />

        {/* Training curve */}
        <svg
          viewBox="0 0 260 100"
          className="absolute inset-x-5 top-3 h-[82px] w-[calc(100%-40px)]"
          fill="none"
        >
          <path
            d="M8 72 C45 67 63 53 91 42 C123 29 150 20 181 13 C208 8 232 7 252 6"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-[var(--primary)]"
          />

          <path
            d="M8 67 C38 61 57 76 82 55 C106 36 123 70 145 46 C168 23 187 61 208 35 C227 17 239 43 252 28"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5 5"
            className="text-[var(--pink)]"
          />

          <circle
            cx="8"
            cy="72"
            r="4"
            fill="currentColor"
            className="text-[var(--primary)]"
          />

          <circle
            cx="252"
            cy="6"
            r="4"
            fill="currentColor"
            className="text-[var(--pink)]"
          />
        </svg>

        <div className="absolute left-5 bottom-3 text-[10px] uppercase tracking-[0.14em] font-black text-[var(--text-muted)]">
          Training fit
        </div>

        <div className="absolute right-5 bottom-3 text-[10px] uppercase tracking-[0.14em] font-black text-[var(--text-muted)]">
          Unseen data
        </div>
      </div>
    ),
  },

  bias_variance: {
    label: "BIAS · VARIANCE",
    visual: (
      <div className="relative h-[116px] overflow-hidden rounded-[18px] border border-[var(--primary-border)] bg-gradient-to-br from-[color-mix(in_srgb,var(--violet)_10%,transparent)] via-[var(--surface-soft)] to-[var(--surface)]">
        <svg
          viewBox="0 0 300 110"
          className="absolute inset-x-4 top-2 h-[88px] w-[calc(100%-32px)]"
          fill="none"
        >
          {/* Bias */}
          <path
            d="M8 22 C42 27 68 39 91 55"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-[var(--primary)]"
          />

          {/* Total error */}
          <path
            d="M8 22 C42 15 77 18 109 35 C137 50 163 76 190 79 C220 81 252 66 292 22"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-[var(--pink)]"
          />

          {/* Variance */}
          <path
            d="M205 79 C233 70 257 49 292 20"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-[var(--success)]"
          />

          <circle
            cx="190"
            cy="79"
            r="5"
            fill="currentColor"
            className="text-[var(--primary)]"
          />

          <path
            d="M190 79V91"
            stroke="currentColor"
            strokeWidth="1"
            className="text-[var(--border-strong)]"
          />
        </svg>

        <div className="absolute left-4 bottom-3 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
          Underfit
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--primary)]">
          Balance
        </div>

        <div className="absolute right-4 bottom-3 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
          Overfit
        </div>
      </div>
    ),
  },

    train_val_test: {
    label: "DATA PIPELINE",
    visual: (
      <div className="h-[116px] rounded-[18px] border border-[var(--border)] bg-gradient-to-br from-[color-mix(in_srgb,var(--success)_10%,transparent)] via-[var(--surface-soft)] to-[var(--surface)] flex flex-col justify-center px-5">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-12 rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] border border-[var(--primary-border)] flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-[var(--primary)]">
              TRAIN
            </span>

            <span className="text-[10px] text-[var(--text-muted)] mt-1">
              Learn
            </span>
          </div>

          <span className="text-[var(--text-muted)] px-1">→</span>

          <div className="w-[27%] h-12 rounded-xl bg-[color-mix(in_srgb,var(--violet)_12%,transparent)] border border-[var(--border)] flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-[var(--violet)]">
              VAL
            </span>

            <span className="text-[10px] text-[var(--text-muted)] mt-1">
              Tune
            </span>
          </div>

          <span className="text-[var(--text-muted)] px-1">→</span>

          <div className="w-[27%] h-12 rounded-xl bg-[color-mix(in_srgb,var(--success)_12%,transparent)] border border-[var(--border)] flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-[var(--success)]">
              TEST
            </span>

            <span className="text-[10px] text-[var(--text-muted)] mt-1">
              Verify
            </span>
          </div>
        </div>

        <div className="flex justify-between mt-3 px-1 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
          <span>Learning</span>
          <span>Selection</span>
          <span>Generalization</span>
        </div>
      </div>
    ),
  },

  regularization: {
    label: "COMPLEXITY CONTROL",
    visual: (
      <div className="relative h-[116px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-gradient-to-br from-[color-mix(in_srgb,var(--pink)_10%,transparent)] via-[var(--surface-soft)] to-[var(--surface)]">
        <div className="absolute left-6 right-6 top-[50px] h-px bg-[var(--border)]" />

        <div className="absolute left-7 bottom-[35px] flex items-end gap-3">
          {[70, 58, 46, 34].map((height, index) => (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-7 rounded-t-lg ${
                  index === 3
                    ? "bg-[var(--primary)]"
                    : "bg-[color-mix(in_srgb,var(--pink)_35%,transparent)]"
                }`}
                style={{ height }}
              />
            </div>
          ))}
        </div>

        <div className="absolute right-7 top-7 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--pink)]" />
          <span className="w-2 h-2 rounded-full bg-[color-mix(in_srgb,var(--pink)_60%,transparent)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[color-mix(in_srgb,var(--pink)_30%,transparent)]" />
        </div>

        <div className="absolute left-5 bottom-3 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
          Complexity
        </div>

        <div className="absolute right-5 bottom-3 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--primary)]">
          Regularize
        </div>
      </div>
    ),
  },

  gradient_descent: {
    label: "OPTIMIZATION",
    visual: (
      <div className="relative h-[116px] overflow-hidden rounded-[18px] border border-[var(--primary-border)] bg-gradient-to-br from-[var(--primary-soft)] via-[var(--surface-soft)] to-[var(--surface)]">
        <svg
          viewBox="0 0 300 115"
          className="absolute inset-x-4 top-1 h-[100px] w-[calc(100%-32px)]"
          fill="none"
        >
          {/* Loss landscape */}
          <path
            d="M5 25 C55 25 62 98 150 98 C235 98 245 30 295 30"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-[var(--border-strong)]"
          />

          {/* Descent path */}
          <path
            d="M35 30 C63 40 76 71 108 87 C125 96 145 99 162 94"
            stroke="currentColor"
            strokeWidth="3"
            className="text-[var(--primary)]"
          />

          <circle
            cx="35"
            cy="30"
            r="5"
            fill="currentColor"
            className="text-[var(--pink)]"
          />

          <circle
            cx="108"
            cy="87"
            r="4"
            fill="currentColor"
            className="text-[var(--primary)]"
          />

          <circle
            cx="162"
            cy="94"
            r="5"
            fill="currentColor"
            className="text-[var(--success)]"
          />
        </svg>

        <div className="absolute left-5 bottom-3 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--text-muted)]">
          Higher loss
        </div>

        <div className="absolute right-5 bottom-3 text-[10px] uppercase tracking-[0.13em] font-black text-[var(--success)]">
          Lower loss
        </div>
      </div>
    ),
  },

  classification_metrics: {
    label: "CONFUSION MATRIX",
    visual: (
      <div className="h-[116px] rounded-[18px] border border-[var(--border)] bg-gradient-to-br from-[color-mix(in_srgb,var(--success)_10%,transparent)] via-[var(--surface-soft)] to-[var(--surface)] flex items-center justify-center">
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-[var(--border)] shadow-sm">
          <div className="w-20 h-10 bg-[color-mix(in_srgb,var(--success)_12%,transparent)] flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-[var(--success)]">
              TP
            </span>

            <span className="text-[10px] text-[var(--text-muted)]">
              caught
            </span>
          </div>

          <div className="w-20 h-10 bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-[var(--danger)]">
              FN
            </span>

            <span className="text-[10px] text-[var(--text-muted)]">
              missed
            </span>
          </div>

          <div className="w-20 h-10 bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-[var(--warning)]">
              FP
            </span>

            <span className="text-[10px] text-[var(--text-muted)]">
              flagged
            </span>
          </div>

          <div className="w-20 h-10 bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] flex flex-col items-center justify-center">
            <span className="text-[12px] font-black text-[var(--primary)]">
              TN
            </span>

            <span className="text-[10px] text-[var(--text-muted)]">
              cleared
            </span>
          </div>
        </div>
      </div>
    ),
  },
};

            const meta = visualMap[concept.id] ?? {
        label: "AI / ML CONCEPT",
        visual: (
          <div className="h-[116px] rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center">
            <span className="text-[11px] uppercase tracking-[0.14em] font-black text-[var(--text-muted)]">
              Learning concept
            </span>
          </div>
        ),
      };

      return (
        <button
          key={concept.id}
          onClick={() => startLearning(concept.id)}
                    className="
            group
            text-left
            h-full
            flex
            flex-col
            rounded-[22px]
            border border-[var(--border)]
            bg-[var(--surface)]
            p-5
            shadow-[0_8px_30px_rgba(30,30,70,0.04)]
            transition-all duration-300
            hover:-translate-y-1
            hover:border-[var(--primary-border)]
            hover:shadow-[0_18px_45px_rgba(75,65,180,0.10)]
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-[var(--primary)]
          "
        >
          {/* Concept visual */}
          {meta.visual}

          {/* Card content */}
          <div className="mt-4 flex flex-1 flex-col">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.15em] font-black text-[var(--primary)]">
                {meta.label}
              </p>

              <span
                className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-[0.08em] font-black ${statusClass}`}
              >
                {status}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 mt-2">
              <div>
                <h3 className="text-[15px] font-black tracking-[-0.02em] text-[var(--text)]">
                  {concept.name}
                </h3>

                <p className="text-[13px] text-[var(--text-muted)] mt-1 capitalize">
                  {concept.difficulty} ·{" "}
                  {attempts === 0
                    ? "Ready to diagnose"
                    : `${attempts} attempt${attempts === 1 ? "" : "s"}`}
                </p>
              </div>

              <span
                className="
                  flex-shrink-0
                  w-9 h-9
                  rounded-xl
                  border border-[var(--border)]
                  bg-[var(--surface-soft)]
                  text-[var(--primary)]
                  flex items-center justify-center
                  text-sm
                  font-bold
                  transition-all duration-300
                  group-hover:bg-[var(--primary)]
                  group-hover:text-white
                  group-hover:border-[var(--primary)]
                "
              >
                →
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-3 line-clamp-2">
              {concept.description ?? concept.diagnostic_question}
            </p>

            {/* Mastery */}
            <div className="mt-auto pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-[var(--text-muted)]">
                  Mastery
                </span>

                <span className="text-[13px] font-black text-[var(--text)]">
                  {mastery}%
                </span>
              </div>

              <MasteryBar value={state?.mastery ?? 0} />
            </div>
          </div>
        </button>
      );
    })}
  </div>
</section>
                    {/* 5. INSIGHTS */}

          <section id="insights" className="scroll-mt-28 mt-5">
            {activeMisconceptions.length > 0 ? (
              <div className="misconception-card rounded-[22px] p-6 border border-[color-mix(in_srgb,var(--warning)_28%,transparent)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] flex items-center justify-center">
                    ⚡
                  </div>

                  <div>
                    <p className="text-[12px] uppercase tracking-[0.15em] font-extrabold text-[var(--danger)]">
                      Adaptive insight
                    </p>

                    <h2 className="text-lg font-extrabold text-[var(--text)] mt-1">
                      LearnLoop found something to work on
                    </h2>
                  </div>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 mt-5">
                  <p className="text-[12px] uppercase tracking-[0.13em] font-extrabold text-[var(--danger)]">
                    Active misconception
                  </p>

                  <p className="text-sm font-bold text-[var(--text)] mt-2">
                    {activeMisconceptions[0]}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-4">
                  This evidence can change the next intervention, reassessment
                  strategy, and learning path.
                </p>
              </div>
            ) : (
              <div className="insight-card rounded-[22px] p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] border border-[var(--primary-border)] text-[var(--primary)] flex items-center justify-center">
                    ✦
                  </div>

                  <div>
                    <p className="text-[12px] uppercase tracking-[0.15em] font-extrabold text-[var(--primary)]">
                      Why LearnLoop?
                    </p>

                    <h2 className="text-lg font-extrabold text-[var(--text)] mt-1">
                      Same concept. Different learner. Different path.
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-5">
                  LearnLoop does not simply answer questions. It maintains an
                  explicit learner model and uses evidence from each attempt to
                  determine what should happen next.
                </p>

                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  {["Diagnose", "Adapt", "Reassess"].map((label, i) => (
                    <div
                      key={label}
                      className="bg-[var(--surface)] rounded-xl p-3 border border-[var(--border)]"
                    >
                      <p className="text-[11px] font-extrabold text-[var(--primary)]">
                        0{i + 1}
                      </p>
                      <p className="text-xs font-extrabold text-[var(--text)] mt-1">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 6. EVALUATION */}

          <section id="evaluation" className="scroll-mt-28 mt-5">
            <div className="app-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.15em] font-extrabold text-[var(--text-muted)]">
                    Controlled evaluation
                  </p>

                  <h2 className="text-xl font-extrabold text-[var(--text)] mt-1">
                    Judge demo controls
                  </h2>

                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                    These controls seed different initial learner states. The
                    answer and reasoning still drive the diagnosis.
                  </p>
                </div>

                <div className="shrink-0 px-3 py-1.5 rounded-full bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] border border-[color-mix(in_srgb,var(--warning)_30%,transparent)] text-[var(--warning)] text-[11px] font-extrabold">
                  CONTROLLED DEMO
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                {[
                  {
                    id: "",
                    label: "Fresh learner",
                    desc: "Default learner state",
                  },
                  {
                    id: "high_conf_misconception",
                    label: "High confidence",
                    desc: "Wrong + sure",
                  },
                  {
                    id: "low_conf_correct",
                    label: "Low confidence",
                    desc: "Right + unsure",
                  },
                  {
                    id: "low_mastery",
                    label: "Low mastery",
                    desc: "Needs foundation",
                  },
                ].map((scenario) => (
                  <button
                    key={scenario.id || "fresh"}
                    onClick={() => setDemoScenario(scenario.id)}
                    className={`text-left rounded-2xl border p-4 transition ${
                      demoScenario === scenario.id
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)] bg-[var(--surface-soft)] hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <p className="text-xs font-extrabold text-[var(--text)]">
                      {scenario.label}
                    </p>

                    <p className="text-[12px] text-[var(--text-muted)] mt-1">
                      {scenario.desc}
                    </p>
                  </button>
                ))}
              </div>

             <p className="text-[12px] text-[var(--text-muted)] mt-4">
  Selected state:{" "}
  <strong className="text-[var(--primary)]">
    {demoScenario === "high_conf_misconception"
      ? "High confidence"
      : demoScenario === "low_conf_correct"
      ? "Low confidence"
      : demoScenario === "low_mastery"
      ? "Low mastery"
      : "Fresh learner"}
  </strong>
</p>
            </div>
          </section>

                    <footer className="border-t border-[var(--border)] mt-10 pt-7 pb-9 text-center">
            <p className="text-[13px] font-semibold tracking-[0.01em] text-[var(--text-secondary)]">
              LearnLoop AI · RudraCore · Build Fast with AI 2026 · PS-03
            </p>

            <p className="text-[12px] text-[var(--text-muted)] mt-2">
              Most tutors know the subject. LearnLoop learns the learner.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}