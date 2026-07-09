from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langsmith import traceable


@traceable(name="Choose Chunk Settings")
def get_chunk_settings(total_chars: int, total_pages: int):
    """
    Dynamic chunk strategy based on document size.

    Small:      200-500 chars
    Medium:    500-1000 chars
    Large:     1000-1500 chars
    Very Large 1500-2000 chars
    """

    if total_pages <= 5 or total_chars <= 10_000:
        return 500, 75

    if total_pages <= 50 or total_chars <= 100_000:
        return 1000, 150

    if total_pages <= 150 or total_chars <= 300_000:
        return 1500, 200

    return 2000, 250


@traceable(name="Split Document Into Chunks")
def split_pages_into_documents(pages: list, filename: str):
    total_text = "\n".join([page["text"] for page in pages])
    total_chars = len(total_text)
    total_pages = len(pages)

    chunk_size, chunk_overlap = get_chunk_settings(
        total_chars=total_chars,
        total_pages=total_pages,
    )

    documents = []

    for page in pages:
        text = page["text"].strip()

        if not text:
            continue

        documents.append(
            Document(
                page_content=text,
                metadata={
                    "filename": filename,
                    "page": page["page"],
                },
            )
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=[
            "\n\n",
            "\n",
            ". ",
            "? ",
            "! ",
            "; ",
            ", ",
            " ",
            "",
        ],
    )

    chunks = splitter.split_documents(documents)

    for index, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = index + 1
        chunk.metadata["chunk_size"] = chunk_size
        chunk.metadata["chunk_overlap"] = chunk_overlap

    print("TOTAL CHARS:", total_chars)
    print("TOTAL PAGES:", total_pages)
    print("CHUNK SIZE:", chunk_size)
    print("CHUNK OVERLAP:", chunk_overlap)
    print("TOTAL CHUNKS:", len(chunks))

    return chunks, chunk_size, chunk_overlap