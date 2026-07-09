from pydantic import BaseModel
from typing import List, Optional, Literal


class ChatRequest(BaseModel):
    question: str
    document_id: Optional[str] = None
    scope: Literal["current", "all"] = "current"


class Source(BaseModel):
    chunk_id: int
    page: Optional[int] = None
    filename: Optional[str] = None
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[Source]