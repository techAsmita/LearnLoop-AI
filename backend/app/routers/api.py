from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from ..models import (
    Learner, Concept, LearnerConceptState, LearningSession,
    Attempt, Intervention
)
from ..schemas import (
    LearnerCreate, LearnerOut, ConceptOut, ConceptDetail,
    SessionStartRequest, SessionStartResponse,
    DiagnoseRequest, DiagnoseResponse, DiagnosisResult,
    InterventionRequest, InterventionOut,
    ReassessRequest, ReassessResponse,
    LearnerStateOut, LearnerConceptStateOut, ProgressOut,
    EvaluationRunResponse,
)
from ..config import settings
from ..services.learner_model import (
    update_mastery, select_intervention_type, select_intervention,
    build_why_this_next, build_decision_trace, append_history,
    normalize_intervention_type, TARGETED_MISCONCEPTION,
)
from ..services.mock_ai import (
    mock_diagnose, mock_generate_intervention, DEMO_SCENARIOS,
    mock_generate_reassessment_feedback,
)
from ..services.gemini_ai import diagnose_with_gemini, generate_intervention_with_gemini

from ..services.evaluation import (
    run_policy_evaluation,
    evaluate_misconception_adaptation,
    run_learning_gain_benchmark,
)

router = APIRouter(prefix="/api")


# ---------- Health ----------
@router.get("/health")
def health():
    db_kind = "sqlite" if "sqlite" in settings.DATABASE_URL else "postgres"
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": "mock" if settings.MOCK_MODE else "gemini",
        "mock_mode": settings.MOCK_MODE,
        "database": db_kind,
        "has_gemini_key": bool(settings.GEMINI_API_KEY),
    }


# ---------- Concepts ----------
@router.get("/concepts", response_model=List[ConceptOut])
def list_concepts(db: Session = Depends(get_db)):
    concepts = db.query(Concept).all()
    return concepts


@router.get("/concepts/{concept_id}", response_model=ConceptDetail)
def get_concept(concept_id: str, db: Session = Depends(get_db)):
    concept = db.query(Concept).filter(Concept.id == concept_id).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    return concept


# ---------- Learners ----------
@router.post("/learners", response_model=LearnerOut)
def create_learner(payload: LearnerCreate, db: Session = Depends(get_db)):
    learner = Learner(name=payload.name, goal=payload.goal)
    db.add(learner)
    db.commit()
    db.refresh(learner)
    return learner


@router.get("/learners/{learner_id}", response_model=LearnerStateOut)
def get_learner_state(learner_id: str, db: Session = Depends(get_db)):
    learner = db.query(Learner).filter(Learner.id == learner_id).first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    states = db.query(LearnerConceptState).filter(
        LearnerConceptState.learner_id == learner_id
    ).all()
    return LearnerStateOut(
        learner_id=learner.id,
        name=learner.name,
        goal=learner.goal,
        concept_states=[LearnerConceptStateOut.model_validate(s) for s in states],
    )


