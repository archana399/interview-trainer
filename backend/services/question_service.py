"""
services/question_service.py — RAG-grounded interview question generation using
IBM Granite LLM. Generates exactly 5 questions per session.
"""

import json
import logging
import re

from services.llm_service import get_llm
from services.rag_service import search_resume, search_kb

logger = logging.getLogger(__name__)

_QUESTION_PROMPT = """\
You are an expert technical interviewer. Generate exactly 5 interview questions for a candidate.

Candidate Profile:
{profile_summary}

Target Role: {target_role}
Interview Type: {interview_type}

Relevant Resume Context:
{resume_context}

Relevant Interview Knowledge:
{kb_context}

Interview type guidance:
- technical: focus on technical skills, problem-solving, architecture, coding concepts
- hr: focus on motivation, culture fit, career goals, soft skills, behavioral scenarios
- mixed: 2 technical, 2 behavioral, 1 hr question

Return ONLY valid JSON — no extra text, no markdown, no code fences. Use exactly this structure:
[
  {{"type": "technical", "question": "<question text>"}},
  {{"type": "behavioral", "question": "<question text>"}},
  {{"type": "hr", "question": "<question text>"}},
  {{"type": "technical", "question": "<question text>"}},
  {{"type": "behavioral", "question": "<question text>"}}
]

Rules:
- type must be one of: "technical", "behavioral", "hr"
- Questions must be specific to the candidate's background and target role
- Each question must be a complete, clear sentence
- Generate exactly 5 questions — no more, no less
- Output only the JSON array. Nothing else.
"""


def _parse_questions_json(raw: str) -> list[dict]:
    """Extract and parse question JSON from LLM output."""
    raw = re.sub(r"```(?:json)?", "", raw).strip()

    # Try direct parse
    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Find first [...] block
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse question list from LLM response: {raw[:300]}")


def _validate_and_fix_questions(questions: list[dict]) -> list[dict]:
    """Ensure we have exactly 5 valid question dicts."""
    valid_types = {"technical", "behavioral", "hr"}
    fixed = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        qtype = q.get("type", "behavioral")
        if qtype not in valid_types:
            qtype = "behavioral"
        qtext = q.get("question", "").strip()
        if not qtext:
            continue
        fixed.append({"type": qtype, "question": qtext})

    # Pad if fewer than 5 returned
    fallbacks = [
        {"type": "behavioral", "question": "Tell me about a challenging project you've worked on and what you learned from it."},
        {"type": "hr", "question": "What motivates you in your work and what are you looking for in your next role?"},
        {"type": "technical", "question": "Walk me through how you would approach debugging a performance issue in a production system."},
        {"type": "behavioral", "question": "Describe a time when you had to learn a new technology quickly to meet a deadline."},
        {"type": "hr", "question": "Where do you see yourself professionally in the next 3-5 years?"},
    ]
    while len(fixed) < 5:
        fixed.append(fallbacks[len(fixed) % len(fallbacks)])

    return fixed[:5]


def generate_questions(
    session_id: str,
    target_role: str,
    interview_type: str,
    profile_summary: str,
) -> list[dict]:
    """
    Generate 5 interview questions grounded by resume RAG + knowledge base RAG.

    Returns list of dicts: [{"type": str, "question": str}, ...]
    """
    # RAG retrieval
    resume_chunks = search_resume(session_id, f"{target_role} {profile_summary}", k=4)
    kb_chunks = search_kb(f"{target_role} {interview_type} interview questions", k=3)

    resume_context = "\n\n".join(resume_chunks) if resume_chunks else "No resume context available."
    kb_context = "\n\n".join(kb_chunks) if kb_chunks else "No knowledge base context available."

    prompt = _QUESTION_PROMPT.format(
        profile_summary=profile_summary or "Not available",
        target_role=target_role,
        interview_type=interview_type,
        resume_context=resume_context[:1500],
        kb_context=kb_context[:1000],
    )

    last_exc: Exception | None = None
    for attempt in range(1, 3):
        try:
            raw = get_llm().invoke(prompt)
            questions = _parse_questions_json(raw)
            return _validate_and_fix_questions(questions)
        except Exception as exc:
            last_exc = exc
            logger.warning(f"[questions] Attempt {attempt} failed: {exc}")

    logger.error(f"[questions] All attempts failed: {last_exc}. Using fallback questions.")
    return _validate_and_fix_questions([])
