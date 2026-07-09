import hashlib

from fastapi import APIRouter, UploadFile, File, HTTPException
from langsmith import traceable

from app.services.document_loader import extract_text_from_content
from app.services.text_splitter import split_pages_into_documents
from app.services.vector_store import (
    create_vector_store,
    activate_cached_document,
    get_vector_store,
)

router = APIRouter()


def calculate_file_hash(content: bytes):
    return hashlib.sha256(content).hexdigest()


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        content = await file.read()
        file_hash = calculate_file_hash(content)

        cached_item = activate_cached_document(
            file_hash=file_hash,
            filename=file.filename,
        )

        if cached_item:
            print("CACHE HIT:", file.filename)

            return {
                "document_id": cached_item["document_id"],
                "filename": cached_item["filename"],
                "chunks": cached_item["chunks"],
                "chunk_size": cached_item["chunk_size"],
                "chunk_overlap": cached_item["chunk_overlap"],
                "file_hash": file_hash,
                "cached": True,
                "status": "ready",
            }

        print("CACHE MISS:", file.filename)

        pages = extract_text_from_content(
            filename=file.filename,
            content=content,
        )

        documents, chunk_size, chunk_overlap = split_pages_into_documents(
            pages=pages,
            filename=file.filename,
        )

        print("CHUNK SIZE:", chunk_size)
        print("CHUNK OVERLAP:", chunk_overlap)
        print("TOTAL CHUNKS:", len(documents))

        document_id = create_vector_store(
            filename=file.filename,
            documents=documents,
            file_hash=file_hash,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

        item = get_vector_store(document_id)

        return {
            "document_id": document_id,
            "filename": file.filename,
            "chunks": item["chunks"],
            "chunk_size": item["chunk_size"],
            "chunk_overlap": item["chunk_overlap"],
            "file_hash": file_hash,
            "cached": False,
            "status": "ready",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))