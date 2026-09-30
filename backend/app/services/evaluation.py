"""
Deterministic evaluation engine for LearnLoop AI.

This module evaluates the adaptive intervention policy against
controlled learner scenarios.

Important:
- These are controlled benchmark scenarios, not real-user metrics.
- No performance numbers are fabricated.
- The evaluation engine reports exactly what the deterministic
  learner model produces for the defined scenarios.
"""

from dataclasses import dataclass
from typing import Dict, List, Any

from app.services.learner_model import (
    FOUNDATIONAL_EXPLANATION,
    TARGETED_MISCONCEPTION,
    REINFORCEMENT,
    GUIDED_EXAMPLE,
    PRACTICE_CHALLENGE,
    select_intervention,
    update_mastery,
)


# ============================================================
# Controlled Evaluation Scenario
# ============================================================

@dataclass
class EvaluationScenario:
    name: str
    description: str
    is_correct: bool
    confidence: float
    misconception_detected: bool
    misconception_confidence: float
    current_mastery: float
    misconception_persisted: bool
    expected_intervention: str


# ============================================================
# Baseline Tutor
# ============================================================

def baseline_intervention(
    is_correct: bool,
    confidence: float,
    current_mastery: float,
) -> str:
    """
    Simple fixed-path baseline.

    The baseline does not model misconceptions or learner history.

    Incorrect answers receive a foundational explanation.
    Correct answers receive reinforcement.
    """

    if is_correct:
        return REINFORCEMENT

    return FOUNDATIONAL_EXPLANATION


# ============================================================
# Controlled Benchmark Scenarios
# ============================================================

def build_evaluation_scenarios() -> List[EvaluationScenario]:
    """
    Build deterministic learner scenarios covering the major
    adaptive policy branches.
    """

    return [
        EvaluationScenario(
            name="High-confidence misconception",
            description=(
                "Learner answers incorrectly with high confidence "
                "and a strong misconception signal."
            ),
            is_correct=False,
            confidence=0.80,
            misconception_detected=True,
            misconception_confidence=0.90,
            current_mastery=0.30,
            misconception_persisted=False,
            expected_intervention=TARGETED_MISCONCEPTION,
        ),

        EvaluationScenario(
            name="Persistent misconception",
            description=(
                "Learner remains incorrect after a previous "
                "intervention and the misconception persists."
            ),
            is_correct=False,
            confidence=0.85,
            misconception_detected=True,
            misconception_confidence=0.90,
            current_mastery=0.35,
            misconception_persisted=True,
            expected_intervention=GUIDED_EXAMPLE,
        ),

        EvaluationScenario(
            name="Medium-confidence misconception",
            description=(
                "Learner is incorrect and shows a misconception, "
                "but the misconception signal is not high enough "
                "for the high-confidence rule."
            ),
            is_correct=False,
            confidence=0.60,
            misconception_detected=True,
            misconception_confidence=0.50,
            current_mastery=0.45,
            misconception_persisted=False,
            expected_intervention=GUIDED_EXAMPLE,
        ),

        EvaluationScenario(
            name="Low-mastery incorrect answer",
            description=(
                "Learner is incorrect without a clear misconception "
                "and has low mastery."
            ),
            is_correct=False,
            confidence=0.40,
            misconception_detected=False,
            misconception_confidence=0.0,
            current_mastery=0.30,
            misconception_persisted=False,
            expected_intervention=FOUNDATIONAL_EXPLANATION,
        ),

        EvaluationScenario(
            name="Correct but low confidence",
            description=(
                "Learner answers correctly but is not confident "
                "enough for a challenge."
            ),
            is_correct=True,
            confidence=0.30,
            misconception_detected=False,
            misconception_confidence=0.0,
            current_mastery=0.55,
            misconception_persisted=False,
            expected_intervention=REINFORCEMENT,
        ),

        EvaluationScenario(
            name="Strong learner",
            description=(
                "Learner is correct, highly confident, and already "
                "has strong mastery."
            ),
            is_correct=True,
            confidence=0.90,
            misconception_detected=False,
            misconception_confidence=0.0,
            current_mastery=0.80,
            misconception_persisted=False,
            expected_intervention=PRACTICE_CHALLENGE,
        ),
    ]


# ============================================================
# Single Scenario Evaluation
# ============================================================

def evaluate_scenario(
    scenario: EvaluationScenario,
) -> Dict[str, Any]:
    """
    Evaluate one learner scenario against both:

    1. Fixed baseline tutor
    2. LearnLoop adaptive policy
    """

    adaptive_policy = select_intervention(
        is_correct=scenario.is_correct,
        confidence=scenario.confidence,
        misconception_detected=scenario.misconception_detected,
        misconception_confidence=scenario.misconception_confidence,
        current_mastery=scenario.current_mastery,
        misconception_persisted=scenario.misconception_persisted,
    )

    adaptive_intervention = adaptive_policy["type"]

    baseline = baseline_intervention(
        is_correct=scenario.is_correct,
        confidence=scenario.confidence,
        current_mastery=scenario.current_mastery,
    )

    adaptive_matches_expected = (
        adaptive_intervention == scenario.expected_intervention
    )

    # A scenario demonstrates adaptation when LearnLoop changes
    # the strategy compared with the fixed baseline.
    strategy_changed = (
        adaptive_intervention != baseline
    )

    # Simulate the learner-state update produced by the
    # deterministic mastery model.
    mastery_before = scenario.current_mastery

    mastery_after = update_mastery(
        current_mastery=mastery_before,
        is_correct=scenario.is_correct,
        confidence=scenario.confidence,
        misconception_detected=scenario.misconception_detected,
        intervention_type=adaptive_intervention,
        is_reassessment=scenario.misconception_persisted,
        misconception_persisted=scenario.misconception_persisted,
    )

    return {
        "scenario": scenario.name,
        "description": scenario.description,
        "baseline_intervention": baseline,
        "adaptive_intervention": adaptive_intervention,
        "expected_intervention": scenario.expected_intervention,
        "policy_rule": adaptive_policy["policy_rule"],
        "policy_reason": adaptive_policy["reason"],
        "adaptive_matches_expected": adaptive_matches_expected,
        "strategy_changed_from_baseline": strategy_changed,
        "mastery_before": mastery_before,
        "mastery_after": mastery_after,
        "mastery_delta": round(
            mastery_after - mastery_before,
            3,
        ),
    }


# ============================================================
# Aggregate Evaluation
# ============================================================

def run_policy_evaluation() -> Dict[str, Any]:
    """
    Run the complete deterministic policy benchmark.

    Returns raw scenario results plus aggregate metrics.
    """

    scenarios = build_evaluation_scenarios()

    results = [
        evaluate_scenario(scenario)
        for scenario in scenarios
    ]

    total = len(results)

    policy_matches = sum(
        1
        for result in results
        if result["adaptive_matches_expected"]
    )

    strategy_changes = sum(
        1
        for result in results
        if result["strategy_changed_from_baseline"]
    )

    total_mastery_delta = sum(
        result["mastery_delta"]
        for result in results
    )

    policy_accuracy = (
        policy_matches / total
        if total
        else 0.0
    )

    adaptation_rate = (
        strategy_changes / total
        if total
        else 0.0
    )

    average_mastery_delta = (
        total_mastery_delta / total
        if total
        else 0.0
    )

    return {
        "evaluation": {
            "name": "LearnLoop Adaptive Policy Benchmark",
            "scenario_count": total,
            "controlled_scenarios": True,
        },
        "metrics": {
            "adaptive_policy_accuracy": round(
                policy_accuracy,
                3,
            ),
            "strategy_change_rate": round(
                adaptation_rate,
                3,
            ),
            "average_mastery_delta": round(
                average_mastery_delta,
                3,
            ),
        },
        "results": results,
    }


# ============================================================
# Human-readable Evaluation Summary
# ============================================================

