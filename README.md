# ECHO

ECHO is a noir digital-forensics city simulator. Buildings are machines, roads are traffic, citizens are processes, and specialist agents reconstruct the incident in real time.

## What changed

This repository started as a policy simulation. It now carries an ECHO foundation while preserving the legacy simulation architecture so the city and investigator UI can coexist during the transition.

## Quick start

### Backend

Create `backend/.env` with at least:

```bash
FEATHERLESS_API_KEY=...
MODEL_NAME=...
LLM_MAX_CONCURRENCY=3
```

If `uv` is installed:

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

If `uv` is not installed but `backend/.venv` exists:

```bash
cd backend
./.venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

With `bun`:

```bash
cd frontend
bun install
bun dev
```

With `npm`:

```bash
cd frontend
npm install
npm run dev
```

Open:
- Frontend: http://localhost:3000
- ECHO scenario API: http://localhost:8000/echo/scenario

## Routes

- `/` — ECHO landing page
- `/echo` — scenario overview panel
- `/simulate` — interactive simulation view

## Testing

### Frontend

```bash
cd frontend
bun run vitest
```

### Backend

```bash
cd backend
uv run pytest
```

## Notes

- The existing Simulacra systems remain in place.
- The new ECHO layer adds scenario data and a cleaner noir interface.
- Start here, then continue moving gameplay from legacy policy-sim copy into forensic investigation flows.
