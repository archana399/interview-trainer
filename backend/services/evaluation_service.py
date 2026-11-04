"""
services/evaluation_service.py — Answer evaluation using IBM Granite LLM + RAG context.
Returns score (0-10), feedback, and improvement suggestion for each answer.
"""

import json
import logging
import re

from services.llm_service import get_llm
from services.rag_service import search_resume, search_kb

logger = logging.getLogger(__name__)

_EVAL_PROMPT = """\
You are a professional interview coach evaluating a candidate's answer.

Interview Question ({question_type}):
{question_text}

Candidate's Answer:
{answer_text}

Relevant Resume Context:
{resume_context}

Relevant Interview Knowledge:
{kb_context}

Evaluate the answer critically and fairly. Consider:
- Relevance and completeness of the answer
- Use of specific examples and concrete details
- Communication clarity and structure
- Alignment with the candidate's background (from resume context)
- Best practices for this type of question (from knowledge context)

Return ONLY valid JSON — no extra text, no markdown, no code fences. Use exactly this structure:
{{
  "score": <integer 0-10>,
  "feedback": "<2-3 sentences of specific feedback on what was done well and what was lacking>",
  "improvement": "<1-2 actionable sentences on how to improve this specific answer>"
}}

Scoring guide:
- 9-10: Exceptional — specific, structured, quantified, demonstrates mastery
- 7-8: Good — solid answer with minor gaps in detail or structure
- 5-6: Adequate — addresses the question but lacks depth or examples
- 3-4: Weak — vague, off-topic, or missing key components
- 0-2: Very poor — non-answer, completely off-topic, or single-word response

Output only the JSON object. Nothing else.
"""


def _parse_eval_json(raw: str) -> dict:
    """Extract and parse evaluation JSON from LLM output."""
    raw = re.sub(r"```(?:json)?", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse evaluation JSON from LLM response: {raw[:300]}")


def _clamp_score(score) -> float:
    """Ensure score is a float in [0, 10]."""
    try:
        s = float(score)
    except (TypeError, ValueError):
        s = 5.0
    return max(0.0, min(10.0, s))


def evaluate_answer(
    session_id: str,
    question_text: str,
    question_type: str,
    answer_text: str,
) -> dict:
    """
    Evaluate a candidate's answer using RAG + LLM.

    Returns dict with keys: score (float 0-10), feedback (str), improvement (str).
    """
    # RAG retrieval
    query = f"{question_text} {answer_text}"
    resume_chunks = search_resume(session_id, query, k=3)
    kb_chunks = search_kb(f"{question_type} interview {question_text}", k=3)

    resume_context = "\n\n".join(resume_chunks) if resume_chunks else "No resume context available."
    kb_context = "\n\n".join(kb_chunks) if kb_chunks else "No knowledge base context available."

    prompt = _EVAL_PROMPT.format(
        question_type=question_type,
        question_text=question_text,
        answer_text=answer_text[:1500],
        resume_context=resume_context[:800],
        kb_context=kb_context[:800],
    )

    last_exc: Exception | None = None
    for attempt in range(1, 3):
        try:
            raw = get_llm().invoke(prompt)
            data = _parse_eval_json(raw)
            return {
                "score": _clamp_score(data.get("score", 5)),
                "feedback": str(data.get("feedback", "Feedback not available.")),
                "improvement": str(data.get("improvement", "No improvement suggestion available.")),
            }
        except Exception as exc:
            last_exc = exc
            logger.warning(f"[evaluation] Attempt {attempt} failed: {exc}")

    logger.error(f"[evaluation] All attempts failed: {last_exc}")
    return {
        "score": 5.0,
        "feedback": "Evaluation failed due to a temporary error. Score is neutral.",
        "improvement": "Please retry for a more detailed evaluation.",
    }