def format_evaluation_summary(
    evaluation: Dict[str, Any],
) -> str:
    """
    Convert evaluation output into a compact readable report.
    """

    metrics = evaluation["metrics"]
    results = evaluation["results"]

    lines = []

    lines.append("=" * 60)
    lines.append("LEARNLOOP ADAPTIVE POLICY BENCHMARK")
    lines.append("=" * 60)

    lines.append(
        f"Scenarios: {evaluation['evaluation']['scenario_count']}"
    )

    lines.append(
        f"Policy accuracy: "
        f"{metrics['adaptive_policy_accuracy']:.1%}"
    )

    lines.append(
        f"Strategy change rate: "
        f"{metrics['strategy_change_rate']:.1%}"
    )

    lines.append(
        f"Average mastery delta: "
        f"{metrics['average_mastery_delta']:+.3f}"
    )

    lines.append("")
    lines.append("SCENARIO RESULTS")
    lines.append("-" * 60)

    for result in results:
        lines.append(
            f"{result['scenario']}: "
            f"{result['adaptive_intervention']}"
        )

        lines.append(
            f"  Baseline: "
            f"{result['baseline_intervention']}"
        )

        lines.append(
            f"  Expected: "
            f"{result['expected_intervention']}"
        )

        lines.append(
            f"  Policy rule: "
            f"{result['policy_rule']}"
        )

        lines.append(
            f"  Mastery: "
            f"{result['mastery_before']:.0%} "
            f"→ "
            f"{result['mastery_after']:.0%}"
        )

        lines.append("")

    return "\n".join(lines)

# ============================================================
# Misconception Adaptation Evaluation
# ============================================================

def evaluate_misconception_adaptation() -> Dict[str, Any]:
    """
    Compare the fixed baseline and LearnLoop specifically on
    misconception-driven scenarios.

    This evaluates whether the adaptive policy uses learner
    evidence to change the intervention strategy.
    """

    scenarios = [
        {
            "name": "High-confidence misconception",
            "is_correct": False,
            "confidence": 0.80,
            "misconception_detected": True,
            "misconception_confidence": 0.90,
            "current_mastery": 0.30,
            "misconception_persisted": False,
        },
        {
            "name": "Persistent misconception",
            "is_correct": False,
            "confidence": 0.85,
            "misconception_detected": True,
            "misconception_confidence": 0.90,
            "current_mastery": 0.19,
            "misconception_persisted": True,
        },
    ]

    results = []

    for scenario in scenarios:
        baseline = baseline_intervention(
            is_correct=scenario["is_correct"],
            confidence=scenario["confidence"],
            current_mastery=scenario["current_mastery"],
        )

        adaptive = select_intervention(
            is_correct=scenario["is_correct"],
            confidence=scenario["confidence"],
            misconception_detected=scenario["misconception_detected"],
            misconception_confidence=scenario[
                "misconception_confidence"
            ],
            current_mastery=scenario["current_mastery"],
            misconception_persisted=scenario[
                "misconception_persisted"
            ],
        )

        changed = adaptive["type"] != baseline

        results.append(
            {
                "scenario": scenario["name"],
                "baseline": baseline,
                "learnloop": adaptive["type"],
                "policy_rule": adaptive["policy_rule"],
                "strategy_changed": changed,
            }
        )

    adaptation_count = sum(
        1
        for result in results
        if result["strategy_changed"]
    )

    adaptation_rate = (
        adaptation_count / len(results)
        if results
        else 0.0
    )

    return {
        "scenario_count": len(results),
        "adaptation_count": adaptation_count,
        "adaptation_rate": round(
            adaptation_rate,
            3,
        ),
        "results": results,
    }

# ============================================================
# Controlled Learning-Gain Benchmark
# ============================================================

