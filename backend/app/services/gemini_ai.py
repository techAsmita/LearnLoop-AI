"""
Gemini integration with structured JSON output.
Falls back gracefully when API key is missing or call fails.
"""
import json
import re
from typing import Optional, Dict, Any, List
import google.generativeai as genai
from ..config import settings
from .mock_ai import mock_diagnose, mock_generate_intervention
from .learner_model import select_intervention_type, build_why_this_next


def _configure():
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)


def _extract_json(text: str) -> Optional[dict]:
    """Best-effort extraction of a JSON object from model output."""
    text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Look for ```json ... ```
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Look for first { ... }
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    return None


DIAGNOSIS_PROMPT = """You are an expert AI/ML tutor diagnosing a learner's understanding.

Concept: {concept_name}
Concept description: {concept_description}
Diagnostic question: {question}
Correct answer (for your reference only): {correct_answer}
Common misconceptions for this concept: {misconceptions}

Learner answer: {answer}
Learner reasoning (may be empty): {reasoning}
Learner self-reported confidence (0-1): {confidence}
Current estimated mastery (0-1): {current_mastery}

Respond with ONLY a valid JSON object (no markdown, no extra text) matching this schema exactly:
{{
  "concept": "{concept_name}",
  "correctness": true or false,
  "reasoning_summary": "brief summary of the learner's thinking",
  "misconception_detected": true or false,
  "misconception": "specific misconception or null",
  "misconception_confidence": 0.0 to 1.0,
  "mastery_estimate": 0.0 to 1.0,
  "recommended_intervention_type": "explanation" or "example" or "practice" or "reinforcement",
  "reason": "one or two sentences explaining why this intervention was chosen"
}}

Rules:
- Be precise about misconceptions. Only flag one if evidence is reasonably strong.
- recommended_intervention_type must be one of the four allowed values.
- If the learner is correct but low-confidence, prefer "reinforcement".
- If high-confidence + wrong + clear misconception, prefer "example" or "explanation".
"""


INTERVENTION_PROMPT = """You are an expert AI/ML tutor generating a short, targeted intervention.

Concept: {concept_name}
Description: {concept_description}
Intervention type requested: {intervention_type}
Misconception to address (may be null): {misconception}
Was the learner's previous answer correct? {is_correct}

Write a clear, concise intervention (150-300 words) that a student can read and act on immediately.
Use markdown for light formatting (bold, bullet points).
Do not mention that you are an AI. Speak directly to the learner.
Return ONLY the intervention text, no JSON wrapper.
"""


async def diagnose_with_gemini(
    concept_id: str,
    concept_name: str,
    concept_description: str,
    question: str,
    correct_answer: str,
    common_misconceptions: List[str],
    answer: str,
    reasoning: Optional[str],
    confidence: float,
    current_mastery: float,
) -> Dict[str, Any]:
    """Call Gemini for structured diagnosis. Raises on failure so caller can fall back."""
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("No GEMINI_API_KEY")

    _configure()
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    prompt = DIAGNOSIS_PROMPT.format(
        concept_name=concept_name,
        concept_description=concept_description or "",
        question=question,
        correct_answer=correct_answer,
        misconceptions=json.dumps(common_misconceptions),
        answer=answer,
        reasoning=reasoning or "(none provided)",
        confidence=confidence,
        current_mastery=current_mastery,
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.2,
            max_output_tokens=800,
        ),
    )
    text = response.text
    data = _extract_json(text)
    if not data:
        raise ValueError("Could not parse JSON from Gemini response")

    # Validate required fields
    required = [
        "correctness", "reasoning_summary", "misconception_detected",
        "recommended_intervention_type", "reason"
    ]
    for key in required:
        if key not in data:
            raise ValueError(f"Missing key in Gemini response: {key}")

    # Normalise
    data["concept"] = concept_name
    data["misconception_confidence"] = float(data.get("misconception_confidence") or 0.0)
    data["mastery_estimate"] = float(data.get("mastery_estimate") or current_mastery)
    data["mock_mode"] = False

    # Ensure intervention type is valid
    allowed = {"explanation", "example", "practice", "reinforcement"}
    if data["recommended_intervention_type"] not in allowed:
        data["recommended_intervention_type"] = select_intervention_type(
            is_correct=bool(data["correctness"]),
            confidence=confidence,
            misconception_detected=bool(data.get("misconception_detected")),
            current_mastery=current_mastery,
        )

    return data


async def generate_intervention_with_gemini(
    concept_name: str,
    concept_description: str,
    intervention_type: str,
    misconception: Optional[str],
    is_correct: bool,
) -> str:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError("No GEMINI_API_KEY")

    _configure()
    model = genai.GenerativeModel(settings.GEMINI_MODEL)

    prompt = INTERVENTION_PROMPT.format(
        concept_name=concept_name,
        concept_description=concept_description or "",
        intervention_type=intervention_type,
        misconception=misconception or "None",
        is_correct=is_correct,
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            temperature=0.4,
            max_output_tokens=600,
        ),
    )
    return response.text.strip()
