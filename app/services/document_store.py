from typing import Dict, Any
import uuid

DOCUMENTS: Dict[str, Any] = {}


def save_document(filename: str, chunks: list):
    document_id = str(uuid.uuid4())

    DOCUMENTS[document_id] = {
        "filename": filename,
        "chunks": chunks,
    }

    return document_id


def get_document(document_id: str):
    return DOCUMENTS.get(document_id)