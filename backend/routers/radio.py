"""REST endpoints for walkie-talkie voice: ElevenLabs STT, Deepgram Aura TTS.

API keys stay server-side. STT uses ElevenLabs Scribe; TTS uses Deepgram
``/v1/speak`` (Aura models).
"""

from __future__ import annotations

import logging

import aiohttp
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response

from config import DEEPGRAM_API_KEY, ELEVENLABS_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/radio", tags=["radio"])

ELEVENLABS_BASE = "https://api.elevenlabs.io/v1"
DEEPGRAM_SPEAK = "https://api.deepgram.com/v1/speak"

# Deepgram Aura-2 voice models per archetype (English)
# https://developers.deepgram.com/docs/text-to-speech
DEEPGRAM_TTS_MODELS: dict[str, str] = {
    "LOGIS": "aura-2-athena-en",   # clear, professional
    "NEXUS": "aura-2-apollo-en",   # confident US male
    "FILER": "aura-2-cora-en",     # measured
    "CHRONO": "aura-2-selene-en",  # precise
}
DEFAULT_DEEPGRAM_MODEL = "aura-2-asteria-en"

# Aura REST max input length
DEEPGRAM_TTS_MAX_CHARS = 2000


@router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """Transcribe uploaded audio via ElevenLabs Scribe.

    ElevenLabs expects multipart field name ``file`` (not ``audio``).
    See: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
    """
    if not ELEVENLABS_API_KEY:
        return {"error": "ELEVENLABS_API_KEY not set", "transcript": ""}

    audio_bytes = await audio.read()
    if len(audio_bytes) < 100:
        return {"error": "Recording too short (min ~100ms)", "transcript": ""}

    form = aiohttp.FormData()
    # API contract: binary field must be named "file"
    form.add_field(
        "file",
        audio_bytes,
        filename=audio.filename or "recording.webm",
        content_type=audio.content_type or "audio/webm",
    )
    form.add_field("model_id", "scribe_v2")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{ELEVENLABS_BASE}/speech-to-text",
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            data=form,
        ) as resp:
            if resp.status != 200:
                body = await resp.text()
                logger.error("ElevenLabs STT %d: %s", resp.status, body[:500])
                detail = body[:200] if body else ""
                return {
                    "error": f"STT failed ({resp.status}){': ' + detail if detail else ''}",
                    "transcript": "",
                }
            result = await resp.json()
            return {"transcript": result.get("text", "")}


def _clamp_speed(raw: float) -> float:
    """Deepgram Aura-2 speed: 0.7–1.5 (see TTS voice controls docs)."""
    return max(0.7, min(1.5, raw))


@router.post("/tts")
async def text_to_speech(
    text: str = Form(...),
    archetype: str = Form("LOGIS"),
    confidence: float = Form(0.7),
    speed: float = Form(1.0),
):
    """Synthesize speech via Deepgram Aura TTS. Returns audio/mpeg bytes."""
    _ = confidence  # kept for API compatibility; urgency is passed as ``speed``
    spd = _clamp_speed(speed)

    if not DEEPGRAM_API_KEY:
        return JSONResponse(
            status_code=500,
            content={
                "error": "DEEPGRAM_API_KEY not set — add it to backend/.env for TTS.",
            },
        )

    model = DEEPGRAM_TTS_MODELS.get(archetype.upper(), DEFAULT_DEEPGRAM_MODEL)
    trimmed = text.strip()
    if len(trimmed) > DEEPGRAM_TTS_MAX_CHARS:
        trimmed = trimmed[: DEEPGRAM_TTS_MAX_CHARS - 1] + "…"

    async with aiohttp.ClientSession() as session:
        async with session.post(
            DEEPGRAM_SPEAK,
            params={"model": model, "encoding": "mp3", "speed": str(spd)},
            headers={
                "Authorization": f"Token {DEEPGRAM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"text": trimmed},
        ) as resp:
            if resp.status != 200:
                body = await resp.text()
                logger.error("Deepgram TTS %d: %s", resp.status, body[:500])
                if resp.status in (402, 403):
                    msg = (
                        "Deepgram TTS refused (payment/access) — check credits and "
                        "TTS access at https://console.deepgram.com"
                    )
                else:
                    msg = f"Deepgram TTS error ({resp.status}): {body[:280]}"
                return JSONResponse(
                    status_code=resp.status,
                    content={"error": msg},
                )
            audio_bytes = await resp.read()
            return Response(content=audio_bytes, media_type="audio/mpeg")
