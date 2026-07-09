import os
import tempfile
from pypdf import PdfReader
from docx import Document as DocxDocument
from fastapi import UploadFile
from langsmith import traceable


async def extract_text_from_file(file: UploadFile):
    """
    Old helper kept for compatibility.
    New upload route will use extract_text_from_content().
    """
    content = await file.read()
    return extract_text_from_content(file.filename, content)


def extract_text_from_content(filename: str, content: bytes):
    filename_lower = filename.lower()

    if filename_lower.endswith(".txt"):
        text = content.decode("utf-8", errors="ignore")
        return [
            {
                "page": 1,
                "text": text,
            }
        ]

    suffix = os.path.splitext(filename)[1]

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = temp_file.name

    try:
        temp_file.write(content)
        temp_file.close()

        if filename_lower.endswith(".pdf"):
            return extract_pdf_text(temp_path)

        if filename_lower.endswith(".docx"):
            return extract_docx_text(temp_path)

        raise ValueError("Unsupported file type")

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@traceable(name="Extract PDF Text")
def extract_pdf_text(path: str):
    reader = PdfReader(path)
    pages = []

    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append(
            {
                "page": index + 1,
                "text": text,
            }
        )

    return pages


@traceable(name="Extract DOCX Text")
def extract_docx_text(path: str):
    doc = DocxDocument(path)
    text = "\n".join([p.text for p in doc.paragraphs])

    return [
        {
            "page": 1,
            "text": text,
        }
    ]