"""
Backend tests for LearnLoop AI.
Run with: pytest from the backend directory.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.config import settings

# Force mock mode and in-memory DB for tests
settings.MOCK_MODE = True
settings.GEMINI_API_KEY = None

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_learnloop.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Seed
    from app.seed import seed_concepts
    db = TestingSessionLocal()
    seed_concepts(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["mock_mode"] is True


def test_list_concepts():
    r = client.get("/api/concepts")
    assert r.status_code == 200
    concepts = r.json()
    assert len(concepts) >= 3
    ids = {c["id"] for c in concepts}
    assert "overfitting" in ids


def test_create_learner():
    r = client.post("/api/learners", json={"name": "Test Learner", "goal": "Master overfitting"})
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Test Learner"
    assert "id" in data


def test_full_adaptive_loop_high_conf_misconception():
    """Different learner states must produce different interventions."""
    # Start session with demo scenario
    r = client.post("/api/session/start", json={
        "learner_name": "HighConfUser",
        "concept_id": "overfitting",
        "demo_scenario": "high_conf_misconception",
    })
    assert r.status_code == 200
    start = r.json()
    session_id = start["session_id"]
    learner_id = start["learner_id"]
    assert start["mock_mode"] is True
    assert start["initial_mastery"] == pytest.approx(0.42, abs=0.01)

    # Diagnose — high confidence wrong answer
    r = client.post("/api/diagnose", json={
        "session_id": session_id,
        "learner_id": learner_id,
        "concept_id": "overfitting",
        "answer": "The model is excellent because training accuracy is 98%. That means it generalises.",
        "reasoning": "Training accuracy is the best measure of model quality.",
        "confidence": 0.85,
    })
    assert r.status_code == 200
    diag = r.json()
    assert diag["diagnosis"]["mock_mode"] is True
    assert diag["diagnosis"]["misconception_detected"] is True
    assert diag["diagnosis"]["recommended_intervention_type"] in ("targeted_misconception", "guided_example", "foundational_explanation", "example", "explanation")
    assert "misconception" in diag["why_this_next"].lower() or "training" in diag["why_this_next"].lower()

    # Intervention
    r = client.post("/api/intervention", json={
        "session_id": session_id,
        "learner_id": learner_id,
        "concept_id": "overfitting",
        "intervention_type": diag["diagnosis"]["recommended_intervention_type"],
    })
    assert r.status_code == 200
    interv = r.json()
    assert interv["intervention_type"] in ("targeted_misconception", "guided_example", "foundational_explanation", "example", "explanation", "reinforcement", "practice_challenge")
    assert len(interv["content"]) > 50

    # Reassess
    r = client.post("/api/reassess", json={
        "session_id": session_id,
        "learner_id": learner_id,
        "concept_id": "overfitting",
        "answer": "False. High training accuracy with low test accuracy means overfitting; generalisation requires good performance on unseen data.",
        "confidence": 0.80,
    })
    assert r.status_code == 200
    re = r.json()
    assert re["new_mastery"] > re["previous_mastery"]
    assert re["mastery_delta"] > 0


def test_different_state_different_intervention():
    """Core differentiator: low-confidence correct → reinforcement."""
    r = client.post("/api/session/start", json={
        "learner_name": "LowConfUser",
        "concept_id": "overfitting",
        "demo_scenario": "low_conf_correct",
    })
    assert r.status_code == 200
    start = r.json()
    session_id = start["session_id"]
    learner_id = start["learner_id"]

    r = client.post("/api/diagnose", json={
        "session_id": session_id,
        "learner_id": learner_id,
        "concept_id": "overfitting",
        "answer": "The model is overfitting because train accuracy is high but test is low. It memorised the data.",
        "reasoning": "I think this is right but I'm not very confident.",
        "confidence": 0.25,
    })
    assert r.status_code == 200
    diag = r.json()
    # Should recommend reinforcement for correct + low confidence
    assert diag["diagnosis"]["recommended_intervention_type"] in ("reinforcement",)
    assert "confidence" in diag["why_this_next"].lower() or "reinforcement" in diag["why_this_next"].lower()


def test_learner_state_persistence():
    r = client.post("/api/session/start", json={
        "learner_name": "PersistUser",
        "concept_id": "bias_variance",
    })
    start = r.json()
    learner_id = start["learner_id"]

    r = client.get(f"/api/learners/{learner_id}")
    assert r.status_code == 200
    state = r.json()
    assert state["learner_id"] == learner_id
    assert len(state["concept_states"]) >= 1


def test_mastery_update_deterministic():
    from app.services.learner_model import update_mastery
    # Correct high confidence
    m1 = update_mastery(0.4, is_correct=True, confidence=0.9, misconception_detected=False)
    assert m1 > 0.4
    # Incorrect high confidence + misconception
    m2 = update_mastery(0.4, is_correct=False, confidence=0.9, misconception_detected=True)
    assert m2 < 0.4
    # Bounds
    assert update_mastery(0.95, True, 1.0, False) <= 1.0
    assert update_mastery(0.05, False, 1.0, True) >= 0.0
