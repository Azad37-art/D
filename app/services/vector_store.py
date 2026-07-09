import json
import shutil
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langsmith import traceable

from app.services.embeddings import get_embeddings


VECTOR_STORES: Dict[str, Any] = {}

FILE_HASH_CACHE: Dict[str, Any] = {}

COMBINED_VECTOR_CACHE: Dict[str, Any] = {
    "version": -1,
    "item": None,
}

STORE_VERSION = 0

STORAGE_DIR = Path("storage/vector_stores")


def ensure_storage_dir():
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def get_document_dir(document_id: str):
    return STORAGE_DIR / document_id


def invalidate_combined_cache():
    global STORE_VERSION

    STORE_VERSION += 1
    COMBINED_VECTOR_CACHE["item"] = None
    COMBINED_VECTOR_CACHE["version"] = -1


def get_documents_from_vector_store(vector_store: FAISS):
    try:
        return list(vector_store.docstore._dict.values())
    except Exception:
        return []


@traceable(name="Save FAISS Vector Store Locally")
def save_vector_store_to_disk(item: Dict[str, Any]):
    ensure_storage_dir()

    document_id = item["document_id"]
    document_dir = get_document_dir(document_id)
    document_dir.mkdir(parents=True, exist_ok=True)

    vector_store = item["vector_store"]
    vector_store.save_local(str(document_dir))

    metadata = {
        "document_id": item["document_id"],
        "filename": item["filename"],
        "chunks": item["chunks"],
        "chunk_size": item.get("chunk_size"),
        "chunk_overlap": item.get("chunk_overlap"),
        "file_hash": item.get("file_hash"),
    }

    metadata_path = document_dir / "metadata.json"

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)


@traceable(name="Load Saved FAISS Vector Stores")
def load_saved_vector_stores():
    ensure_storage_dir()

    embeddings = get_embeddings()
    loaded_count = 0

    for document_dir in STORAGE_DIR.iterdir():
        if not document_dir.is_dir():
            continue

        metadata_path = document_dir / "metadata.json"

        if not metadata_path.exists():
            continue

        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)

            vector_store = FAISS.load_local(
                str(document_dir),
                embeddings,
                allow_dangerous_deserialization=True,
            )

            document_id = metadata["document_id"]
            documents = get_documents_from_vector_store(vector_store)

            item = {
                "document_id": document_id,
                "filename": metadata["filename"],
                "vector_store": vector_store,
                "documents": documents,
                "chunks": metadata.get("chunks", len(documents)),
                "chunk_size": metadata.get("chunk_size"),
                "chunk_overlap": metadata.get("chunk_overlap"),
                "file_hash": metadata.get("file_hash"),
                "cache_hit": False,
            }

            VECTOR_STORES[document_id] = item

            file_hash = item.get("file_hash")
            if file_hash:
                FILE_HASH_CACHE[file_hash] = {
                    "filename": item["filename"],
                    "vector_store": vector_store,
                    "documents": documents,
                    "chunks": item["chunks"],
                    "chunk_size": item["chunk_size"],
                    "chunk_overlap": item["chunk_overlap"],
                    "file_hash": file_hash,
                }

            loaded_count += 1

        except Exception as e:
            print(f"Failed to load vector store {document_dir.name}: {e}")

    invalidate_combined_cache()
    print(f"Loaded {loaded_count} saved vector store(s)")


@traceable(name="Activate Cached Document By Hash")
def activate_cached_document(file_hash: str, filename: str):
    if not file_hash:
        return None

    cached_item = FILE_HASH_CACHE.get(file_hash)

    if not cached_item:
        return None

    document_id = str(uuid.uuid4())

    item = {
        "document_id": document_id,
        "filename": filename,
        "vector_store": cached_item["vector_store"],
        "documents": cached_item["documents"],
        "chunks": cached_item["chunks"],
        "chunk_size": cached_item["chunk_size"],
        "chunk_overlap": cached_item["chunk_overlap"],
        "file_hash": file_hash,
        "cache_hit": True,
    }

    VECTOR_STORES[document_id] = item
    save_vector_store_to_disk(item)
    invalidate_combined_cache()

    return item


@traceable(name="Create FAISS Vector Store")
def create_vector_store(
    filename: str,
    documents: list[Document],
    file_hash: Optional[str] = None,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
):
    document_id = str(uuid.uuid4())

    embeddings = get_embeddings()
    vector_store = FAISS.from_documents(documents, embeddings)

    item = {
        "document_id": document_id,
        "filename": filename,
        "vector_store": vector_store,
        "documents": documents,
        "chunks": len(documents),
        "chunk_size": chunk_size,
        "chunk_overlap": chunk_overlap,
        "file_hash": file_hash,
        "cache_hit": False,
    }

    VECTOR_STORES[document_id] = item

    if file_hash:
        FILE_HASH_CACHE[file_hash] = {
            "filename": filename,
            "vector_store": vector_store,
            "documents": documents,
            "chunks": len(documents),
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap,
            "file_hash": file_hash,
        }

    save_vector_store_to_disk(item)
    invalidate_combined_cache()

    return document_id


@traceable(name="Get FAISS Vector Store")
def get_vector_store(document_id: str):
    return VECTOR_STORES.get(document_id)


@traceable(name="Get All Vector Stores")
def get_all_vector_stores():
    return VECTOR_STORES


@traceable(name="Create Combined Vector Store For All Documents")
def get_combined_vector_store():
    if not VECTOR_STORES:
        return None

    cached_item = COMBINED_VECTOR_CACHE.get("item")
    cached_version = COMBINED_VECTOR_CACHE.get("version")

    if cached_item is not None and cached_version == STORE_VERSION:
        return cached_item

    all_documents: list[Document] = []
    filenames: list[str] = []

    for item in VECTOR_STORES.values():
        filenames.append(item["filename"])

        for doc in item["documents"]:
            doc.metadata["filename"] = item["filename"]
            all_documents.append(doc)

    embeddings = get_embeddings()
    combined_vector_store = FAISS.from_documents(all_documents, embeddings)

    combined_item = {
        "document_id": "all-documents",
        "filename": "All Documents",
        "filenames": filenames,
        "vector_store": combined_vector_store,
        "documents": all_documents,
        "chunks": len(all_documents),
    }

    COMBINED_VECTOR_CACHE["item"] = combined_item
    COMBINED_VECTOR_CACHE["version"] = STORE_VERSION

    return combined_item


@traceable(name="Delete FAISS Vector Store")
def delete_vector_store(document_id: str):
    if document_id in VECTOR_STORES:
        del VECTOR_STORES[document_id]

        document_dir = get_document_dir(document_id)
        if document_dir.exists():
            shutil.rmtree(document_dir)

        invalidate_combined_cache()
        return True

    return False