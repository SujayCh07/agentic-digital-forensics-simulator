from __future__ import annotations

import pytest
from pydantic import ValidationError

from models.schemas import MIN_NOTES_CHARS_FOR_TEXT_ONLY, PolicyInput
from routers import extract as extract_router
from routers import simulate as simulate_router
from services import context_store
from services.context_store import clear_sources, create_source_record


async def _fake_extract_pdf(_: bytes) -> str:
    return "Federal industrial policy with tariff relief and tax credits for domestic production."


class DummyUploadFile:
    def __init__(self, filename: str, data: bytes) -> None:
        self.filename = filename
        self._data = data

    async def read(self) -> bytes:
        return self._data


class TestSourceIngestion:
    def setup_method(self) -> None:
        clear_sources()
        simulate_router.reset_simulations()

    @pytest.mark.asyncio
    async def test_uploads_primary_pdf_source(self, monkeypatch) -> None:
        monkeypatch.setattr(extract_router, "_extract_pdf", _fake_extract_pdf)

        source = await extract_router.upload_context_source(
            file=DummyUploadFile("policy.pdf", b"%PDF-1.4 fake"),  # type: ignore[arg-type]
            label="Primary Policy PDF",
        )

        assert source.kind == "pdf"
        assert source.filename == "policy.pdf"
        assert source.label == "Primary Policy PDF"
        assert source.id.startswith("src_")
        assert "Federal industrial policy" in source.summary

    @pytest.mark.asyncio
    async def test_start_simulation_accepts_pdf_source(self, monkeypatch) -> None:
        monkeypatch.setattr(extract_router, "_extract_pdf", _fake_extract_pdf)

        pdf_source = await extract_router.upload_context_source(
            file=DummyUploadFile("policy.pdf", b"%PDF-1.4 fake"),  # type: ignore[arg-type]
            label="Primary Policy PDF",
        )

        response = await simulate_router.start_simulation(
            PolicyInput(
                primary_policy_source_id=pdf_source.id,
                notes_text="Focus on inflation and wages.",
                num_rounds=10,
                num_npcs=20,
                objective="Measure pressure on consumer prices.",
                map_id="ccity",
            )
        )

        assert response["simulation_id"]

    @pytest.mark.asyncio
    async def test_rejects_non_pdf_upload(self) -> None:
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            await extract_router.upload_context_source(
                file=DummyUploadFile("memo.md", b"# Tariffs\nSome policy text."),  # type: ignore[arg-type]
                label="Policy memo",
            )

        assert exc_info.value.status_code == 415

    @pytest.mark.asyncio
    async def test_accepts_notes_only_simulation_when_long_enough(self) -> None:
        response = await simulate_router.start_simulation(
            PolicyInput(
                primary_policy_source_id=None,
                policy_source_ids=[],
                notes_text="A" * MIN_NOTES_CHARS_FOR_TEXT_ONLY,
                num_rounds=3,
                num_npcs=5,
            )
        )

        assert response["simulation_id"]

    def test_rejects_simulation_without_pdf_source_or_enough_notes(self) -> None:
        with pytest.raises(ValidationError, match="characters of notes"):
            PolicyInput(
                primary_policy_source_id=None,
                policy_source_ids=[],
                notes_text="too short",
                num_rounds=3,
                num_npcs=5,
            )

    def test_source_record_restores_after_memory_reset(self) -> None:
        source = create_source_record(
            kind="pdf",
            filename="policy.pdf",
            label="Policy",
            preview_text="preview",
            summary="summary",
            metadata={},
            content_text="policy body",
        )

        context_store._sources.clear()
        restored = context_store.get_source(source["id"])

        assert restored is not None
        assert restored["content_text"] == "policy body"

    @pytest.mark.asyncio
    async def test_simulation_record_restores_after_memory_reset(self) -> None:
        response = await simulate_router.start_simulation(
            PolicyInput(
                primary_policy_source_id=None,
                policy_source_ids=[],
                notes_text="A" * MIN_NOTES_CHARS_FOR_TEXT_ONLY,
                num_rounds=3,
                num_npcs=5,
            )
        )

        simulation_id = response["simulation_id"]
        simulate_router.simulations.clear()
        restored = simulate_router._get_simulation_record(simulation_id)

        assert restored is not None
        assert restored.policy.notes_text == "A" * MIN_NOTES_CHARS_FOR_TEXT_ONLY
