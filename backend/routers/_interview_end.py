"""
routers/_interview_end.py — Shared helper that computes the end-of-interview
response and persists overall_score + status to SQLite.

Used by both POST /api/interview/answer (auto-complete on last answer)
and POST /api/interview/end (explicit call, idempotent).
"""

from sqlalchemy.orm import Session
from models.db_models import InterviewSession, InterviewQuestion
from models.schemas import InterviewEndResponse, QuestionWithAnswer


def _build_summary(overall_score: float) -> str:
    if overall_score >= 8:
        return (
            f"Excellent performance! Overall score: {overall_score}/10. "
            "You demonstrated strong knowledge and communication skills across all questions."
        )
    if overall_score >= 6:
        return (
            f"Good performance. Overall score: {overall_score}/10. "
            "You showed solid understanding with a few areas to refine."
        )
    if overall_score >= 4:
        return (
            f"Adequate performance. Overall score: {overall_score}/10. "
            "Review the feedback for each question to identify key improvement areas."
        )
    return (
        f"Needs improvement. Overall score: {overall_score}/10. "
        "Focus on the improvement suggestions provided for each question."
    )


def compute_end_response(session_id: str, db: Session) -> InterviewEndResponse:
    """
    Compute overall_score, mark session completed, and return the full
    InterviewEndResponse.  Safe to call multiple times (idempotent).
    """
    db_session = db.query(InterviewSession).filter(
        InterviewSession.id == session_id
    ).first()

    questions = (
        db.query(InterviewQuestion)
        .filter(InterviewQuestion.session_id == session_id)
        .order_by(InterviewQuestion.question_order)
        .all()
    )

    scored = [q for q in questions if q.score is not None]
    overall_score = (
        round(sum(q.score for q in scored) / len(scored), 1) if scored else 0.0
    )

    if db_session:
        db_session.overall_score = overall_score
        db_session.status = "completed"
        db.commit()

    return InterviewEndResponse(
        overall_score=overall_score,
        summary=_build_summary(overall_score),
        all_questions_with_answers=[
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
