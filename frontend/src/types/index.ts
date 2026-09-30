export interface Concept {
  id: string;
  name: string;
  description?: string;
  difficulty: string;
  diagnostic_question: string;
  reassessment_question?: string;
}

export interface ConceptDetail extends Concept {
  correct_answer: string;
  common_misconceptions: string[];
}

export interface LearnerConceptState {
  concept_id: string;
  mastery: number;
  confidence: number;
  active_misconceptions: string[];
  attempt_count: number;
  last_intervention_type?: string | null;
  history: Record<string, unknown>[];
  updated_at?: string;
}

export interface SessionStart {
  session_id: string;
  learner_id: string;
  concept: Concept;
  diagnostic_question: string;
  initial_mastery: number;
  initial_confidence: number;
  mock_mode: boolean;
}

export interface DecisionTraceStep {
  stage: string;
  detail: unknown;
}

export interface DecisionTrace {
  steps: DecisionTraceStep[];
}

export interface DiagnosisResult {
  concept: string;
  correctness: boolean;
  reasoning_summary: string;
  misconception_detected: boolean;
  misconception?: string | null;
  misconception_confidence: number;
  mastery_estimate: number;
  recommended_intervention_type: string;
  policy_rule?: string;
  policy_reason?: string;
  reason: string;
  decision_trace?: DecisionTrace;
  mock_mode: boolean;
}

export interface DiagnoseResponse {
  diagnosis: DiagnosisResult;
  updated_state: LearnerConceptState;
  why_this_next: string;
}

export interface Intervention {
  id: string;
  intervention_type: string;
  content: string;
  reason: string;
  misconception_targeted?: string | null;
  why_this_next: string;
}

export interface ReassessResponse {
  is_correct: boolean;
  previous_mastery: number;
  new_mastery: number;
  mastery_delta: number;
  active_misconceptions: string[];
  next_action: string;
  why_this_next: string;
  updated_state: LearnerConceptState;
  progress_summary: string;
}

export interface Progress {
  learner_id: string;
  total_concepts_attempted: number;
  average_mastery: number;
  concept_states: LearnerConceptState[];
  recent_interventions: Intervention[];
}

/* ============================================================
   Evaluation
   ============================================================ */

export interface EvaluationMetrics {
  adaptive_policy_accuracy: number;
  strategy_change_rate: number;
  average_mastery_delta: number;
}

export interface EvaluationScenarioResult {
  scenario: string;
  description: string;
  baseline_intervention: string;
  adaptive_intervention: string;
  expected_intervention: string;
  policy_rule: string;
  policy_reason: string;
  adaptive_matches_expected: boolean;
  strategy_changed_from_baseline: boolean;
  mastery_before: number;
  mastery_after: number;
  mastery_delta: number;
}

export interface PolicyBenchmark {
  evaluation: {
    name: string;
    scenario_count: number;
    controlled_scenarios: boolean;
  };
  metrics: EvaluationMetrics;
  results: EvaluationScenarioResult[];
}

export interface MisconceptionAdaptationResult {
  scenario: string;
  baseline: string;
  learnloop: string;
  policy_rule: string;
  strategy_changed: boolean;
}

export interface MisconceptionAdaptation {
  scenario_count: number;
  adaptation_count: number;
  adaptation_rate: number;
  results: MisconceptionAdaptationResult[];
}

export interface EvaluationResponse {
  policy_benchmark: PolicyBenchmark;
  misconception_adaptation: MisconceptionAdaptation;
}

export type Screen =
  | "dashboard"
  | "diagnostic"
  | "diagnosis"
  | "intervention"
  | "reassessment"
  | "result";