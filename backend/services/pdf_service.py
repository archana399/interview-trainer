"""
services/pdf_service.py — PDF text extraction using PyPDF.
Handles encrypted/image-only PDFs gracefully.
"""

from io import BytesIO
from pypdf import PdfReader
from fastapi import HTTPException


def extract_text(file_bytes: bytes, filename: str = "resume.pdf") -> str:
    """
    Extract plain text from a PDF byte string.

    Raises HTTPException 422 with code RESUME_PARSE_FAILED if the PDF
    cannot be parsed or yields no readable text (e.g. scanned/image PDFs).
    """
    try:
        reader = PdfReader(BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": "Could not open PDF. Please upload a valid, non-encrypted PDF file.",
                "code": "RESUME_PARSE_FAILED",
            },
        ) from exc

    if reader.is_encrypted:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": "The PDF is encrypted. Please upload an unencrypted text-based PDF.",
                "code": "RESUME_PARSE_FAILED",
            },
        )

    pages_text: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages_text.append(text)

    full_text = "\n".join(pages_text).strip()

    if not full_text:
        raise HTTPException(
            status_code=422,
            detail={
                "error": True,
                "message": "No readable text found. Please upload a text-based PDF (not a scanned image).",
                "code": "RESUME_PARSE_FAILED",
            },
        )

    return full_text
