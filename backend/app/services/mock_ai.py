"""
Deterministic MOCK / DEMO mode.
Answer-driven diagnosis; scenarios only set INITIAL learner state.
"""
from typing import Optional, Dict, Any, List
from .learner_model import (
    select_intervention,
    build_why_this_next,
    normalize_intervention_type,
    FOUNDATIONAL_EXPLANATION,
    TARGETED_MISCONCEPTION,
    REINFORCEMENT,
    GUIDED_EXAMPLE,
    PRACTICE_CHALLENGE,
)


DEMO_SCENARIOS = {
    "high_conf_misconception": {
        "description": "High confidence + misconception about training accuracy vs generalisation",
        "initial_mastery": 0.42,
        "initial_confidence": 0.82,
        "forced_misconception": None,  # scenario seeds mastery/confidence only; answer drives diagnosis
    },
    "low_conf_correct": {
        "description": "Correct answer but low confidence",
        "initial_mastery": 0.70,
        "initial_confidence": 0.28,
        "forced_misconception": None,
    },
    "low_mastery": {
        "description": "Low mastery — needs foundational explanation",
        "initial_mastery": 0.25,
        "initial_confidence": 0.35,
        "forced_misconception": None,
    },
}


# Keywords that signal understanding of common AI concepts
CORRECT_SIGNALS = {
    "overfitting": [
        "overfit", "memor", "unseen", "generalisation", "generalization",
        "train high", "test low", "validation", "gap between", "noise",
    ],
    "bias_variance": [
        "bias", "variance", "underfit", "tradeoff", "trade-off",
        "complex", "simple model", "high bias", "high variance",
    ],
    "train_val_test": [
        "leak", "unbiased", "never tune", "held-out", "once",
        "validation for tuning", "test only", "data leakage",
    ],
    "regularization": [
        "penalty", "shrink", "l2", "l1", "lasso", "ridge",
        "overfitting", "weights", "sparse", "feature selection",
    ],
    "gradient_descent": [
        "learning rate", "too high", "diverge", "overshoot",
        "oscillat", "step size", "converge", "minimum",
    ],
}

MISCONCEPTION_SIGNALS = {
    "overfitting": [
    ("training accuracy", "generalisation"),
    ("training accuracy", "generalization"),
    ("training accuracy", "generalises"),
    ("training accuracy", "generalizes"),
    ("training accuracy", "means", "generalise"),
    ("training accuracy", "means", "generalize"),
    ("training accuracy", "should", "generalise"),
    ("training accuracy", "should", "generalize"),
    ("training data", "generalise"),
    ("training data", "generalize"),
    ("higher training", "better"),
    ("higher training accuracy", "good"),
    ("98%", "generalise"),
    ("98%", "generalize"),
    ("98%", "good"),
    ("training is best",),
],
    "bias_variance": [
        ("more complex always",),
        ("complex is better",),
        ("bias and variance same",),
    ],
    "train_val_test": [
        ("test for tuning",),
        ("use test set", "tune"),
        ("validation and test same",),
    ],
}


def _score_correctness(answer: str, concept_id: str, correct_answer: str) -> bool:
    answer_lower = (answer or "").strip().lower()

    if not answer_lower or len(answer_lower) < 3:
        return False

    # Explicitly wrong markers
    if any(w in answer_lower for w in [
        "i don't know",
        "no idea",
        "not sure what",
        "maybe the data is bad",
        "training accuracy means it generalises",
        "training accuracy means it generalizes",
        "high training accuracy means good",
    ]):
        return False

    # ---------------------------------------------------------
    # MISCONCEPTION-FIRST CHECK
    # ---------------------------------------------------------
    # A known misconception must override positive keyword matches.
    misconception_signals = MISCONCEPTION_SIGNALS.get(concept_id, [])

    for sig_tuple in misconception_signals:
        if all(signal in answer_lower for signal in sig_tuple):
            return False

    # ---------------------------------------------------------
    # POSITIVE EVIDENCE CHECK
    # ---------------------------------------------------------
    signals = CORRECT_SIGNALS.get(concept_id, [])
    hits = sum(1 for signal in signals if signal in answer_lower)

    if hits >= 2:
        return True

    if hits >= 1 and len(answer_lower) > 40:
        return True

    # ---------------------------------------------------------
    # REFERENCE ANSWER OVERLAP
    # ---------------------------------------------------------
    ref_tokens = [
        token
        for token in correct_answer.lower().split()
        if len(token) > 5
    ]

    overlap = sum(
        1 for token in ref_tokens
        if token in answer_lower
    )

    if overlap >= 3:
        return True

    return False

