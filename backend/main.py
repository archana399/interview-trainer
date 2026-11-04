"""
main.py — FastAPI application entry point.

Registers:
  - CORS middleware (allow localhost:5173)
  - All API routers
  - Startup event: create SQLite tables, bootstrap ChromaDB knowledge base
  - GET /api/health    — lightweight check, no watsonx.ai API call
  - POST /api/admin/test-connection — live credential verification (run once manually)
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base

# Import all ORM models so Base knows about them before create_all()
import models.db_models  # noqa: F401

from models.schemas import HealthResponse, TestConnectionResponse, ErrorResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables and bootstrap knowledge base."""
    # Create SQLite tables
    Base.metadata.create_all(bind=engine)

    # Bootstrap ChromaDB knowledge base (only embeds if collection is empty)
    try:
        from services.rag_service import load_knowledge_base
        load_knowledge_base()
    except Exception as exc:
        print(f"[startup] Knowledge base bootstrap skipped: {exc}")

    yield
    # Shutdown — nothing to clean up


app = FastAPI(title="Interview Trainer API", version="1.0.0", lifespan=lifespan)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers (registered after Phase implementations) ─────────────────────────
# routers are imported here once they exist; placeholder imports below are
# guarded so the server still starts during Phase 1.
try:
    from routers.resume import router as resume_router
    app.include_router(resume_router, prefix="/api")
except ImportError:
    pass

try:
    from routers.profile import router as profile_router
    app.include_router(profile_router, prefix="/api")
except ImportError:
    pass

try:
    from routers.interview import router as interview_router
    app.include_router(interview_router, prefix="/api")
except ImportError:
    pass

try:
    from routers.history import router as history_router
    app.include_router(history_router, prefix="/api")
except ImportError:
    pass


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
def health():
    """Lightweight health check — no watsonx.ai API call."""
    # Check env vars
    env_status = "ok" if settings.required_env_vars_present() else "missing: " + ", ".join(settings.missing_env_vars())

    # Check ChromaDB connectivity
    chroma_status = "ok"
    try:
        import chromadb
        client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        client.heartbeat()
    except Exception as exc:
        chroma_status = f"error: {exc}"

    return HealthResponse(status="ok", chromadb=chroma_status, env_vars=env_status)


# ── Admin: live credential test (run once manually, never poll) ───────────────

@app.post("/api/admin/test-connection", response_model=TestConnectionResponse)
def test_connection():
    """Verify IBM watsonx.ai credentials with a minimal live call. Run manually once."""
    from services.llm_service import test_llm_connection, test_embeddings_connection

    llm_status = "error"
    embed_status = "error"

    try:
        llm_status = test_llm_connection()
    except Exception as exc:
        llm_status = f"error: {exc}"

    try:
        embed_status = test_embeddings_connection()
    except Exception as exc:
        embed_status = f"error: {exc}"

    return TestConnectionResponse(llm=llm_status, embeddings=embed_status)
