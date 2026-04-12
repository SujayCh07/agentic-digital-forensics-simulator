# Agent Instructions

## Package Managers
- **Frontend**: Bun — `bun install`, `bun dev`, `bun build`
- **Backend**: uv — `uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000`

## File-Scoped Commands
| Task | Command |
|------|---------|
| Lint | `cd frontend && bun lint` |
| Format | `cd frontend && bun format` |
| Backend tests | `cd backend && uv run pytest` |
| NIPS tests only | `cd backend && uv run pytest tests/test_nips_*.py -v` |

## Key Conventions
- **Phaser client-only**: wrap in `next/dynamic` with `ssr: false`; page must be `"use client"`
- **Linting**: Biome 2.2.0 — not ESLint. Rules live in `frontend/biome.json`
- **EventBridge**: singleton in `src/game/bridge/` bridges React ↔ Phaser via `sim:*` events
- **LLM model (policy sim)**: set via `MODEL_NAME` in backend `.env` (`gemini-2.5-flash` default)
- **LLM model (NIPS agents)**: set via `NIPS_MODEL_NAME` in backend `.env` (uses `google-genai` SDK directly)
- **Next.js 16**: has breaking changes — read `node_modules/next/dist/docs/` before using unfamiliar APIs

## Environment Variables
```
GEMINI_API_KEY=...          # Required for both policy sim and NIPS agent chat
MODEL_NAME=gemini-2.5-flash # Policy sim LLM (via OpenAI-compat endpoint)
NIPS_MODEL_NAME=gemini-2.5-flash # NIPS agent chat (via native google-genai SDK)
XAI_API_KEY=xai-...         # Optional: for Grok models
K2_API_KEY=...               # Optional: for K2 models
```

## Project Layout
```
frontend/src/
  components/    # UI: AgentCommandModal, AgentMarketplace, AgentDirectory,
                 #     AgentStatusBar, Dashboard, EventFeed, GameCanvas, etc.
  game/          # Phaser: scenes/, systems/, effects/, entities/, bridge/, map/
  hooks/         # useSimulation (WebSocket), useInvestigation (NIPS game state)
  lib/           # investigationAgentClient (NIPS Socket.IO), intentResolver, etc.
  services/      # wsClient (policy sim Socket.IO)
  types/         # index.ts, backend.ts, investigation.ts (NIPS types + NipsAgentInstance)
backend/
  graph/nodes/   # parse_policy, npc_orchestrator, run_round (policy sim)
  routers/       # simulate.py (policy sim), nips_router.py (NIPS Socket.IO events)
  nips/          # NIPS agent system:
                 #   models.py      — Pydantic models (AgentInstance, NipsSession, etc.)
                 #   archetypes.py  — LOGIS/NEXUS/FILER/CHRONO definitions
                 #   agent_generator.py — Unique agent instance generation
                 #   tools.py       — Investigation tool declarations + executors
                 #   scoring.py     — Trait-based performance scoring
                 #   prompts.py     — Dynamic system prompt builder
                 #   chat.py        — Gemini streaming chat orchestration
                 #   session.py     — In-memory session manager
```

## NIPS Agent System

### Architecture
- Backend owns agent instances, marketplace, chat orchestration, and tool execution
- Uses `google-genai` SDK for native Gemini thinking + tool-calling + streaming
- Socket.IO events prefixed with `nips_` (separate from policy sim `start_sim`/`chat_with_npc`)
- Agent uniqueness: each instance gets generated name, traits, experience, pricing
- Scope enforcement: system prompt + limited tool access (no hardcoded prompt detection)
- Thought streaming: ephemeral, shown in UI, never persisted to chat history

### Socket.IO Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `nips_init_session` | Client→Server | Initialize NIPS session with case |
| `nips_session_ready` | Server→Client | Session data: agents, marketplace, funds |
| `nips_chat` | Client→Server | Send message to agent |
| `nips_thought_chunk` | Server→Client | Ephemeral thinking text |
| `nips_tool_activity` | Server→Client | Tool call started/completed |
| `nips_assistant_chunk` | Server→Client | Streaming answer text |
| `nips_evidence_update` | Server→Client | New evidence from tool execution |
| `nips_chat_done` | Server→Client | Chat turn complete |
| `nips_buy_agent` | Client→Server | Purchase marketplace offer |
| `nips_agent_purchased` | Server→Client | Purchase confirmed |
| `nips_refresh_marketplace` | Client→Server | Force marketplace refresh |
| `nips_marketplace_refreshed` | Server→Client | New offers |
| `nips_list_agents` | Client→Server | List deployed agents |
| `nips_agents_list` | Server→Client | Deployed agent list |

### What is persisted vs not
- **Persisted (in-memory per session)**: chat messages (user + assistant), deployed agents, evidence, funds
- **Not persisted**: thought traces (ephemeral, cleared on modal close), tool intermediate states
