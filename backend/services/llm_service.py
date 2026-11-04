"""
services/llm_service.py — IBM Granite LLM and Embeddings via langchain-ibm.

Clients are constructed lazily on first use. Credentials are read from the
Settings instance (which reads os.environ) at construction time, so they
always reflect the values loaded from .env by config.py.
"""

from __future__ import annotations
from langchain_ibm import WatsonxLLM, WatsonxEmbeddings
from config import settings

_embeddings: WatsonxEmbeddings | None = None
_llm: WatsonxLLM | None = None


def _check_credentials() -> None:
    """Raise a clear ValueError if required credentials are missing."""
    missing = settings.missing_env_vars()
    if missing:
        raise ValueError(
            f"Missing required environment variables: {', '.join(missing)}. "
            f"Copy backend/.env.example to backend/.env and fill in the values."
        )


def get_embeddings() -> WatsonxEmbeddings:
    """Return the WatsonxEmbeddings singleton, constructing it on first call."""
    global _embeddings
    if _embeddings is None:
        _check_credentials()
        _embeddings = WatsonxEmbeddings(
            model_id=settings.WATSONX_EMBED_MODEL_ID,
            url=settings.WATSONX_URL,
            apikey=settings.WATSONX_API_KEY,
            project_id=settings.WATSONX_PROJECT_ID,
        )
    return _embeddings


def get_llm() -> WatsonxLLM:
    """Return the WatsonxLLM singleton, constructing it on first call."""
    global _llm
    if _llm is None:
        _check_credentials()
        _llm = WatsonxLLM(
            model_id=settings.WATSONX_LLM_MODEL_ID,
            url=settings.WATSONX_URL,
            apikey=settings.WATSONX_API_KEY,
            project_id=settings.WATSONX_PROJECT_ID,
            params={
                "max_new_tokens": 512,
                "temperature": 0.7,
            },
        )
    return _llm


def test_llm_connection() -> str:
    """Make a minimal generation call to verify credentials. Returns 'ok' or raises."""
    get_llm().invoke("Say hello.")
    return "ok"


def test_embeddings_connection() -> str:
    """Make a minimal embedding call to verify credentials. Returns 'ok' or raises."""
    get_embeddings().embed_query("test")
    return "ok"
