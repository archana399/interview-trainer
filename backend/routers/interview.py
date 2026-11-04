"""
routers/interview.py — Interview session endpoints.

POST /api/interview/start  — generate 5 questions, persist to SQLite, return first.
POST /api/interview/answer — evaluate answer, persist results, return next question.
POST /api/interview/end    — compute overall_score, mark completed, return full summary.
"""

import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import InterviewSession, InterviewQuestion
from models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewEndRequest,
    InterviewEndResponse,
    QuestionOut,
    QuestionWithAnswer,
)
from routers._interview_end import compute_end_response
from services.question_service import generate_questions
from services.evaluation_service import evaluate_answer

router = APIRouter()


def _get_session_or_404(session_id: str, db: Session) -> InterviewSession:
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
    return db_session


@router.post("/interview/start", response_model=InterviewStartResponse)
def start_interview(payload: InterviewStartRequest, db: Session = Depends(get_db)):
    db_session = _get_session_or_404(payload.session_id, db)

    # ── Guard: don't re-generate if questions already exist ──────────────────
    existing_questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == payload.session_id)
        .order_by(InterviewQuestion.question_order)
        .all()
    )
    if existing_questions:
        first_q = existing_questions[0]
        return InterviewStartResponse(
            interview_id=payload.session_id,
            first_question=QuestionOut(
                id=first_q.id,
                text=first_q.question_text,
                type=first_q.question_type,
            ),
        )

    # ── Validate required profile data ────────────────────────────────────────
    if not db_session.target_role:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": "Profile not yet analyzed. Call POST /api/profile/analyze first.",
                "code": "PROFILE_NOT_ANALYZED",
            },
        )

    # ── Generate 5 questions ──────────────────────────────────────────────────
    try:
        questions = generate_questions(
            session_id=payload.session_id,
            target_role=db_session.target_role,
            interview_type=db_session.interview_type or "mixed",
            profile_summary=db_session.profile_summary or "",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": True,
                "message": f"Question generation failed: {exc}",
                "code": "QUESTION_GENERATION_FAILED",
            },
        ) from exc

    # ── Persist to SQLite ─────────────────────────────────────────────────────
    db_questions = []
    for order, q in enumerate(questions, start=1):
        db_q = InterviewQuestion(
            id=str(uuid.uuid4()),
            session_id=payload.session_id,
            question_text=q["question"],
            question_type=q["type"],
            question_order=order,
        )
        db.add(db_q)
        db_questions.append(db_q)

    db.commit()
    for q in db_questions:
        db.refresh(q)

    first = db_questions[0]
    return InterviewStartResponse(
        interview_id=payload.session_id,
        first_question=QuestionOut(
            id=first.id,
            text=first.question_text,
            type=first.question_type,
        ),
    )


@router.post("/interview/answer", response_model=InterviewAnswerResponse)
def submit_answer(payload: InterviewAnswerRequest, db: Session = Depends(get_db)):
    # ── Validate session ──────────────────────────────────────────────────────
    _get_session_or_404(payload.session_id, db)

    # ── Validate non-empty answer ─────────────────────────────────────────────
    if not payload.answer_text or not payload.answer_text.strip():
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": "answer_text must not be empty.",
                "code": "EMPTY_ANSWER",
            },
        )

    # ── Fetch and verify the question belongs to this session ─────────────────
    db_question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == payload.question_id,
        InterviewQuestion.session_id == payload.session_id,
    ).first()
    if not db_question:
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "message": f"Question '{payload.question_id}' not found in this session.",
                "code": "QUESTION_NOT_FOUND",
            },
        )

    # ── Evaluate answer via LLM ───────────────────────────────────────────────
    try:
        result = evaluate_answer(
            session_id=payload.session_id,
            question_text=db_question.question_text,
            question_type=db_question.question_type,
            answer_text=payload.answer_text.strip(),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": True,
                "message": f"Answer evaluation failed: {exc}",
                "code": "EVALUATION_FAILED",
            },
        ) from exc

    # ── Persist evaluation results ────────────────────────────────────────────
    db_question.answer_text = payload.answer_text.strip()
    db_question.score = result["score"]
    db_question.feedback = result["feedback"]
    db_question.improvement = result["improvement"]
    db.commit()

    # ── Determine next unanswered question ────────────────────────────────────
    next_question_row = (
        db.query(InterviewQuestion)
        .filter(
            InterviewQuestion.session_id == payload.session_id,
            InterviewQuestion.answer_text == None,  # noqa: E711
        )
        .order_by(InterviewQuestion.question_order)
        .first()
    )

    next_question = None
    if next_question_row:
        next_question = QuestionOut(
            id=next_question_row.id,
            text=next_question_row.question_text,
            type=next_question_row.question_type,
        )

    # ── Auto-complete on last answer ──────────────────────────────────────────
    session_result = None
    if next_question is None:
        session_result = compute_end_response(payload.session_id, db)

    return InterviewAnswerResponse(
        score=result["score"],
        feedback=result["feedback"],
        improvement=result["improvement"],
        next_question=next_question,
        session_result=session_result,
    )


@router.post("/interview/end", response_model=InterviewEndResponse)
def end_interview(payload: InterviewEndRequest, db: Session = Depends(get_db)):
    _get_session_or_404(payload.session_id, db)

    # Verify questions exist
    has_questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == payload.session_id)
        .first()
    )
    if not has_questions:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": "No questions found for this session. Start the interview first.",
                "code": "NO_QUESTIONS",
            },
        )

    return compute_end_response(payload.session_id, db)
