"""
Deterministic learner model + explicit intervention policy.
LLM provides evidence; this module owns mastery, selection, and progress.
"""
from typing import List, Optional, Dict, Any
from datetime import datetime


# Canonical intervention types (Phase 6)
FOUNDATIONAL_EXPLANATION = "foundational_explanation"
TARGETED_MISCONCEPTION = "targeted_misconception"
REINFORCEMENT = "reinforcement"
GUIDED_EXAMPLE = "guided_example"
PRACTICE_CHALLENGE = "practice_challenge"

# Map legacy names used in older code
LEGACY_MAP = {
    "explanation": FOUNDATIONAL_EXPLANATION,
    "example": GUIDED_EXAMPLE,
    "practice": PRACTICE_CHALLENGE,
    "reinforcement": REINFORCEMENT,
}


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


def normalize_intervention_type(t: Optional[str]) -> str:
    if not t:
        return FOUNDATIONAL_EXPLANATION
    t = t.lower().strip()
    return LEGACY_MAP.get(t, t)


def update_mastery(
    current_mastery: float,
    is_correct: bool,
    confidence: float,
    misconception_detected: bool,
    intervention_type: Optional[str] = None,
    is_reassessment: bool = False,
    misconception_persisted: bool = False,
) -> float:
    """
    Deterministic, explainable mastery update.

    Rules:
    - Correct → meaningful gain scaled by confidence
    - Incorrect → moderate penalty scaled by confidence
    - Misconception affects the adaptive intervention policy more than mastery
    - Successful remediation after targeted intervention → additional bonus
    - Persistent misconception after reassessment → controlled penalty
    """

    itype = normalize_intervention_type(intervention_type)

    if is_correct:
        delta = 0.10 + (0.06 * confidence)

        if is_reassessment and itype in (
            FOUNDATIONAL_EXPLANATION,
            TARGETED_MISCONCEPTION,
            GUIDED_EXAMPLE,
            PRACTICE_CHALLENGE,
        ):
            delta += 0.08

        if itype == REINFORCEMENT:
            delta = 0.05 + (0.03 * confidence)

    else:
    # Incorrect answers should reduce mastery moderately.
    # Repeated failure strengthens the misconception signal,
    # but should not collapse mastery to zero.
        delta = -0.04 - (0.02 * confidence)

        if misconception_persisted and is_reassessment:
            delta = -0.05

    return round(clamp(current_mastery + delta), 3)

def select_intervention(
    is_correct: bool,
    confidence: float,
    misconception_detected: bool,
    misconception_confidence: float,
    current_mastery: float,
    misconception_persisted: bool = False,
) -> Dict[str, Any]:
    """
    Explicit adaptive intervention policy (Phase 5).
    Returns type + structured decision reason.
    """
    # Persistent misconception after failed remediation → change strategy
    if misconception_persisted:
        return {
            "type": GUIDED_EXAMPLE,
            "policy_rule": "misconception_persists",
            "reason": (
                "Misconception persists after prior intervention. "
                "Switching to a concrete guided example rather than repeating the same explanation."
            ),
        }

    # High-confidence wrong + strong misconception signal
    if (
        not is_correct
        and misconception_detected
        and misconception_confidence >= 0.7
    ):
        return {
            "type": TARGETED_MISCONCEPTION,
            "policy_rule": "high_conf_misconception",
            "reason": (
                f"Incorrect answer with high confidence ({confidence:.0%}) and "
                f"misconception confidence {misconception_confidence:.0%}. "
                "This indicates a stable conceptual misconception, not a simple knowledge gap."
            ),
        }

    # Wrong + medium misconception signal
    if not is_correct and misconception_detected:
        return {
            "type": GUIDED_EXAMPLE if confidence >= 0.5 else FOUNDATIONAL_EXPLANATION,
            "policy_rule": "misconception_detected",
            "reason": (
                "Misconception signals present. "
                "Selecting a targeted example or foundational explanation based on confidence."
            ),
        }

    # Correct but low confidence → reinforce, do not re-teach
    if is_correct and confidence < 0.4:
        return {
            "type": REINFORCEMENT,
            "policy_rule": "correct_low_confidence",
            "reason": (
                f"Answer is correct but confidence is low ({confidence:.0%}). "
                "Reinforcement strengthens the memory trace without re-teaching the concept."
            ),
        }

    # Low mastery → foundation first
    if current_mastery < 0.4 and not is_correct:
        return {
            "type": FOUNDATIONAL_EXPLANATION,
            "policy_rule": "low_mastery",
            "reason": (
                f"Mastery is low ({current_mastery:.0%}). "
                "Foundational explanation before practice or challenge."
            ),
        }

    # Strong learner → challenge
    if is_correct and current_mastery >= 0.75 and confidence >= 0.7:
        return {
            "type": PRACTICE_CHALLENGE,
            "policy_rule": "strong_learner",
            "reason": (
                f"Mastery {current_mastery:.0%} and confidence {confidence:.0%}. "
                "Ready for a practice challenge."
            ),
        }

    # Correct with decent confidence, still building
    if is_correct:
        return {
            "type": PRACTICE_CHALLENGE if current_mastery < 0.6 else REINFORCEMENT,
            "policy_rule": "correct_consolidating",
            "reason": (
                f"Correct answer at mastery {current_mastery:.0%}. "
                "Consolidating with practice or light reinforcement."
            ),
        }

    # Default for incorrect without clear misconception
    return {
        "type": FOUNDATIONAL_EXPLANATION if current_mastery < 0.5 else PRACTICE_CHALLENGE,
        "policy_rule": "default_incorrect",
        "reason": (
            f"Incorrect response at mastery {current_mastery:.0%}. "
            "Selecting explanation or practice based on current level."
        ),
    }


