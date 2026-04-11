from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any

_RUNTIME_DIR = Path(__file__).resolve().parent.parent / ".runtime"
_STORE_PATH = _RUNTIME_DIR / "context_sources.json"


def _load_sources_from_disk() -> dict[str, dict[str, Any]]:
    if not _STORE_PATH.exists():
        return {}

    try:
        raw = json.loads(_STORE_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return {}

    if not isinstance(raw, dict):
        return {}

    return {
        str(source_id): record
        for source_id, record in raw.items()
        if isinstance(record, dict)
    }


def _persist_sources() -> None:
    _RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    _STORE_PATH.write_text(json.dumps(_sources, indent=2, sort_keys=True))


def _reload_sources() -> None:
    _sources.clear()
    _sources.update(_load_sources_from_disk())


_sources: dict[str, dict[str, Any]] = _load_sources_from_disk()


def create_source_record(
    *,
    kind: str,
    filename: str,
    label: str,
    preview_text: str,
    summary: str,
    metadata: dict[str, Any] | None = None,
    content_text: str = "",
) -> dict[str, Any]:
    source_id = f"src_{uuid.uuid4().hex[:12]}"
    record = {
        "id": source_id,
        "kind": kind,
        "filename": filename,
        "label": label,
        "status": "ready",
        "preview_text": preview_text,
        "summary": summary,
        "metadata": metadata or {},
        "content_text": content_text,
    }
    _sources[source_id] = record
    _persist_sources()
    return record


def get_source(source_id: str) -> dict[str, Any] | None:
    record = _sources.get(source_id)
    if record is not None:
        return record

    _reload_sources()
    return _sources.get(source_id)


def get_sources(source_ids: list[str]) -> list[dict[str, Any]]:
    return [src for source_id in source_ids if (src := get_source(source_id)) is not None]


def clear_sources() -> None:
    _sources.clear()
    _persist_sources()
