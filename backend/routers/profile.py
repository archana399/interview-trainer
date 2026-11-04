"""
routers/profile.py — Profile analysis endpoint.

POST /api/profile/analyze — write target_role, interview_type, and profile_summary
                            into the existing interview_sessions row.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import InterviewSession
from models.schemas import ProfileAnalyzeRequest, ProfileAnalyzeResponse

router = APIRouter()

VALID_INTERVIEW_TYPES = {"technical", "hr", "mixed"}


@router.post("/profile/analyze", response_model=ProfileAnalyzeResponse)
def analyze_profile_endpoint(
    payload: ProfileAnalyzeRequest,
    db: Session = Depends(get_db),
):
    # ── Validate session ──────────────────────────────────────────────────────
    db_session = db.query(InterviewSession).filter(
        InterviewSession.id == payload.session_id
    ).first()
    if not db_session:
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "message": f"Session '{payload.session_id}' not found.",
                "code": "SESSION_NOT_FOUND",
            },
        )

    # ── Validate interview_type ───────────────────────────────────────────────
    if payload.interview_type not in VALID_INTERVIEW_TYPES:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": f"interview_type must be one of: {', '.join(VALID_INTERVIEW_TYPES)}",
                "code": "INVALID_INTERVIEW_TYPE",
            },
        )

    # ── Validate target_role ──────────────────────────────────────────────────
    if not payload.target_role.strip():
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": "target_role must not be empty.",
                "code": "INVALID_TARGET_ROLE",
            },
        )

    # ── Build profile summary using already-extracted skills ──────────────────
    # Resume was already analyzed at upload; we build a targeted summary here
    # using the stored resume_text and the newly provided target_role.
    try:
        from services.profile_service import analyze_profile
        profile = analyze_profile(db_session.resume_text or "")
        profile_summary = profile.get("profile_summary", "")
        suggested_topics = profile.get("suggested_topics", [])
        # Merge with target role context
        if payload.target_role:
            profile_summary = (
                f"Candidate targeting {payload.target_role}. " + profile_summary
            )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": True,
                "message": f"Profile analysis failed: {exc}",
                "code": "PROFILE_ANALYSIS_FAILED",
            },
        ) from exc

    # ── Update SQLite session row ─────────────────────────────────────────────
    db_session.target_role = payload.target_role.strip()
    db_session.interview_type = payload.interview_type
    db_session.profile_summary = profile_summary
    # Also update extracted_skills if we got better data now
    if profile.get("extracted_skills"):
        db_session.extracted_skills = json.dumps(profile["extracted_skills"])
    if profile.get("candidate_name") and not db_session.candidate_name:
        db_session.candidate_name = profile["candidate_name"]

    db.commit()

    return ProfileAnalyzeResponse(
        profile_summary=profile_summary,
        suggested_topics=suggested_topics,
    )
