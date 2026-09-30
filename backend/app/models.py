from sqlalchemy import (
    Column, String, Float, Integer, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from .database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Learner(Base):
    __tablename__ = "learners"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, default="Learner")
    goal = Column(String, default="Learn AI/ML fundamentals")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    concept_states = relationship("LearnerConceptState", back_populates="learner")
    sessions = relationship("LearningSession", back_populates="learner")
    attempts = relationship("Attempt", back_populates="learner")
    interventions = relationship("Intervention", back_populates="learner")


class Concept(Base):
    __tablename__ = "concepts"

    id = Column(String, primary_key=True)  # e.g. "overfitting"
    name = Column(String, nullable=False)
    description = Column(Text)
    difficulty = Column(String, default="beginner")  # beginner | intermediate | advanced
    diagnostic_question = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    common_misconceptions = Column(JSON, default=list)  # list of strings
    reassessment_question = Column(Text)
    reassessment_answer = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    concept_states = relationship("LearnerConceptState", back_populates="concept")


class LearnerConceptState(Base):
    __tablename__ = "learner_concept_states"

    id = Column(String, primary_key=True, default=generate_uuid)
    learner_id = Column(String, ForeignKey("learners.id"), nullable=False)
    concept_id = Column(String, ForeignKey("concepts.id"), nullable=False)

    mastery = Column(Float, default=0.3)  # 0.0 – 1.0
    confidence = Column(Float, default=0.5)  # last reported confidence
    active_misconceptions = Column(JSON, default=list)  # list of strings
    attempt_count = Column(Integer, default=0)
    last_intervention_type = Column(String, nullable=True)
    history = Column(JSON, default=list)  # list of event dicts

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    learner = relationship("Learner", back_populates="concept_states")
    concept = relationship("Concept", back_populates="concept_states")


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    learner_id = Column(String, ForeignKey("learners.id"), nullable=False)
    concept_id = Column(String, ForeignKey("concepts.id"), nullable=False)
    status = Column(String, default="active")  # active | completed
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    learner = relationship("Learner", back_populates="sessions")
    attempts = relationship("Attempt", back_populates="session")
    interventions = relationship("Intervention", back_populates="session")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String, primary_key=True, default=generate_uuid)
    learner_id = Column(String, ForeignKey("learners.id"), nullable=False)
    session_id = Column(String, ForeignKey("learning_sessions.id"), nullable=False)
    concept_id = Column(String, ForeignKey("concepts.id"), nullable=False)

    question_type = Column(String)  # diagnostic | reassessment
    answer = Column(Text)
    reasoning = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    learner = relationship("Learner", back_populates="attempts")
    session = relationship("LearningSession", back_populates="attempts")


class Intervention(Base):
    __tablename__ = "interventions"

    id = Column(String, primary_key=True, default=generate_uuid)
    learner_id = Column(String, ForeignKey("learners.id"), nullable=False)
    session_id = Column(String, ForeignKey("learning_sessions.id"), nullable=False)
    concept_id = Column(String, ForeignKey("concepts.id"), nullable=False)

    intervention_type = Column(String)  # explanation | example | practice | reinforcement
    content = Column(Text)
    reason = Column(Text)  # why this intervention was chosen
    misconception_targeted = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    learner = relationship("Learner", back_populates="interventions")
    session = relationship("LearningSession", back_populates="interventions")
