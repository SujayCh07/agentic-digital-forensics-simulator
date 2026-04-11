# ECHO Frontend

Next.js 16 frontend for the ECHO digital-forensics city simulator.

## Start

```bash
bun install
bun dev
```

Then open http://localhost:3000

## Important routes

- `/` — cinematic ECHO landing page
- `/echo` — scenario overview panel backed by the backend API
- `/simulate` — existing simulation canvas, visually rethemed for ECHO

## API dependency

The scenario panel expects the backend on port 8000.

```bash
cd ../backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Tests

```bash
bun run vitest
```

## UI notes

- The old presentation was preserved in spirit: title card, dramatic load, and dashboard-driven interaction.
- The new style pushes the same silhouette into a darker forensic palette.
