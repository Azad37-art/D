from langchain_huggingface import HuggingFaceEmbeddings
from app.config import EMBEDDING_MODEL
from langsmith import traceable

@traceable(name="Split Document Into Chunks")
def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )