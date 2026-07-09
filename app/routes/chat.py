from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

import json

from langsmith import traceable

from app.models.schemas import ChatRequest

from app.services.vector_store import (
    get_vector_store,
    get_combined_vector_store,
)

from app.services.qa_chain import stream_answer_question

from app.services.chat_memory import (
    save_chat_message,
    load_chat_history,
)


router = APIRouter()


@traceable(name="Get Vector Store By Scope")
def get_item_for_scope(request: ChatRequest):
    scope = getattr(request, "scope", "current")
    document_id = getattr(request, "document_id", None)

    # Search every uploaded document
    if scope == "all":
        item = get_combined_vector_store()

        if not item:
            raise HTTPException(
                status_code=404,
                detail="No uploaded documents found",
            )

        return item

    # Search only currently selected document
    if not document_id:
        raise HTTPException(
            status_code=400,
            detail="document_id is required when scope is current",
        )

    item = get_vector_store(document_id)

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return item


@router.post("/chat/stream")
@traceable(name="API Stream Chat Document")
async def chat_with_document_stream(request: ChatRequest):
    item = get_item_for_scope(request)

    memory_document_id = request.document_id or "all-documents"

    async def event_generator():
        full_answer = ""
        final_sources = []

        try:
            # -----------------------------------------
            # 1. Load OLD history before current message
            # -----------------------------------------
            previous_history = load_chat_history(
                memory_document_id
            )

            # -----------------------------------------
            # 2. Save current user question
            # -----------------------------------------
            save_chat_message(
                document_id=memory_document_id,
                role="user",
                content=request.question,
            )

            # -----------------------------------------
            # 3. Generate answer using OLD history
            # -----------------------------------------
            async for chunk in stream_answer_question(
                vector_store=item["vector_store"],
                question=request.question,
                chat_history=previous_history,
            ):
                if chunk.get("type") == "token":
                    full_answer += chunk.get("content", "")

                if chunk.get("type") == "sources":
                    final_sources = chunk.get("sources", [])

                yield f"data: {json.dumps(chunk)}\n\n"

            # -----------------------------------------
            # 4. Save completed assistant answer
            # -----------------------------------------
            if full_answer.strip():
                save_chat_message(
                    document_id=memory_document_id,
                    role="assistant",
                    content=full_answer,
                    references=final_sources,
                )

            yield "data: [DONE]\n\n"

        except Exception as e:
            print("CHAT STREAM ERROR:", str(e))

            error_message = {
                "type": "error",
                "content": str(e),
            }

            yield f"data: {json.dumps(error_message)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )