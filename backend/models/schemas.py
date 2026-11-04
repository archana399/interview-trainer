"""
models/schemas.py — Pydantic schemas for all API request and response bodies.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ── Resume ──────────────────────────────────────────────────────────────────

class ResumeUploadResponse(BaseModel):
    session_id: str
    candidate_name: Optional[str]
    extracted_skills: list[str]
    years_experience: Optional[str]
    education: Optional[str]


class ResumeDeleteResponse(BaseModel):
    deleted: bool


# ── Profile ──────────────────────────────────────────────────────────────────

class ProfileAnalyzeRequest(BaseModel):
    session_id: str
    target_role: str
    interview_type: str  # technical / hr / mixed


class ProfileAnalyzeResponse(BaseModel):
    profile_summary: str
    suggested_topics: list[str]


# ── Interview ─────────────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    id: str
    text: str
    type: str


class InterviewStartRequest(BaseModel):
    session_id: str


class InterviewStartResponse(BaseModel):
    interview_id: str
    first_question: QuestionOut


class InterviewAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer_text: str


class InterviewAnswerResponse(BaseModel):
    score: float
    feedback: str
    improvement: str
    next_question: Optional[QuestionOut]
    # Populated automatically on the final answer (next_question is null)
    session_result: Optional["InterviewEndResponse"] = None


class QuestionWithAnswer(BaseModel):
    id: str
    question_text: str
    question_type: str
    question_order: int
    answer_text: Optional[str]
    score: Optional[float]
    feedback: Optional[str]
    improvement: Optional[str]


class InterviewEndRequest(BaseModel):
    session_id: str


class InterviewEndResponse(BaseModel):
    overall_score: float
    summary: str
    all_questions_with_answers: list[QuestionWithAnswer]


# ── History ───────────────────────────────────────────────────────────────────

class SessionSummary(BaseModel):
    id: str
    created_at: datetime
    target_role: Optional[str]
    overall_score: Optional[float]
    status: str


class HistoryListResponse(BaseModel):
    sessions: list[SessionSummary]


class SessionDetail(BaseModel):
    id: str
    created_at: datetime
    candidate_name: Optional[str]
    target_role: Optional[str]
    interview_type: Optional[str]
    extracted_skills: Optional[list[str]]
    profile_summary: Optional[str]
    overall_score: Optional[float]
    status: str
    questions: list[QuestionWithAnswer]


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    chromadb: str
    env_vars: str


class TestConnectionResponse(BaseModel):
    llm: str
    embeddings: str


# ── Error ─────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: bool = True
    message: str
    code: str
