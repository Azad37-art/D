import json
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
from langsmith import traceable

CHAT_HISTORY_DIR = Path("storage/chat_history")


def ensure_chat_history_dir():
    CHAT_HISTORY_DIR.mkdir(parents=True, exist_ok=True)


def get_chat_file_path(document_id: str):
    ensure_chat_history_dir()
    return CHAT_HISTORY_DIR / f"{document_id}.json"


@traceable(name="Load Chat History")
def load_chat_history(document_id: str) -> List[Dict[str, Any]]:
    path = get_chat_file_path(document_id)

    if not path.exists():
        return []

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


@traceable(name="Save Chat Message")
def save_chat_message(
    document_id: str,
    role: str,
    content: str,
    references: list | None = None,
):
    messages = load_chat_history(document_id)

    messages.append(
        {
            "id": f"{role}-{datetime.utcnow().timestamp()}",
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "references": references or [],
        }
    )

    path = get_chat_file_path(document_id)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2, ensure_ascii=False)

    return messages


@traceable(name="Delete Chat History")
def delete_chat_history(document_id: str):
    path = get_chat_file_path(document_id)

    if path.exists():
        path.unlink()
        return True

    return False