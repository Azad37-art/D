from typing import List, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.documents import Document

from langsmith import traceable

from app.config import GEMINI_API_KEY, GEMINI_MODEL


SYSTEM_PROMPT = """
You are DocuMind AI, a clear and concise document assistant.

Answer the latest user question using the retrieved document context.

ANSWER STYLE:
- Keep answers short and simple by default.
- Usually answer in 3 to 6 sentences.
- Prefer less than 120 words unless the user asks for details.
- Give the direct answer first.
- Present information in a clear logical order.
- Do not repeat the same information.
- Do not add unnecessary introductions or conclusions.
- Use short paragraphs.
- Use bullet points only when there are multiple distinct items.
- Use numbered steps only when explaining a process.
- Use simple Markdown.
- Use bold text only for important words or short headings.
- Do not create too many headings.

STRICT RULES:
- Use ONLY the retrieved document context for document facts.
- Use conversation history only to understand follow-up questions.
- Never invent facts, names, dates, numbers, or details.
- Never mention page numbers in the answer.
- Never mention chunk numbers in the answer.
- References are shown separately in the UI.
- Do not write citations such as "(Page 3)" or "[Chunk 2]".
- If the answer is not found in the context, say:
  "I couldn't find this information in the uploaded document."
- Answer the latest question directly.

Retrieved Document Context:

{context}
"""


REWRITE_PROMPT = """
Rewrite the latest user question into a clear standalone search query.

Use the conversation history only to understand references in the latest question.

Examples:

History:
User: Who is John Smith?
Assistant: John Smith is the project manager.

Latest question:
What is his experience?

Standalone search query:
What is John Smith's experience?

Rules:
- Do not answer the question.
- Return only the rewritten search query.
- Keep the original meaning.
- Preserve important names and topics.
- If the latest question is already standalone, return it unchanged.
"""


@traceable(name="Prepare Conversation History")
def prepare_chat_history(
    chat_history: List[Dict[str, Any]] | None,
    max_messages: int = 10,
):
    if not chat_history:
        return []

    recent_messages = chat_history[-max_messages:]
    messages = []

    for message in recent_messages:
        role = message.get("role")
        content = str(message.get("content", "")).strip()

        if not content:
            continue

        if role == "user":
            messages.append(HumanMessage(content=content))

        elif role == "assistant":
            messages.append(AIMessage(content=content))

    return messages


@traceable(name="Initialize Gemini LLM")
def get_llm(streaming: bool = False):
    return ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        google_api_key=GEMINI_API_KEY,
        temperature=0.2,
        streaming=streaming,
    )


@traceable(name="Check Small Talk")
def is_small_talk(question: str):
    q = question.lower().strip()

    greetings = {
        "hi",
        "hello",
        "hey",
        "hi there",
        "hello there",
        "how are you",
        "who are you",
        "what can you do",
        "thanks",
        "thank you",
    }

    return q in greetings


@traceable(name="Rewrite Follow Up Question")
async def rewrite_follow_up_question(
    question: str,
    history_messages: list,
):
    if not history_messages:
        return question

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", REWRITE_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ]
    )

    llm = get_llm(streaming=False)

    chain = prompt | llm | StrOutputParser()

    standalone_question = await chain.ainvoke(
        {
            "chat_history": history_messages,
            "question": question,
        }
    )

    standalone_question = standalone_question.strip()

    if not standalone_question:
        return question

    return standalone_question


@traceable(name="Retrieve Relevant Document Chunks")
def retrieve_relevant_documents(
    vector_store,
    search_query: str,
):
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 5,
        },
    )

    return retriever.invoke(search_query)


@traceable(name="Format Retrieved Documents")
def format_docs(docs: List[Document]):
    formatted = []

    for index, doc in enumerate(docs, start=1):
        filename = doc.metadata.get("filename", "Unknown document")

        formatted.append(
            f"""
Document: {filename}
Retrieved section: {index}

Content:
{doc.page_content}
""".strip()
        )

    return "\n\n---\n\n".join(formatted)


@traceable(name="Build Document Sources")
def build_sources(docs: List[Document]):
    sources = []
    seen = set()

    for index, doc in enumerate(docs, start=1):
        filename = doc.metadata.get("filename", "Unknown")
        page = doc.metadata.get("page")
        chunk_id = doc.metadata.get("chunk_id", index)

        source_key = (
            filename,
            page,
            chunk_id,
        )

        if source_key in seen:
            continue

        seen.add(source_key)

        snippet = " ".join(doc.page_content.split())

        if len(snippet) > 300:
            snippet = snippet[:300].rstrip() + "..."

        sources.append(
            {
                "chunk_id": chunk_id,
                "page": page,
                "filename": filename,
                "snippet": snippet,
            }
        )

    return sources


@traceable(name="Stream RAG Answer With Memory")
async def stream_answer_question(
    vector_store,
    question: str,
    chat_history: List[Dict[str, Any]] | None = None,
):
    # -----------------------------------------
    # 1. Handle greetings without Gemini
    # -----------------------------------------
    if is_small_talk(question):
        yield {
            "type": "token",
            "content": (
                "Hi! I’m DocuMind AI. Ask me anything about your uploaded "
                "documents. I can summarize, explain, compare, and answer "
                "follow-up questions."
            ),
        }

        yield {
            "type": "sources",
            "sources": [],
        }

        return

    # -----------------------------------------
    # 2. Prepare previous conversation
    # -----------------------------------------
    history_messages = prepare_chat_history(chat_history)

    # -----------------------------------------
    # 3. Rewrite follow-up into search query
    # -----------------------------------------
    search_query = await rewrite_follow_up_question(
        question=question,
        history_messages=history_messages,
    )

    print("ORIGINAL QUESTION:", question)
    print("RETRIEVAL QUERY:", search_query)

    # -----------------------------------------
    # 4. Retrieve relevant FAISS chunks
    # -----------------------------------------
    docs = retrieve_relevant_documents(
        vector_store=vector_store,
        search_query=search_query,
    )

    # -----------------------------------------
    # 5. Handle no retrieved documents
    # -----------------------------------------
    if not docs:
        yield {
            "type": "token",
            "content": "I couldn't find this information in the uploaded document.",
        }

        yield {
            "type": "sources",
            "sources": [],
        }

        return

    # -----------------------------------------
    # 6. Format document context
    # -----------------------------------------
    context = format_docs(docs)

    # -----------------------------------------
    # 7. Create memory-aware answer prompt
    # -----------------------------------------
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}"),
        ]
    )

    # -----------------------------------------
    # 8. Streaming Gemini model
    # -----------------------------------------
    llm = get_llm(streaming=True)

    chain = prompt | llm | StrOutputParser()

    # -----------------------------------------
    # 9. Stream answer tokens
    # -----------------------------------------
    async for token in chain.astream(
        {
            "context": context,
            "chat_history": history_messages,
            "question": question,
        }
    ):
        yield {
            "type": "token",
            "content": token,
        }

    # -----------------------------------------
    # 10. Build frontend references
    # -----------------------------------------
    sources = build_sources(docs)

    yield {
        "type": "sources",
        "sources": sources,
    }