# Backwards-compatible alias
def select_intervention_type(
    is_correct: bool,
    confidence: float,
    misconception_detected: bool,
    current_mastery: float,
) -> str:
    result = select_intervention(
        is_correct=is_correct,
        confidence=confidence,
        misconception_detected=misconception_detected,
        misconception_confidence=0.8 if misconception_detected else 0.0,
        current_mastery=current_mastery,
    )
    return result["type"]


def build_why_this_next(
    is_correct: bool,
    confidence: float,
    misconception: Optional[str],
    intervention_type: str,
    mastery: float,
    misconception_confidence: float = 0.0,
    policy_reason: Optional[str] = None,
) -> str:
    """Structured, judge-friendly explanation of the adaptive decision."""
    lines = []
    lines.append(f"Learner state: mastery {mastery:.0%}, confidence {confidence:.0%}.")
    if misconception:
        lines.append(
            f"Active misconception: “{misconception}” "
            f"(confidence {misconception_confidence:.0%})."
        )
    else:
        lines.append("No active misconception detected.")
    lines.append(f"Decision: {normalize_intervention_type(intervention_type).replace('_', ' ')}.")
    if policy_reason:
        lines.append(policy_reason)
    elif misconception and not is_correct:
        lines.append(
            "High confidence with incorrect reasoning indicates a stable misconception "
            "rather than a simple knowledge gap."
        )
    elif is_correct and confidence < 0.4:
        lines.append(
            "Correct but low-confidence answers benefit from reinforcement, not re-teaching."
        )
    return " ".join(lines)


def build_decision_trace(
    question: str,
    answer: str,
    reasoning: Optional[str],
    confidence: float,
    is_correct: bool,
    misconception: Optional[str],
    misconception_confidence: float,
    mastery_before: float,
    mastery_after: float,
    intervention_type: str,
    policy_rule: str,
    policy_reason: str,
) -> Dict[str, Any]:
    """Full decision trace for UI and judges (Phase 13)."""
    return {
        "steps": [
            {"stage": "QUESTION", "detail": question[:200]},
            {
                "stage": "LEARNER_EVIDENCE",
                "detail": {
                    "answer": answer[:300],
                    "reasoning": (reasoning or "")[:200],
                    "confidence": confidence,
                },
            },
            {
                "stage": "DIAGNOSIS",
                "detail": {
                    "correct": is_correct,
                    "misconception": misconception,
                    "misconception_confidence": misconception_confidence,
                },
            },
            {
                "stage": "LEARNER_STATE_UPDATE",
                "detail": {
                    "mastery_before": mastery_before,
                    "mastery_after": mastery_after,
                },
            },
            {
                "stage": "INTERVENTION_POLICY",
                "detail": {
                    "rule": policy_rule,
                    "selected": intervention_type,
                    "reason": policy_reason,
                },
            },
        ]
    }


def append_history(
    history: List[Dict[str, Any]],
    event_type: str,
    details: Dict[str, Any],
) -> List[Dict[str, Any]]:
    entry = {
        "event": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        **details,
    }
    new_history = list(history or [])
    new_history.append(entry)
    return new_history[-20:]
