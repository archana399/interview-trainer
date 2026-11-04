"""
config.py — Load and validate environment variables from .env.
All services import from this module; never read os.environ directly elsewhere.
"""

import os
from dotenv import load_dotenv

# Resolve .env path relative to this file so it works regardless of the
# working directory uvicorn is launched from.
_ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=_ENV_FILE, override=False)


class Settings:
    """
    Reads credentials from os.environ at *property access* time (not class
    definition time) so that load_dotenv() above always runs first and any
    env-var set after process start is still picked up.
    """

    @property
    def WATSONX_API_KEY(self) -> str:
        return os.environ.get("WATSONX_API_KEY", "")

    @property
    def WATSONX_URL(self) -> str:
        return os.environ.get("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")

    @property
    def WATSONX_PROJECT_ID(self) -> str:
        return os.environ.get("WATSONX_PROJECT_ID", "")

    @property
    def WATSONX_LLM_MODEL_ID(self) -> str:
        return os.environ.get("WATSONX_LLM_MODEL_ID", "ibm/granite-4-h-small")

    @property
    def WATSONX_EMBED_MODEL_ID(self) -> str:
        return os.environ.get(
            "WATSONX_EMBED_MODEL_ID", "ibm/granite-embedding-278m-multilingual"
        )

    # ChromaDB local persistence directory (absolute, relative to this file)
    @property
    def CHROMA_PERSIST_DIR(self) -> str:
        return os.path.join(os.path.dirname(os.path.abspath(__file__)), "chroma_db")

    # SQLite database path (absolute, relative to this file)
    @property
    def SQLITE_DB_PATH(self) -> str:
        return os.path.join(os.path.dirname(os.path.abspath(__file__)), "interview_history.db")

    def required_env_vars_present(self) -> bool:
        """Return True only when all required credentials are set (non-empty)."""
        return bool(self.WATSONX_API_KEY and self.WATSONX_PROJECT_ID and self.WATSONX_URL)

    def missing_env_vars(self) -> list[str]:
        """Return the names of any missing required env vars."""
        missing = []
        if not self.WATSONX_API_KEY:
            missing.append("WATSONX_API_KEY")
        if not self.WATSONX_PROJECT_ID:
            missing.append("WATSONX_PROJECT_ID")
        if not self.WATSONX_URL:
            missing.append("WATSONX_URL")
        return missing


settings = Settings()
