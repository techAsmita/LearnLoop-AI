from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ---------- Concepts ----------
class ConceptOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    difficulty: str
    diagnostic_question: str

    class Config:
        from_attributes = True


class ConceptDetail(ConceptOut):
    correct_answer: str
    common_misconceptions: List[str] = []
    reassessment_question: Optional[str] = None


# ---------- Learner ----------
class LearnerCreate(BaseModel):
    name: str = "Learner"
    goal: str = "Learn AI/ML fundamentals"


class LearnerOut(BaseModel):
    id: str
    name: str
    goal: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Learner State ----------
class LearnerConceptStateOut(BaseModel):
    concept_id: str
    mastery: float
    confidence: float
    active_misconceptions: List[str] = []
    attempt_count: int
    last_intervention_type: Optional[str] = None
    history: List[Dict[str, Any]] = []
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LearnerStateOut(BaseModel):
    learner_id: str
    name: str
    goal: str
    concept_states: List[LearnerConceptStateOut] = []


# ---------- Session ----------
class SessionStartRequest(BaseModel):
    learner_id: Optional[str] = None
    learner_name: str = "Learner"
    concept_id: str
    # Optional seed for demo scenarios
    demo_scenario: Optional[str] = None  # "high_conf_misconception" | "low_conf_correct" | "low_mastery"


class SessionStartResponse(BaseModel):
    session_id: str
    learner_id: str
    concept: ConceptOut
    diagnostic_question: str
    initial_mastery: float
    initial_confidence: float
    mock_mode: bool


# ---------- Diagnosis ----------
class DiagnoseRequest(BaseModel):
    session_id: str
    learner_id: str
    concept_id: str
    answer: str
    reasoning: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)


class DiagnosisResult(BaseModel):
    concept: str
    correctness: bool
    reasoning_summary: str
    misconception_detected: bool
    misconception: Optional[str] = None
    misconception_confidence: float = 0.0
    mastery_estimate: float
    recommended_intervention_type: str
    policy_rule: str = ""
    reason: str
    policy_reason: str = ""
    mock_mode: bool = False
    decision_trace: dict = {}


class DiagnoseResponse(BaseModel):
    diagnosis: DiagnosisResult
    updated_state: LearnerConceptStateOut
    why_this_next: str


# ---------- Intervention ----------
class InterventionRequest(BaseModel):
    session_id: str
    learner_id: str
    concept_id: str
    intervention_type: Optional[str] = None  # if None, use recommended


class InterventionOut(BaseModel):
    id: str
    intervention_type: str
    content: str
    reason: str
    misconception_targeted: Optional[str] = None
    why_this_next: str

    class Config:
        from_attributes = True


# ---------- Reassessment ----------
class ReassessRequest(BaseModel):
    session_id: str
    learner_id: str
    concept_id: str
    answer: str
    reasoning: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)


class ReassessResponse(BaseModel):
    is_correct: bool
    previous_mastery: float
    new_mastery: float
    mastery_delta: float
    active_misconceptions: List[str]
    next_action: str
    why_this_next: str
    updated_state: LearnerConceptStateOut
    progress_summary: str


# ---------- Progress ----------
class ProgressOut(BaseModel):
    learner_id: str
    total_concepts_attempted: int
    average_mastery: float
    concept_states: List[LearnerConceptStateOut]
    recent_interventions: List[Dict[str, Any]] = []


# ---------- Evaluation ----------
class EvaluationCaseResult(BaseModel):
    case_id: str
    misconception_detected_correctly: bool
    intervention_relevant: bool
    pre_mastery: float
    post_mastery: float
    learning_gain: float
    adaptation_success: bool
    notes: str = ""


class EvaluationRunResponse(BaseModel):
    total_cases: int
    misconception_detection_accuracy: float
    intervention_relevance_rate: float
    average_learning_gain: float
    adaptation_success_rate: float
    results: List[EvaluationCaseResult]
    baseline_comparison: Dict[str, Any]