@router.get("/learners/{learner_id}/progress", response_model=ProgressOut)
def get_progress(learner_id: str, db: Session = Depends(get_db)):
    learner = db.query(Learner).filter(Learner.id == learner_id).first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    states = db.query(LearnerConceptState).filter(
        LearnerConceptState.learner_id == learner_id
    ).all()
    avg = sum(s.mastery for s in states) / len(states) if states else 0.0
    interventions = (
        db.query(Intervention)
        .filter(Intervention.learner_id == learner_id)
        .order_by(Intervention.created_at.desc())
        .limit(5)
        .all()
    )
    recent = [
        {
            "type": i.intervention_type,
            "concept_id": i.concept_id,
            "reason": i.reason,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in interventions
    ]
    return ProgressOut(
        learner_id=learner_id,
        total_concepts_attempted=len(states),
        average_mastery=round(avg, 3),
        concept_states=[LearnerConceptStateOut.model_validate(s) for s in states],
        recent_interventions=recent,
    )


# ---------- Session Start ----------
@router.post("/session/start", response_model=SessionStartResponse)
def start_session(payload: SessionStartRequest, db: Session = Depends(get_db)):
    concept = db.query(Concept).filter(Concept.id == payload.concept_id).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    # Create or reuse learner
    if payload.learner_id:
        learner = db.query(Learner).filter(Learner.id == payload.learner_id).first()
        if not learner:
            raise HTTPException(status_code=404, detail="Learner not found")
    else:
        learner = Learner(name=payload.learner_name)
        db.add(learner)
        db.commit()
        db.refresh(learner)

    # Get or create concept state
    state = (
        db.query(LearnerConceptState)
        .filter(
            LearnerConceptState.learner_id == learner.id,
            LearnerConceptState.concept_id == concept.id,
        )
        .first()
    )

    initial_mastery = 0.3
    initial_confidence = 0.5

    # Apply demo scenario seeding
    if payload.demo_scenario and payload.demo_scenario in DEMO_SCENARIOS:
        scenario = DEMO_SCENARIOS[payload.demo_scenario]
        initial_mastery = scenario["initial_mastery"]
        initial_confidence = scenario["initial_confidence"]

    if not state:
        state = LearnerConceptState(
            learner_id=learner.id,
            concept_id=concept.id,
            mastery=initial_mastery,
            confidence=initial_confidence,
            active_misconceptions=[],
            attempt_count=0,
            history=[],
        )
        db.add(state)
    else:
        # Reset for a fresh diagnostic if demo scenario requested
        if payload.demo_scenario:
            state.mastery = initial_mastery
            state.confidence = initial_confidence
            state.active_misconceptions = []
            if payload.demo_scenario == "high_conf_misconception":
                state.active_misconceptions = [
                    DEMO_SCENARIOS["high_conf_misconception"]["forced_misconception"]
                ]

    # Create session
    session = LearningSession(
        learner_id=learner.id,
        concept_id=concept.id,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    db.refresh(state)

    return SessionStartResponse(
        session_id=session.id,
        learner_id=learner.id,
        concept=ConceptOut.model_validate(concept),
        diagnostic_question=concept.diagnostic_question,
        initial_mastery=state.mastery,
        initial_confidence=state.confidence,
        mock_mode=settings.MOCK_MODE,
    )


# ---------- Diagnose ----------
@router.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose(payload: DiagnoseRequest, db: Session = Depends(get_db)):
    session = db.query(LearningSession).filter(LearningSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    concept = db.query(Concept).filter(Concept.id == payload.concept_id).first()
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    state = (
        db.query(LearnerConceptState)
        .filter(
            LearnerConceptState.learner_id == payload.learner_id,
            LearnerConceptState.concept_id == payload.concept_id,
        )
        .first()
    )
    if not state:
        raise HTTPException(status_code=404, detail="Learner concept state not found")

    # Record attempt
    attempt = Attempt(
        learner_id=payload.learner_id,
        session_id=payload.session_id,
        concept_id=payload.concept_id,
        question_type="diagnostic",
        answer=payload.answer,
        reasoning=payload.reasoning,
        confidence=payload.confidence,
    )
    db.add(attempt)

    # Run diagnosis (Gemini or Mock)
    diagnosis_data = None
    used_mock = settings.MOCK_MODE

    if not settings.MOCK_MODE:
        try:
            diagnosis_data = await diagnose_with_gemini(
                concept_id=concept.id,
                concept_name=concept.name,
                concept_description=concept.description or "",
                question=concept.diagnostic_question,
                correct_answer=concept.correct_answer,
                common_misconceptions=concept.common_misconceptions or [],
                answer=payload.answer,
                reasoning=payload.reasoning,
                confidence=payload.confidence,
                current_mastery=state.mastery,
            )
            used_mock = False
        except Exception as e:
            print(f"[WARN] Gemini diagnosis failed, falling back to mock: {e}")
            used_mock = True

    if used_mock or diagnosis_data is None:
        diagnosis_data = mock_diagnose(
            concept_id=concept.id,
            concept_name=concept.name,
            answer=payload.answer,
            reasoning=payload.reasoning,
            confidence=payload.confidence,
            correct_answer=concept.correct_answer,
            common_misconceptions=concept.common_misconceptions or [],
            current_mastery=state.mastery,
        )

    # Prefer explicit policy when available from mock/gemini
    policy = select_intervention(
        is_correct=diagnosis_data["correctness"],
        confidence=payload.confidence,
        misconception_detected=diagnosis_data["misconception_detected"],
        misconception_confidence=float(diagnosis_data.get("misconception_confidence") or 0),
        current_mastery=state.mastery,
    )
    # Allow diagnosis_data to override type if it already chose one consistently
    if diagnosis_data.get("recommended_intervention_type"):
        # normalize legacy names
        diagnosis_data["recommended_intervention_type"] = normalize_intervention_type(
            diagnosis_data["recommended_intervention_type"]
        )
    else:
        diagnosis_data["recommended_intervention_type"] = policy["type"]
    diagnosis_data["policy_rule"] = diagnosis_data.get("policy_rule") or policy["policy_rule"]
    diagnosis_data["policy_reason"] = diagnosis_data.get("policy_reason") or policy["reason"]

    mastery_before = state.mastery
    new_mastery = update_mastery(
        current_mastery=state.mastery,
        is_correct=diagnosis_data["correctness"],
        confidence=payload.confidence,
        misconception_detected=diagnosis_data["misconception_detected"],
        is_reassessment=False,
    )

    state.mastery = new_mastery
    state.confidence = payload.confidence
    state.attempt_count += 1
    if diagnosis_data["misconception_detected"] and diagnosis_data.get("misconception"):
        misc = diagnosis_data["misconception"]
        current = list(state.active_misconceptions or [])
        if misc not in current:
            current.append(misc)
        state.active_misconceptions = current
    state.history = append_history(
    state.history,
    "diagnosis",
    {
        "correct": diagnosis_data["correctness"],
        "confidence": payload.confidence,
        "misconception": diagnosis_data.get("misconception"),
        "misconception_confidence": float(
            diagnosis_data.get("misconception_confidence") or 0
        ),
        "mastery_after": new_mastery,
        "policy_rule": diagnosis_data.get("policy_rule"),
    },
)
    attempt.is_correct = diagnosis_data["correctness"]

    # Decision trace
    trace = build_decision_trace(
        question=concept.diagnostic_question,
        answer=payload.answer,
        reasoning=payload.reasoning,
        confidence=payload.confidence,
        is_correct=diagnosis_data["correctness"],
        misconception=diagnosis_data.get("misconception"),
        misconception_confidence=float(diagnosis_data.get("misconception_confidence") or 0),
        mastery_before=mastery_before,
        mastery_after=new_mastery,
        intervention_type=diagnosis_data["recommended_intervention_type"],
        policy_rule=diagnosis_data.get("policy_rule") or "",
        policy_reason=diagnosis_data.get("policy_reason") or "",
    )
    diagnosis_data["decision_trace"] = trace

    db.commit()
    db.refresh(state)

    # Filter diagnosis_data keys to schema
    allowed = {
        "concept", "correctness", "reasoning_summary", "misconception_detected",
        "misconception", "misconception_confidence", "mastery_estimate",
        "recommended_intervention_type", "policy_rule", "reason", "policy_reason",
        "mock_mode", "decision_trace",
    }
    clean = {k: v for k, v in diagnosis_data.items() if k in allowed}
    clean["mock_mode"] = used_mock
    diagnosis = DiagnosisResult(**clean)

    why = diagnosis_data.get("reason") or build_why_this_next(
        is_correct=diagnosis_data["correctness"],
        confidence=payload.confidence,
        misconception=diagnosis_data.get("misconception"),
        intervention_type=diagnosis_data["recommended_intervention_type"],
        mastery=new_mastery,
        misconception_confidence=float(diagnosis_data.get("misconception_confidence") or 0),
        policy_reason=diagnosis_data.get("policy_reason"),
    )

    return DiagnoseResponse(
        diagnosis=diagnosis,
        updated_state=LearnerConceptStateOut.model_validate(state),
        why_this_next=why,
    )


# ---------- Intervention ----------
@router.post("/intervention", response_model=InterventionOut)
async def get_intervention(
    payload: InterventionRequest,
    db: Session = Depends(get_db),
):
    session = (
        db.query(LearningSession)
        .filter(LearningSession.id == payload.session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    concept = (
        db.query(Concept)
        .filter(Concept.id == payload.concept_id)
        .first()
    )
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    state = (
        db.query(LearnerConceptState)
        .filter(
            LearnerConceptState.learner_id == payload.learner_id,
            LearnerConceptState.concept_id == payload.concept_id,
        )
        .first()
    )
    if not state:
        raise HTTPException(status_code=404, detail="State not found")

    # ---------------------------------------------------------
    # Determine whether the learner has a persistent
    # misconception based on the latest reassessment.
    # ---------------------------------------------------------
    misconception_persisted = False

    for event in reversed(state.history or []):
        if event.get("event") == "reassessment":
            misconception_persisted = bool(
                event.get("misconception_persisted")
            )
            break

    # ---------------------------------------------------------
    # Determine the active misconception.
    # ---------------------------------------------------------
    misconception = (
        (state.active_misconceptions or [None])[0]
        if state.active_misconceptions
        else None
    )

    # ---------------------------------------------------------
    # Determine intervention type.
    #
    # If the caller explicitly provides a type, respect it.
    # Otherwise let the learner policy choose adaptively.
    # ---------------------------------------------------------
    intervention_type = payload.intervention_type

    if not intervention_type:
        policy = select_intervention(
            is_correct=False if misconception else True,
            confidence=state.confidence,
            misconception_detected=bool(misconception),
            misconception_confidence=0.85 if misconception else 0.0,
            current_mastery=state.mastery,
            misconception_persisted=misconception_persisted,
        )

        intervention_type = policy["type"]

    # Normalize any legacy intervention names.
    intervention_type = normalize_intervention_type(intervention_type)

    # ---------------------------------------------------------
    # Recover misconception confidence from diagnosis history.
    # ---------------------------------------------------------
    misconception_confidence = 0.0

    for event in reversed(state.history or []):
        if (
            event.get("event") == "diagnosis"
            and event.get("misconception") == misconception
        ):
            misconception_confidence = float(
                event.get("misconception_confidence") or 0
            )
            break

    # ---------------------------------------------------------
    # Generate intervention content.
    # ---------------------------------------------------------
    content = None
    used_mock = settings.MOCK_MODE

    if not settings.MOCK_MODE:
        try:
            content = await generate_intervention_with_gemini(
                concept_name=concept.name,
                concept_description=concept.description or "",
                intervention_type=intervention_type,
                misconception=misconception,
                is_correct=not bool(misconception),
            )
            used_mock = False

        except Exception as e:
            print(f"[WARN] Gemini intervention failed: {e}")
            used_mock = True

    if used_mock or content is None:
        content = mock_generate_intervention(
            concept_name=concept.name,
            concept_description=concept.description or "",
            intervention_type=intervention_type,
            misconception=misconception,
            is_correct=not bool(misconception),
        )

    # ---------------------------------------------------------
    # Explain why this intervention was selected.
    # ---------------------------------------------------------
    why = build_why_this_next(
        is_correct=not bool(misconception),
        confidence=state.confidence,
        misconception=misconception,
        intervention_type=intervention_type,
        mastery=state.mastery,
        misconception_confidence=misconception_confidence,
    )

    # ---------------------------------------------------------
    # Persist intervention.
    # ---------------------------------------------------------
    intervention = Intervention(
        learner_id=payload.learner_id,
        session_id=payload.session_id,
        concept_id=payload.concept_id,
        intervention_type=intervention_type,
        content=content,
        reason=why,
        misconception_targeted=misconception,
    )

    db.add(intervention)

    state.last_intervention_type = intervention_type
    state.history = append_history(
        state.history,
        "intervention",
        {
            "type": intervention_type,
            "misconception": misconception,
            "misconception_persisted": misconception_persisted,
        },
    )

    db.commit()
    db.refresh(intervention)

    return InterventionOut(
        id=intervention.id,
        intervention_type=intervention.intervention_type,
        content=intervention.content,
        reason=intervention.reason,
        misconception_targeted=intervention.misconception_targeted,
        why_this_next=why,
    )

# ---------- Reassess ----------
@router.post("/reassess", response_model=ReassessResponse)
async def reassess(
    payload: ReassessRequest,
    db: Session = Depends(get_db),
):
    session = (
        db.query(LearningSession)
        .filter(LearningSession.id == payload.session_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    concept = (
        db.query(Concept)
        .filter(Concept.id == payload.concept_id)
        .first()
    )
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    state = (
        db.query(LearnerConceptState)
        .filter(
            LearnerConceptState.learner_id == payload.learner_id,
            LearnerConceptState.concept_id == payload.concept_id,
        )
        .first()
    )
    if not state:
        raise HTTPException(status_code=404, detail="State not found")

    previous_mastery = state.mastery

    # ---------------------------------------------------------
    # Deterministic reassessment evaluator for MOCK mode.
    #
    # The evaluator checks conceptual understanding rather than
    # relying only on isolated keywords.
    # ---------------------------------------------------------

    answer_lower = (payload.answer or "").strip().lower()
    reasoning_lower = (payload.reasoning or "").strip().lower()

    is_correct = False

    # ---------------------------------------------------------
    # Overfitting evaluator
    # ---------------------------------------------------------
    if concept.id == "overfitting":
        # Correct understanding requires:
        # 1. recognizing the train/test performance gap
        # 2. connecting that gap to poor generalisation
        #    on unseen data

        has_gap_signal = (
            ("training" in answer_lower or "train" in answer_lower)
            and (
                "test" in answer_lower
                or "validation" in answer_lower
            )
        )

        has_generalisation_signal = any(
            phrase in answer_lower or phrase in reasoning_lower
            for phrase in [
                "does not generalise",
                "doesn't generalise",
                "does not generalize",
                "doesn't generalize",
                "poor generalisation",
                "poor generalization",
                "poorly on unseen data",
                "poor performance on unseen data",
                "generalisation gap",
                "generalization gap",
                "overfitting",
            ]
        )

        # Explicitly reject the known misconception:
        # high training accuracy => good generalisation.
        has_misconception = (
            (
                "training accuracy" in answer_lower
                and any(
                    phrase in answer_lower
                    for phrase in [
                        "means the model",
                        "means model",
                        "shows the model",
                        "model should",
                        "model will",
                        "generalise well",
                        "generalize well",
                    ]
                )
            )
            or "test data is harder" in answer_lower
        )

        is_correct = (
            has_gap_signal
            and has_generalisation_signal
            and not has_misconception
        )

    # ---------------------------------------------------------
    # Bias-Variance evaluator
    # ---------------------------------------------------------
    elif concept.id == "bias_variance":
        # Correct understanding requires:
        # 1. Simple model -> underfitting / high bias
        # 2. Deep model -> overfitting / high variance
        # 3. Understanding of the bias-variance tradeoff

        simple_model_underfits = (
            (
                "simple" in answer_lower
                or "linear" in answer_lower
            )
            and (
                "underfit" in answer_lower
                or "underfitting" in answer_lower
                or "high bias" in answer_lower
            )
        )

        complex_model_overfits = (
            (
                "deep" in answer_lower
                or "neural" in answer_lower
                or "complex" in answer_lower
                or "high complexity" in answer_lower
                or "very complex" in answer_lower
            )
            and (
                "overfit" in answer_lower
                or "overfitting" in answer_lower
                or "high variance" in answer_lower
            )
        )

        tradeoff_signal = (
            "bias" in answer_lower
            and "variance" in answer_lower
        )

        # Explicitly reject the reversed interpretation.
        reversed_interpretation = (
            (
                (
                    "simple" in answer_lower
                    or "linear" in answer_lower
                )
                and (
                    "overfit" in answer_lower
                    or "overfitting" in answer_lower
                    or "high variance" in answer_lower
                )
                and not (
                    (
                        "simple" in answer_lower
                        or "linear" in answer_lower
                    )
                    and (
                        "underfit" in answer_lower
                        or "underfitting" in answer_lower
                        or "high bias" in answer_lower
                    )
                )
            )
            or (
                (
                    "deep" in answer_lower
                    or "neural" in answer_lower
                )
                and (
                    "underfit" in answer_lower
                    or "underfitting" in answer_lower
                    or "high bias" in answer_lower
                )
                and not (
                    (
                        "deep" in answer_lower
                        or "neural" in answer_lower
                    )
                    and (
                        "overfit" in answer_lower
                        or "overfitting" in answer_lower
                        or "high variance" in answer_lower
                    )
                )
            )
        )

        is_correct = (
            simple_model_underfits
            and complex_model_overfits
            and tradeoff_signal
            and not reversed_interpretation
        )

    # ---------------------------------------------------------
    # Classification Metrics evaluator
    # ---------------------------------------------------------
    elif concept.id == "classification_metrics":
        # Correct understanding requires:
        # 1. recognizing that the scenario prioritizes recall
        # 2. connecting recall to identifying actual positives
        # 3. understanding that this means reducing false negatives
        #
        # Precision focuses on predicted positives being correct.
        # Recall focuses on finding actual positives.

        recall_signal = (
            "recall" in answer_lower
            or "recall" in reasoning_lower
        )

        actual_positive_signal = any(
            phrase in answer_lower or phrase in reasoning_lower
            for phrase in [
                "actual positive",
                "actual positives",
                "positive cases",
                "positive case",
                "catch as many",
                "identify as many",
                "find as many",
                "detect as many",
            ]
        )

        false_negative_signal = any(
            phrase in answer_lower or phrase in reasoning_lower
            for phrase in [
                "false negative",
                "false negatives",
                "missed",
                "miss a patient",
                "miss patients",
                "missed cases",
                "not detected",
            ]
        )

        # Explicitly reject the common precision/recall reversal.
        precision_only = (
            "precision" in answer_lower
            and not recall_signal
        )

        is_correct = (
            recall_signal
            and (
                actual_positive_signal
                or false_negative_signal
            )
            and not precision_only
        )

    # ---------------------------------------------------------
    # Generic fallback
    # ---------------------------------------------------------
    else:
        correct_lower = (
            (concept.correct_answer or "")
            .strip()
            .lower()
        )

        if answer_lower == correct_lower:
            is_correct = True

    # ---------------------------------------------------------
    # Record reassessment attempt
    # ---------------------------------------------------------
    attempt = Attempt(
        learner_id=payload.learner_id,
        session_id=payload.session_id,
        concept_id=payload.concept_id,
        question_type="reassessment",
        answer=payload.answer,
        reasoning=payload.reasoning,
        confidence=payload.confidence,
        is_correct=is_correct,
    )
    db.add(attempt)

    # ---------------------------------------------------------
    # Determine whether the misconception persisted.
    #
    # A misconception is considered persistent when:
    # - reassessment is incorrect
    # - an active misconception exists
    # - the previous intervention was targeted
    # ---------------------------------------------------------
    misconception_persisted = (
        not is_correct
        and bool(state.active_misconceptions)
        and state.last_intervention_type == TARGETED_MISCONCEPTION
    )

    # ---------------------------------------------------------
    # Update mastery
    # ---------------------------------------------------------
    new_mastery = update_mastery(
        current_mastery=state.mastery,
        is_correct=is_correct,
        confidence=payload.confidence,
        misconception_detected=bool(
            state.active_misconceptions
        ),
        intervention_type=state.last_intervention_type,
        is_reassessment=True,
        misconception_persisted=misconception_persisted,
    )

    # ---------------------------------------------------------
    # Clear misconception after successful remediation.
    # ---------------------------------------------------------
    if is_correct and state.active_misconceptions:
        state.active_misconceptions = []

    state.mastery = new_mastery
    state.confidence = payload.confidence
    state.attempt_count += 1

    # ---------------------------------------------------------
    # Persist reassessment history.
    # ---------------------------------------------------------
    state.history = append_history(
        state.history,
        "reassessment",
        {
            "correct": is_correct,
            "mastery_before": previous_mastery,
            "mastery_after": new_mastery,
            "misconception_persisted": misconception_persisted,
        },
    )

    # ---------------------------------------------------------
    # Session lifecycle
    #
    # Successful remediation -> session completed.
    # Failed reassessment -> session remains active so the
    # adaptive loop can continue.
    # ---------------------------------------------------------
    if is_correct:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
    else:
        session.status = "active"
        session.completed_at = None

    db.commit()
    db.refresh(state)

    # ---------------------------------------------------------
    # Build next action
    # ---------------------------------------------------------
    delta = new_mastery - previous_mastery

    if is_correct and delta > 0.05:
        next_action = (
            "Concept strengthened. You can move to a related "
            "concept or try a harder question."
        )
    elif is_correct:
        next_action = (
            "Understanding is stable. Consider a short "
            "practice set to lock it in."
        )
    else:
        next_action = (
            "Still some gaps. Recommend revisiting with a "
            "different explanation or example."
        )

    # ---------------------------------------------------------
    # Explain the state transition
    # ---------------------------------------------------------
    why = (
        f"Reassessment {'passed' if is_correct else 'needs work'}. "
        f"Mastery moved "
        f"{previous_mastery:.0%} → {new_mastery:.0%}."
    )

    if is_correct and previous_mastery < 0.5:
        why += " The targeted intervention appears to have helped."

    # ---------------------------------------------------------
    # Progress summary
    # ---------------------------------------------------------
    progress_summary = mock_generate_reassessment_feedback(
        is_correct=is_correct,
        previous_mastery=previous_mastery,
        new_mastery=new_mastery,
    )

    # ---------------------------------------------------------
    # Response
    # ---------------------------------------------------------
    return ReassessResponse(
        is_correct=is_correct,
        previous_mastery=previous_mastery,
        new_mastery=new_mastery,
        mastery_delta=round(delta, 3),
        active_misconceptions=state.active_misconceptions or [],
        next_action=next_action,
        why_this_next=why,
        updated_state=LearnerConceptStateOut.model_validate(state),
        progress_summary=progress_summary,
    )

# ---------- Evaluation ----------
@router.get("/evaluation/policy")
def evaluate_policy():
    benchmark = run_policy_evaluation()
    misconception_adaptation = evaluate_misconception_adaptation()
    learning_gain = run_learning_gain_benchmark()

    return {
        "benchmark": benchmark,
        "misconception_adaptation": misconception_adaptation,
        "learning_gain": learning_gain,
    }

@router.get("/evaluation/learning-gain")
def evaluate_learning_gain():
    return run_learning_gain_benchmark()