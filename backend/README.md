# ECHO Backend

FastAPI backend for the ECHO digital-forensics city simulator.

## Start

```bash
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API

- `GET /echo/scenario` — returns the current ECHO scenario payload
- Legacy simulation routes remain available for the existing app flow

## Tests

```bash
uv run pytest
```

## Notes

The backend is intentionally small for the ECHO milestone. It exposes a structured scenario payload that the frontend can render immediately while the rest of the gameplay loop is expanded.
