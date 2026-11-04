"""
routers/history.py — Interview history endpoints.

GET /api/history              — paginated list of past sessions.
GET /api/history/{session_id} — full session detail with all questions and answers.
"""

import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import InterviewSession, InterviewQuestion
from models.schemas import (
    HistoryListResponse,
    SessionSummary,
    SessionDetail,
    QuestionWithAnswer,
)

router = APIRouter()


@router.get("/history", response_model=HistoryListResponse)
def list_history(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    sessions = (
        db.query(InterviewSession)
        .order_by(InterviewSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return HistoryListResponse(
        sessions=[
            SessionSummary(
                id=s.id,
                created_at=s.created_at,
                target_role=s.target_role,
                overall_score=s.overall_score,
                status=s.status,
            )
            for s in sessions
        ]
    )


@router.get("/history/{session_id}", response_model=SessionDetail)
def get_session_detail(session_id: str, db: Session = Depends(get_db)):
    db_session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id
    ).first()
    if not db_session:
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "message": f"Session '{session_id}' not found.",
                "code": "SESSION_NOT_FOUND",
            },
        )

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == session_id)
        .order_by(InterviewQuestion.question_order)
        .all()
    )

    # Deserialise skills JSON
    skills: list[str] = []
    if db_session.extracted_skills:
        try:
            skills = json.loads(db_session.extracted_skills)
        except (json.JSONDecodeError, TypeError):
            skills = []

    return SessionDetail(
        id=db_session.id,
        created_at=db_session.created_at,
        candidate_name=db_session.candidate_name,
        target_role=db_session.target_role,
        interview_type=db_session.interview_type,
        extracted_skills=skills,
        profile_summary=db_session.profile_summary,
        overall_score=db_session.overall_score,
        status=db_session.status,
        questions=[
            QuestionWithAnswer(
                id=q.id,
                question_text=q.question_text,
                question_type=q.question_type,
                question_order=q.question_order,
                answer_text=q.answer_text,
                score=q.score,
                feedback=q.feedback,
                improvement=q.improvement,
            )
            for q in questions
        ],
    )
