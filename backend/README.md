# ECHO Backend

FastAPI backend for the ECHO digital-forensics city simulator.

## Start

Create `backend/.env` with at least:

```bash
FEATHERLESS_API_KEY=...
MODEL_NAME=...
LLM_MAX_CONCURRENCY=3
```

`OPENAI_API_KEY` is also supported as a fallback, but the current local setup prefers Featherless.
If your model provider has strict parallel-request caps, keep `LLM_MAX_CONCURRENCY` at `3` or lower.

If you have `uv` installed:

```bash
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

If you do not have `uv` installed but this repo already includes `backend/.venv`, you can run:

```bash
./.venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API

- `GET /echo/scenario` — returns the current ECHO scenario payload
- Legacy simulation routes remain available for the existing app flow

## Tests

With `uv`:

```bash
uv run pytest
```

Without `uv`:

```bash
./.venv/bin/pytest
```

## Notes

The backend is intentionally small for the ECHO milestone. It exposes a structured scenario payload that the frontend can render immediately while the rest of the gameplay loop is expanded.
