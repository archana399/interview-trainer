"""
models/db_models.py — SQLAlchemy ORM models for interview sessions and questions.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, default=_new_uuid)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    candidate_name = Column(String, nullable=True)
    target_role = Column(String, nullable=True)
    interview_type = Column(String, nullable=True)  # technical / hr / mixed
    resume_text = Column(Text, nullable=True)
    extracted_skills = Column(Text, nullable=True)  # JSON-serialised list
    profile_summary = Column(Text, nullable=True)
    overall_score = Column(Float, nullable=True)
    status = Column(String, default="in_progress", nullable=False)  # in_progress / completed

    questions = relationship(
        "InterviewQuestion",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(String, primary_key=True, default=_new_uuid)
    session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)  # technical / behavioral / hr
    question_order = Column(Integer, nullable=False)
    answer_text = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    improvement = Column(Text, nullable=True)

    session = relationship("InterviewSession", back_populates="questions")
