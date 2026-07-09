from fastapi import APIRouter, HTTPException
from langsmith import traceable

from app.services.vector_store import (
    delete_vector_store,
    get_all_vector_stores,
)
from app.services.chat_memory import (
    load_chat_history,
    delete_chat_history,
)


router = APIRouter()


@router.get("/documents")
@traceable(name="API List Documents")
async def list_documents():
    stores = get_all_vector_stores()

    documents = []

    for document_id, item in stores.items():
        documents.append(
            {
                "document_id": document_id,
                "filename": item.get("filename"),
                "chunks": item.get("chunks", 0),
                "chunk_size": item.get("chunk_size"),
                "chunk_overlap": item.get("chunk_overlap"),
                "file_hash": item.get("file_hash"),
                "status": "ready",
            }
        )

    return {
        "documents": documents,
        "count": len(documents),
    }


@router.get("/documents/{document_id}/messages")
@traceable(name="API Get Document Chat History")
async def get_document_messages(document_id: str):
    stores = get_all_vector_stores()

    if document_id not in stores:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    messages = load_chat_history(document_id)

    return {
        "document_id": document_id,
        "messages": messages,
        "count": len(messages),
    }


@router.delete("/documents/{document_id}/messages")
@traceable(name="API Clear Document Chat History")
async def clear_document_messages(document_id: str):
    delete_chat_history(document_id)

    return {
        "document_id": document_id,
        "message": "Chat history cleared successfully",
    }


@router.delete("/documents/{document_id}")
@traceable(name="API Delete Document")
async def delete_document(document_id: str):
    deleted = delete_vector_store(document_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # Delete saved chat too
    delete_chat_history(document_id)

    return {
        "document_id": document_id,
        "deleted": True,
        "message": "Document and chat history deleted successfully",
    }