def _detect_misconception(
    answer: str,
    reasoning: Optional[str],
    concept_id: str,
    common_misconceptions: List[str],
    is_correct: bool,
    confidence: float,
) -> tuple:
    if is_correct:
        return None, 0.0

    text = f"{answer or ''} {reasoning or ''}".lower()
    signals = MISCONCEPTION_SIGNALS.get(concept_id, [])

    for sig_tuple in signals:
        if all(s in text for s in sig_tuple):
            misc = common_misconceptions[0] if common_misconceptions else "Conceptual misconception detected"
            conf = 0.85 if confidence >= 0.7 else 0.72
            return misc, conf

    # High confidence wrong → elevate first common misconception
    if confidence >= 0.7 and common_misconceptions:
        return common_misconceptions[0], 0.78

    # Keyword overlap with listed misconceptions
    if reasoning and common_misconceptions:
        for misc in common_misconceptions:
            words = [w for w in misc.lower().split() if len(w) > 4]
            if sum(1 for w in words if w in text) >= 2:
                return misc, 0.70

    if not is_correct and confidence >= 0.6 and common_misconceptions:
        return common_misconceptions[0], 0.65

    return None, 0.0


def mock_diagnose(
    concept_id: str,
    concept_name: str,
    answer: str,
    reasoning: Optional[str],
    confidence: float,
    correct_answer: str,
    common_misconceptions: list,
    current_mastery: float,
    demo_scenario: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Deterministic answer-driven diagnosis for MOCK mode.

    The evaluator checks concept-specific understanding instead of
    relying only on loose keyword matching.

    demo_scenario does NOT dictate the result;
    it only seeded initial mastery/confidence at session start.
    """

    answer_lower = (answer or "").strip().lower()
    reasoning_lower = (reasoning or "").strip().lower()

    is_correct = False
    misconception = None
    misconception_conf = 0.0

    # =========================================================
    # OVERFITTING
    # =========================================================
    if concept_id == "overfitting":
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

        if has_misconception:
            misconception = (
                "Equating high training accuracy with good "
                "generalisation"
            )
            misconception_conf = 0.9

    # =========================================================
    # BIAS-VARIANCE TRADEOFF
    # =========================================================
    elif concept_id == "bias_variance":
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

        deep_model_overfits = (
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

        tradeoff_signal = (
            "bias" in answer_lower
            and "variance" in answer_lower
        )

        reversed_interpretation = (
            (
                "simple" in answer_lower
                and "overfit" in answer_lower
            )
            or (
                ("deep" in answer_lower or "neural" in answer_lower)
                and "underfit" in answer_lower
            )
        )

        is_correct = (
            simple_model_underfits
            and deep_model_overfits
            and tradeoff_signal
            and not reversed_interpretation
        )

        # Detect the specific misconception even when the answer
        # contains the expected keywords.
        if reversed_interpretation:
            misconception = (
                "Reversing the bias-variance relationship: "
                "treating simple models as high-variance/overfitting "
                "and deep models as high-bias/underfitting"
            )
            misconception_conf = 0.9

        elif (
            "poor performance" in answer_lower
            and "overfit" in answer_lower
        ):
            misconception = (
                "Assuming poor performance on both training and "
                "test data automatically means overfitting"
            )
            misconception_conf = 0.85

        elif (
            "training" in answer_lower
            and "test" in answer_lower
            and "high" in answer_lower
            and "accuracy" in answer_lower
            and "general" not in answer_lower
        ):
            misconception = (
                "Confusing high training performance with "
                "generalisation"
            )
            misconception_conf = 0.8

        # =========================================================
    # CLASSIFICATION METRICS
    # =========================================================
    elif concept_id == "classification_metrics":
        recall_signal = (
            "recall" in answer_lower
            or "recall" in reasoning_lower
        )

        actual_positive_signal = any(
            phrase in answer_lower or phrase in reasoning_lower
            for phrase in [
                "actual positive",
                "actual positives",
                "positive case",
                "positive cases",
                "catch as many",
                "identify as many",
                "detect as many",
                "find as many",
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

        precision_signal = (
            "precision" in answer_lower
            or "precision" in reasoning_lower
        )

        # Correct reasoning:
        # The scenario prioritizes finding actual positives,
        # so recall is more important and false negatives
        # should be minimized.
        is_correct = (
            recall_signal
            and (
                actual_positive_signal
                or false_negative_signal
            )
        )

        # Detect the common precision/recall reversal.
        if precision_signal and not recall_signal:
            misconception = (
                "Confusing precision with recall: "
                "the scenario prioritizes finding as many "
                "actual positive cases as possible, which "
                "means reducing false negatives."
            )
            misconception_conf = 0.9

        elif (
            "accuracy" in answer_lower
            and not recall_signal
        ):
            misconception = (
                "Assuming overall accuracy is always the "
                "best metric instead of choosing a metric "
                "based on the cost of false positives "
                "and false negatives."
            )
            misconception_conf = 0.8

        elif (
            ("false positive" in answer_lower
             or "false positives" in answer_lower)
            and "false negative" not in answer_lower
            and not recall_signal
        ):
            misconception = (
                "Focusing on false positives while overlooking "
                "the false negatives that the scenario is "
                "trying to minimize."
            )
            misconception_conf = 0.85

    # =========================================================
    # GENERIC CONCEPTS
    # =========================================================
    else:
        is_correct = _score_correctness(
            answer,
            concept_id,
            correct_answer,
        )

        if not is_correct:
            detected_misconception, detected_conf = (
                _detect_misconception(
                    answer,
                    reasoning,
                    concept_id,
                    common_misconceptions or [],
                    is_correct,
                    confidence,
                )
            )

            misconception = detected_misconception
            misconception_conf = detected_conf

    # =========================================================
    # FALLBACK MISCONCEPTION DETECTION
    #
    # If a concept-specific evaluator marked the answer wrong
    # but did not identify a misconception, use the existing
    # misconception detector as a secondary signal.
    # =========================================================
    if not is_correct and not misconception:
        detected_misconception, detected_conf = (
            _detect_misconception(
                answer,
                reasoning,
                concept_id,
                common_misconceptions or [],
                is_correct,
                confidence,
            )
        )

        misconception = detected_misconception
        misconception_conf = detected_conf

    # =========================================================
    # ADAPTIVE POLICY
    # =========================================================
    policy = select_intervention(
        is_correct=is_correct,
        confidence=confidence,
        misconception_detected=bool(misconception),
        misconception_confidence=misconception_conf,
        current_mastery=current_mastery,
    )

    # =========================================================
    # MASTERY ESTIMATE
    # =========================================================
    if is_correct:
        mastery_est = min(
            1.0,
            current_mastery + 0.12 + 0.05 * confidence,
        )
    else:
        mastery_est = max(
            0.0,
            current_mastery - 0.08 - 0.05 * confidence,
        )

    # =========================================================
    # REASONING SUMMARY
    # =========================================================
    reasoning_summary = (
        f"Learner answered "
        f"{'correctly' if is_correct else 'incorrectly'} "
        f"with confidence {confidence:.0%}."
    )

    if reasoning:
        snippet = (
            reasoning[:140]
            + ("..." if len(reasoning) > 140 else "")
        )
        reasoning_summary += (
            f" Reasoning: “{snippet}”."
        )

    # =========================================================
    # WHY THIS NEXT
    # =========================================================
    why = build_why_this_next(
        is_correct=is_correct,
        confidence=confidence,
        misconception=misconception,
        intervention_type=policy["type"],
        mastery=current_mastery,
        misconception_confidence=misconception_conf,
        policy_reason=policy["reason"],
    )

    # =========================================================
    # RESPONSE
    # =========================================================
    return {
        "concept": concept_name,
        "correctness": is_correct,
        "reasoning_summary": reasoning_summary,
        "misconception_detected": bool(misconception),
        "misconception": misconception,
        "misconception_confidence": misconception_conf,
        "mastery_estimate": round(mastery_est, 3),
        "recommended_intervention_type": policy["type"],
        "policy_rule": policy["policy_rule"],
        "reason": why,
        "policy_reason": policy["reason"],
        "mock_mode": True,
    }

def mock_generate_intervention(
    concept_name: str,
    concept_description: str,
    intervention_type: str,
    misconception: Optional[str],
    is_correct: bool,
) -> str:
    itype = normalize_intervention_type(intervention_type)

    if itype == TARGETED_MISCONCEPTION:
        return (
            f"**Targeted Misconception Intervention — {concept_name}**\n\n"
            f"**What the evidence suggests**\n"
            f"Your response is consistent with: *{misconception or 'a conceptual mix-up'}*.\n\n"
            f"**The key distinction**\n"
            f"{concept_description or 'Let’s separate the ideas that got mixed together.'}\n\n"
            "Training performance only tells you how well the model fit data it has already seen. "
            "Generalisation is measured on *unseen* data. A large gap between train and test accuracy "
            "is the classic signature of overfitting — not of strong generalisation.\n\n"
            "**Concrete counter-example**\n"
            "• Train accuracy: 99%\n"
            "• Test accuracy: 61%\n"
            "This model has essentially memorised the training set. It is *not* evidence of good generalisation.\n\n"
            "**Try this**\n"
            "In one sentence: what would you look at to judge whether a model generalises well?"
        )

    if itype == GUIDED_EXAMPLE:
        return (
            f"**Guided Example — {concept_name}**\n\n"
            f"{concept_description or 'Here is a concrete walkthrough.'}\n\n"
            "Walk through the example and map each part back to the definition. "
            "Focus on *why* the outcome occurs, not only *what* the numbers are.\n\n"
            "**Check**\n"
            "Restate the main idea in your own words, then give one real-world analogy."
        )

    if itype == FOUNDATIONAL_EXPLANATION:
        return (
            f"**Foundational Explanation — {concept_name}**\n\n"
            f"{concept_description or 'Let’s build the concept from the ground up.'}\n\n"
            "Start with the core definition, then the symptom you would observe in practice, "
            "then one technique that addresses it. Do not skip to advanced tricks until the base is solid.\n\n"
            "**Focus question**\n"
            "What problem does this concept help you diagnose or prevent?"
        )

    if itype == PRACTICE_CHALLENGE:
        return (
            f"**Practice Challenge — {concept_name}**\n\n"
            "Apply the idea:\n"
            "1. Describe a scenario where this concept would matter in a real project.\n"
            "2. What metrics or plots would you inspect?\n"
            "3. What would you change in the training setup if the problem appeared?\n\n"
            "Write a short paragraph for each. Reasoning matters more than perfect wording."
        )

    # REINFORCEMENT
    return (
        f"**Reinforcement — {concept_name}**\n\n"
        "You already have the core idea. Let’s lock it in.\n\n"
        "• Restate the concept in one sentence as if explaining it to a friend.\n"
        "• Give one analogy that captures the same structure.\n\n"
        "Doing this strengthens the memory trace and raises confidence for future questions."
    )


def mock_generate_reassessment_feedback(
    is_correct: bool,
    previous_mastery: float,
    new_mastery: float,
    misconception_persisted: bool = False,
) -> str:
    delta = new_mastery - previous_mastery
    if misconception_persisted:
        return (
            f"Misconception appears to persist. Mastery moved "
            f"{previous_mastery:.0%} → {new_mastery:.0%}. "
            "Next step will use a different intervention strategy."
        )
    if is_correct and delta > 0:
        return (
            f"Improvement registered. Mastery {previous_mastery:.0%} → {new_mastery:.0%} "
            f"({delta:+.0%}). The targeted practice is paying off."
        )
    if is_correct:
        return "Correct again. Understanding looks stable."
    return (
        f"Still gaps. Mastery is now {new_mastery:.0%}. "
        "We can revisit with a different angle."
    )
