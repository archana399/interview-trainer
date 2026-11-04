"""
services/profile_service.py — Extract structured candidate profile from resume text
using IBM Granite LLM via langchain-ibm.
"""

import json
import logging
import re

from services.llm_service import get_llm

logger = logging.getLogger(__name__)

_PROFILE_PROMPT = """\
You are an expert resume parser. Extract structured information from the resume text below.

Resume Text:
{resume_text}

Return ONLY valid JSON — no extra text, no markdown, no code fences. Use exactly this structure:
{{
  "candidate_name": "<full name or null>",
  "years_experience": "<e.g. '3 years' or null>",
  "education": "<highest degree and institution or null>",
  "extracted_skills": ["skill1", "skill2", "skill3"],
  "profile_summary": "<2-3 sentence professional summary>",
  "suggested_topics": ["topic1", "topic2", "topic3"]
}}

Rules:
- extracted_skills: list of technical skills, tools, languages from the resume (max 15 items).
- profile_summary: concise overview of the candidate's background relevant for job interviews.
- suggested_topics: 3-5 interview topic areas based on the candidate's experience (e.g. "Python backend development", "REST API design").
- If a field cannot be determined, use null for strings or [] for arrays.
- Output only the JSON object. Nothing else.
"""


def _parse_profile_json(raw: str) -> dict:
    """Extract and parse JSON from LLM output, handling common formatting issues."""
    # Strip markdown code fences if present
    raw = re.sub(r"```(?:json)?", "", raw).strip()

    # Try direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Try to find the first {...} block
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not parse JSON from LLM response: {raw[:200]}")


def analyze_profile(resume_text: str) -> dict:
    """
    Analyze a resume and return extracted profile fields.

    Returns a dict with keys:
      candidate_name, years_experience, education,
      extracted_skills, profile_summary, suggested_topics
    """
    prompt = _PROFILE_PROMPT.format(resume_text=resume_text[:4000])  # cap to avoid token overflow

    last_exc: Exception | None = None
    for attempt in range(1, 3):  # max 2 attempts
        try:
            raw = get_llm().invoke(prompt)
            data = _parse_profile_json(raw)
            # Normalise types
            if not isinstance(data.get("extracted_skills"), list):
                data["extracted_skills"] = []
            if not isinstance(data.get("suggested_topics"), list):
                data["suggested_topics"] = []
            return data
        except Exception as exc:
            last_exc = exc
            logger.warning(f"[profile] Attempt {attempt} failed: {exc}")

    logger.error(f"[profile] All attempts failed: {last_exc}")
    # Return a safe fallback so the session isn't blocked
    return {
        "candidate_name": None,
        "years_experience": None,
        "education": None,
        "extracted_skills": [],
        "profile_summary": "Profile analysis failed. Please retry.",
        "suggested_topics": [],
    }
