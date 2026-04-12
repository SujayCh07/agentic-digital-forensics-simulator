# EchoLocate Backend

The backend serves the active EchoLocate investigation experience and keeps a legacy replay pipeline for older simulations.

## Active Backend Path

The active product path is the investigator session stack:
- `routers/nips_router.py` — Socket.IO interface used by the current frontend
- `nips/session.py` — session state, recruiting, funds, owned agents
- `nips/chat.py` — streamed investigator chat orchestration
- `nips/tools.py` — investigation tools and evidence generation

The `nips/` package name and `nips_*` event prefixes are retained internally for
compatibility with the current frontend/backend transport layer. They are not
part of the product branding.

## Run

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

- `OPENAI_API_KEY`
- `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- `NIPS_MODEL_NAME` — active investigator model selection (legacy env var name)
- `MODEL_NAME` — legacy replay / simulation model selection if needed
- `DEEPGRAM_API_KEY`
- `ELEVENLABS_API_KEY`

## Legacy Note

`routers/simulate.py` and the `graph/` policy-simulation pipeline are retained for archived replay compatibility and experiments. They are not the primary EchoLocate gameplay path.
