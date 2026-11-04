"""
services/rag_service.py — ChromaDB client, collection management, similarity search,
knowledge-base bootstrap, and resume chunk CRUD.
"""

import os
import logging
from langchain_chroma import Chroma
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
)
from langchain.schema import Document

from config import settings
from services.llm_service import get_embeddings

logger = logging.getLogger(__name__)

# ── Collection names ───────────────────────────────────────────────────────────
RESUME_COLLECTION = "resume_chunks"
KB_COLLECTION = "knowledge_base"

# Path to the knowledge-base text file
_KB_FILE = os.path.join(os.path.dirname(__file__), "..", "knowledge_base", "interview_kb.txt")


# ── Chroma vector store helpers ───────────────────────────────────────────────

def _get_resume_store() -> Chroma:
    """Return a Chroma vector store for resume chunks."""
    return Chroma(
        collection_name=RESUME_COLLECTION,
        embedding_function=get_embeddings(),
        persist_directory=settings.CHROMA_PERSIST_DIR,
    )


def _get_kb_store() -> Chroma:
    """Return a Chroma vector store for the knowledge base."""
    return Chroma(
        collection_name=KB_COLLECTION,
        embedding_function=get_embeddings(),
        persist_directory=settings.CHROMA_PERSIST_DIR,
    )


# ── Knowledge-base bootstrap (called once on startup) ─────────────────────────

def load_knowledge_base() -> None:
    """
    Populate the knowledge_base ChromaDB collection from interview_kb.txt.
    Skips if the collection already contains documents.
    """
    kb_store = _get_kb_store()

    # Check if already populated
    existing = kb_store.get(limit=1)
    if existing and existing.get("ids"):
        logger.info("[rag] Knowledge base already populated — skipping bootstrap.")
        return

    if not os.path.exists(_KB_FILE):
        logger.warning("[rag] interview_kb.txt not found — skipping knowledge base bootstrap.")
        return

    with open(_KB_FILE, "r", encoding="utf-8") as f:
        raw = f.read()

    # Split by section separator (double newline blocks)
    splitter = CharacterTextSplitter(
        separator="\n---\n",
        chunk_size=600,
        chunk_overlap=50,
        length_function=len,
    )
    chunks = splitter.split_text(raw)

    if not chunks:
        logger.warning("[rag] Knowledge base file produced no chunks.")
        return

    # Tag each chunk with metadata
    docs = []
    for i, chunk in enumerate(chunks):
        chunk = chunk.strip()
        if not chunk:
            continue
        # Infer category from chunk content (best effort)
        low = chunk.lower()
        if any(kw in low for kw in ["behavioral", "star", "situation", "tell me about"]):
            category = "behavioral"
        elif any(kw in low for kw in ["salary", "culture", "strengths", "weakness", "hr question"]):
            category = "hr"
        else:
            category = "technical"
        docs.append(
            Document(
                page_content=chunk,
                metadata={"category": category, "topic": f"kb_chunk_{i}"},
            )
        )

    kb_store.add_documents(docs)
    logger.info(f"[rag] Knowledge base bootstrapped with {len(docs)} chunks.")


# ── Resume ingestion ───────────────────────────────────────────────────────────

def ingest_resume(session_id: str, resume_text: str) -> int:
    """
    Chunk and embed resume text, storing all chunks in ChromaDB with session_id metadata.
    Returns the number of chunks stored.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=64,
        length_function=len,
    )
    chunks = splitter.split_text(resume_text)

    docs = [
        Document(
            page_content=chunk,
            metadata={"session_id": session_id, "chunk_index": i, "source": "resume"},
        )
        for i, chunk in enumerate(chunks)
    ]

    store = _get_resume_store()
    store.add_documents(docs)
    logger.info(f"[rag] Ingested {len(docs)} resume chunks for session {session_id}.")
    return len(docs)


# ── Similarity search ──────────────────────────────────────────────────────────

def search_resume(session_id: str, query: str, k: int = 4) -> list[str]:
    """Retrieve top-k resume chunks for a given session_id."""
    store = _get_resume_store()
    results = store.similarity_search(
        query,
        k=k,
        filter={"session_id": session_id},
    )
    return [doc.page_content for doc in results]


def search_kb(query: str, k: int = 3) -> list[str]:
    """Retrieve top-k knowledge-base chunks most relevant to the query."""
    store = _get_kb_store()
    results = store.similarity_search(query, k=k)
    return [doc.page_content for doc in results]


# ── Resume cleanup ─────────────────────────────────────────────────────────────

def delete_resume_chunks(session_id: str) -> None:
    """Delete all ChromaDB resume chunks belonging to a session."""
    store = _get_resume_store()
    # Fetch IDs first, then delete
    existing = store.get(where={"session_id": session_id})
    ids = existing.get("ids", [])
    if ids:
        store.delete(ids=ids)
        logger.info(f"[rag] Deleted {len(ids)} resume chunks for session {session_id}.")
    else:
        logger.info(f"[rag] No resume chunks found for session {session_id}.")