def run_learning_gain_benchmark() -> Dict[str, Any]:
    """
    Controlled simulated learning-gain comparison.

    Compares:
    1. Fixed baseline tutor
    2. LearnLoop adaptive tutor

    This is a deterministic simulation for evaluating whether
    learner-specific intervention choices produce different
    modeled mastery transitions.

    It is NOT a real-user learning outcome measurement.
    """

    scenarios = [
        {
            "name": "High-confidence misconception",
            "pre_mastery": 0.30,
            "confidence": 0.80,
            "is_correct": False,
            "misconception_detected": True,
            "misconception_confidence": 0.90,
            "misconception_persisted": False,
        },
        {
            "name": "Persistent misconception",
            "pre_mastery": 0.35,
            "confidence": 0.85,
            "is_correct": False,
            "misconception_detected": True,
            "misconception_confidence": 0.90,
            "misconception_persisted": True,
        },
        {
            "name": "Medium-confidence misconception",
            "pre_mastery": 0.45,
            "confidence": 0.60,
            "is_correct": False,
            "misconception_detected": True,
            "misconception_confidence": 0.50,
            "misconception_persisted": False,
        },
        {
            "name": "Correct but low confidence",
            "pre_mastery": 0.55,
            "confidence": 0.30,
            "is_correct": True,
            "misconception_detected": False,
            "misconception_confidence": 0.0,
            "misconception_persisted": False,
        },
        {
            "name": "Strong learner",
            "pre_mastery": 0.80,
            "confidence": 0.90,
            "is_correct": True,
            "misconception_detected": False,
            "misconception_confidence": 0.0,
            "misconception_persisted": False,
        },
    ]

    results = []

    for scenario in scenarios:
        # ----------------------------------------------------
        # Baseline intervention
        # ----------------------------------------------------
        baseline_type = baseline_intervention(
            is_correct=scenario["is_correct"],
            confidence=scenario["confidence"],
            current_mastery=scenario["pre_mastery"],
        )

        baseline_mastery_after = update_mastery(
            current_mastery=scenario["pre_mastery"],
            is_correct=scenario["is_correct"],
            confidence=scenario["confidence"],
            misconception_detected=False,
            intervention_type=baseline_type,
            is_reassessment=scenario["misconception_persisted"],
            misconception_persisted=False,
        )

        # ----------------------------------------------------
        # LearnLoop adaptive intervention
        # ----------------------------------------------------
        adaptive_policy = select_intervention(
            is_correct=scenario["is_correct"],
            confidence=scenario["confidence"],
            misconception_detected=scenario["misconception_detected"],
            misconception_confidence=scenario[
                "misconception_confidence"
            ],
            current_mastery=scenario["pre_mastery"],
            misconception_persisted=scenario[
                "misconception_persisted"
            ],
        )

        adaptive_type = adaptive_policy["type"]

        adaptive_mastery_after = update_mastery(
            current_mastery=scenario["pre_mastery"],
            is_correct=scenario["is_correct"],
            confidence=scenario["confidence"],
            misconception_detected=scenario[
                "misconception_detected"
            ],
            intervention_type=adaptive_type,
            is_reassessment=scenario["misconception_persisted"],
            misconception_persisted=scenario[
                "misconception_persisted"
            ],
        )

        baseline_gain = (
            baseline_mastery_after
            - scenario["pre_mastery"]
        )

        adaptive_gain = (
            adaptive_mastery_after
            - scenario["pre_mastery"]
        )

        results.append(
            {
                "scenario": scenario["name"],
                "pre_mastery": scenario["pre_mastery"],
                "baseline_intervention": baseline_type,
                "learnloop_intervention": adaptive_type,
                "baseline_post_mastery": round(
                    baseline_mastery_after,
                    3,
                ),
                "learnloop_post_mastery": round(
                    adaptive_mastery_after,
                    3,
                ),
                "baseline_learning_gain": round(
                    baseline_gain,
                    3,
                ),
                "learnloop_learning_gain": round(
                    adaptive_gain,
                    3,
                ),
                "gain_difference": round(
                    adaptive_gain - baseline_gain,
                    3,
                ),
            }
        )

    count = len(results)

    baseline_average_gain = (
        sum(
            result["baseline_learning_gain"]
            for result in results
        ) / count
        if count
        else 0.0
    )

    learnloop_average_gain = (
        sum(
            result["learnloop_learning_gain"]
            for result in results
        ) / count
        if count
        else 0.0
    )

    return {
        "evaluation": {
            "name": "LearnLoop Controlled Learning-Gain Benchmark",
            "scenario_count": count,
            "controlled_simulation": True,
            "real_user_outcomes": False,
        },
        "metrics": {
            "baseline_average_gain": round(
                baseline_average_gain,
                3,
            ),
            "learnloop_average_gain": round(
                learnloop_average_gain,
                3,
            ),
            "average_gain_difference": round(
                learnloop_average_gain
                - baseline_average_gain,
                3,
            ),
        },
        "results": results,
    }