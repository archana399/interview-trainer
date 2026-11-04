"""
routers/resume.py — Resume upload and delete endpoints.

POST /api/resume/upload  — parse PDF, embed chunks, create SQLite session row.
DELETE /api/resume/{session_id} — remove ChromaDB chunks + SQLite session + questions.
"""

import json
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.db_models import InterviewSession
from models.schemas import ResumeUploadResponse, ResumeDeleteResponse
from services.pdf_service import extract_text
from services.rag_service import ingest_resume, delete_resume_chunks
from services.profile_service import analyze_profile

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/resume/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # ── Validate file type ────────────────────────────────────────────────────
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=415,
            detail={
                "error": True,
                "message": "Only PDF files are accepted. Please upload a .pdf file.",
                "code": "INVALID_FILE_TYPE",
            },
        )

    # ── Read and validate size ────────────────────────────────────────────────
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail={
                "error": True,
                "message": f"File too large. Maximum allowed size is 10 MB.",
                "code": "FILE_TOO_LARGE",
            },
        )

    # ── Extract text ──────────────────────────────────────────────────────────
    resume_text = extract_text(file_bytes, file.filename)

    # ── Analyze profile via LLM ───────────────────────────────────────────────
    try:
        profile = analyze_profile(resume_text)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "error": True,
                "message": f"Profile analysis failed: {exc}",
                "code": "PROFILE_ANALYSIS_FAILED",
            },
        ) from exc

    # ── Create SQLite session row ─────────────────────────────────────────────
    session_id = str(uuid.uuid4())
    skills_json = json.dumps(profile.get("extracted_skills", []))

    db_session = InterviewSession(
        id=session_id,
        candidate_name=profile.get("candidate_name"),
        resume_text=resume_text,
        extracted_skills=skills_json,
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)

    # ── Embed resume chunks into ChromaDB ─────────────────────────────────────
    try:
        ingest_resume(session_id, resume_text)
    except Exception as exc:
        # Roll back the session row if embedding fails
        db.delete(db_session)
        db.commit()
        raise HTTPException(
            status_code=502,
            detail={
                "error": True,
                "message": f"Resume embedding failed: {exc}",
                "code": "EMBEDDING_FAILED",
            },
        ) from exc

    return ResumeUploadResponse(
        session_id=session_id,
        candidate_name=profile.get("candidate_name"),
        extracted_skills=profile.get("extracted_skills", []),
        years_experience=profile.get("years_experience"),
        education=profile.get("education"),
    )


@router.delete("/resume/{session_id}", response_model=ResumeDeleteResponse)
def delete_resume(session_id: str, db: Session = Depends(get_db)):
    # ── Verify session exists ─────────────────────────────────────────────────
    db_session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not db_session:
        raise HTTPException(
            status_code=404,
            detail={
                "error": True,
                "message": f"Session '{session_id}' not found.",
                "code": "SESSION_NOT_FOUND",
            },
        )

    # ── Delete ChromaDB resume chunks ─────────────────────────────────────────
    try:
        delete_resume_chunks(session_id)
    except Exception:
        pass  # Best-effort; proceed with SQLite deletion

    # ── Delete SQLite session (cascade deletes questions) ─────────────────────
    db.delete(db_session)
    db.commit()

    return ResumeDeleteResponse(deleted=True)
